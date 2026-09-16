import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { generateId } from '../utils/helpers.js';
import { supabase } from './supabase.js';
import {
  uploadFile,
  downloadFile,
  deleteFile,
  SYNC_STATUS,
} from './cloudStorage.js';
import { VAULT_DIRS, ensureVaultDirectories } from './fileSystem.js';
import { evaluateAccess, fetchSubscription } from './subscriptionService.js';

// ====================================================================
// CONSTANTS & TYPES
// ====================================================================

export const SYNC_ENTITY_TYPES = {
  NOTE: 'NOTE',
  PASSWORD: 'PASSWORD',
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  VOICE: 'VOICE',
};

export const SYNC_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

export const QUEUE_STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
};

export const STORAGE_KEYS = {
  queuePrefix: 'hidder.sync-queue.',
  lastSyncTime: 'hidder.last-sync-time',
  publicNotes: 'hidder.public-notes',
  privateNotes: 'hidder.private-notes',
  decoyNotes: 'hidder.decoy-notes',
  photoItems: 'hidder.photo-items',
  videoItems: 'hidder.video-items',
  documentItems: 'hidder.document-items',
  passwordItems: 'hidder.password-items',
  voiceItems: 'hidder.voice-items',
};

const MAX_RETRIES = 3;

// In-memory listeners for reactive UI updates
const syncListeners = new Set();

export const subscribeToSyncChanges = (listener) => {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
};

const notifySyncListeners = (data) => {
  for (const listener of syncListeners) {
    try {
      listener(data);
    } catch (err) {
      console.warn('Sync listener error:', err.message);
    }
  }
};

// ====================================================================
// STORAGE HELPERS (Local-First Persistence)
// ====================================================================

const getQueueKey = (userId) => `${STORAGE_KEYS.queuePrefix}${userId || 'anonymous'}`;

const readJson = async (key, fallback = []) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    console.error(`Lỗi đọc storage ${key}:`, error);
    return fallback;
  }
};

const writeJson = async (key, value) => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Lỗi ghi storage ${key}:`, error);
  }
};

// ====================================================================
// CONFLICT RESOLUTION (Last-Write-Wins)
// ====================================================================

/**
 * Resolves conflict between local and remote records based on timestamps.
 * Remote wins if remote timestamp is strictly newer than local.
 */
export const resolveConflict = (localItem, remoteItem) => {
  if (!localItem) return { winner: 'remote', item: remoteItem };
  if (!remoteItem) return { winner: 'local', item: localItem };

  const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();

  if (remoteTime > localTime) {
    return { winner: 'remote', item: remoteItem };
  }
  return { winner: 'local', item: localItem };
};

// ====================================================================
// QUEUE MANAGEMENT (Offline-First Queue)
// ====================================================================

/**
 * Get all queued sync tasks for a user
 */
export const getSyncQueue = async (userId) => {
  if (!userId) return [];
  return readJson(getQueueKey(userId), []);
};

/**
 * Persist sync queue for a user
 */
export const saveSyncQueue = async (userId, queue) => {
  if (!userId) return;
  await writeJson(getQueueKey(userId), queue);
  notifySyncListeners({ type: 'queue-updated', userId, count: queue.length });
};

/**
 * Get count of pending/retriable tasks in the queue
 */
export const getPendingQueueCount = async (userId) => {
  if (!userId) return 0;
  const queue = await getSyncQueue(userId);
  return queue.filter(
    (item) => item.status === QUEUE_STATUS.PENDING || (item.status === QUEUE_STATUS.FAILED && item.retryCount < item.maxRetries)
  ).length;
};

/**
 * Add or coalesce an item into the offline sync queue
 */
export const addToSyncQueue = async ({ userId, entityType, entityId, action, payload = {} }) => {
  if (!userId || !entityType || !entityId) {
    console.warn('addToSyncQueue: Missing required arguments (userId, entityType, entityId)');
    return null;
  }

  const queue = await getSyncQueue(userId);

  // Check for existing pending task for this entity
  const existingIndex = queue.findIndex(
    (item) =>
      item.entityType === entityType &&
      item.entityId === entityId &&
      (item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.FAILED)
  );

  let queueItem;

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];

    // If deleting an item that was only created offline and never synced, cancel creation
    if (action === SYNC_ACTIONS.DELETE && existing.action === SYNC_ACTIONS.CREATE) {
      queue.splice(existingIndex, 1);
      await saveSyncQueue(userId, queue);
      return null;
    }

    // Coalesce / update existing task
    queueItem = {
      ...existing,
      action: action === SYNC_ACTIONS.DELETE ? SYNC_ACTIONS.DELETE : existing.action,
      payload: { ...existing.payload, ...payload },
      status: QUEUE_STATUS.PENDING,
      retryCount: 0,
      lastError: null,
      updatedAt: new Date().toISOString(),
    };
    queue[existingIndex] = queueItem;
  } else {
    // Create new queue task
    queueItem = {
      queueId: generateId(),
      userId,
      entityType,
      entityId,
      action,
      payload,
      status: QUEUE_STATUS.PENDING,
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      lastError: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    queue.push(queueItem);
  }

  await saveSyncQueue(userId, queue);
  return queueItem;
};

/**
 * Clear synced items from queue
 */
export const clearCompletedFromQueue = async (userId) => {
  if (!userId) return;
  const queue = await getSyncQueue(userId);
  const filtered = queue.filter((item) => item.status !== QUEUE_STATUS.SYNCED);
  await saveSyncQueue(userId, filtered);
};

// ====================================================================
// CONVENIENCE ENQUEUE HELPERS (called from local CRUD)
// ====================================================================

export const enqueueNote = async (note, type = 'public', action = SYNC_ACTIONS.CREATE, userId = null) => {
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data?.user?.id;
  }
  if (!uid) return null;

  return addToSyncQueue({
    userId: uid,
    entityType: SYNC_ENTITY_TYPES.NOTE,
    entityId: note.id,
    action,
    payload: {
      title: note.title || '',
      content: note.content || '',
      type,
      updatedAt: note.updatedAt || new Date().toISOString(),
    },
  });
};

export const enqueuePassword = async (item, action = SYNC_ACTIONS.CREATE, userId = null) => {
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data?.user?.id;
  }
  if (!uid) return null;

  return addToSyncQueue({
    userId: uid,
    entityType: SYNC_ENTITY_TYPES.PASSWORD,
    entityId: item.id,
    action,
    payload: {
      title: item.title || '',
      username: item.username || '',
      password: item.password || '',
      url: item.url || '',
      notes: item.notes || '',
      category: item.category || 'general',
      updatedAt: item.updatedAt || new Date().toISOString(),
    },
  });
};

export const enqueueFile = async (item, category, action = SYNC_ACTIONS.CREATE, userId = null) => {
  let uid = userId;
  if (!uid) {
    const { data } = await supabase.auth.getUser();
    uid = data?.user?.id;
  }
  if (!uid) return null;

  const entityType = String(category).toUpperCase();

  return addToSyncQueue({
    userId: uid,
    entityType,
    entityId: item.id,
    action,
    payload: {
      id: item.id,
      uri: item.uri,
      name: item.name || item.fileName || item.id,
      mimeType: item.mimeType || 'application/octet-stream',
      size: item.size || 0,
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      fileId: item.cloudFileId || item.id,
    },
  });
};

// ====================================================================
// QUEUE EXECUTION
// ====================================================================

/**
 * Process pending queue tasks with retry and backoff.
 * If user subscription is expired, private vault synchronization will be safely paused.
 */
export const processSyncQueue = async (userId, options = {}) => {
  if (!userId) return { processed: 0, failed: 0, paused: 0 };

  const queue = await getSyncQueue(userId);
  if (!queue.length) return { processed: 0, failed: 0, paused: 0 };

  // Subscription verification check
  let subscriptionValid = true;
  try {
    const subRecord = await fetchSubscription(userId);
    if (subRecord) {
      const access = evaluateAccess(subRecord);
      subscriptionValid = access.valid;
    }
  } catch (subErr) {
    console.warn('SyncManager: Không thể kiểm tra subscription trước khi xử lý queue:', subErr.message);
  }

  let processed = 0;
  let failed = 0;
  let paused = 0;

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    // Only process PENDING or FAILED with retries remaining
    if (item.status !== QUEUE_STATUS.PENDING && (item.status !== QUEUE_STATUS.FAILED || item.retryCount >= item.maxRetries)) {
      continue;
    }

    // Subscription gate: Real Vault items require valid subscription/trial
    const isRealVaultItem =
      (item.entityType === SYNC_ENTITY_TYPES.NOTE && item.payload?.type === 'private') ||
      item.entityType === SYNC_ENTITY_TYPES.PASSWORD ||
      [SYNC_ENTITY_TYPES.PHOTO, SYNC_ENTITY_TYPES.VIDEO, SYNC_ENTITY_TYPES.DOCUMENT, SYNC_ENTITY_TYPES.VOICE].includes(item.entityType);

    if (isRealVaultItem && !subscriptionValid) {
      item.status = QUEUE_STATUS.FAILED;
      item.lastError = 'Subscription expired: Gia hạn để tiếp tục đồng bộ dữ liệu Real Vault.';
      paused++;
      continue;
    }

    item.status = QUEUE_STATUS.SYNCING;
    item.updatedAt = new Date().toISOString();

    try {
      if (item.entityType === SYNC_ENTITY_TYPES.NOTE) {
        if (item.action === SYNC_ACTIONS.DELETE) {
          const { error } = await supabase
            .from('notes')
            .upsert({ id: item.entityId, user_id: userId, is_deleted: true, updated_at: new Date().toISOString() });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('notes').upsert({
            id: item.entityId,
            user_id: userId,
            title: item.payload.title || '',
            content: item.payload.content || '',
            type: item.payload.type || 'public',
            is_deleted: false,
            updated_at: item.payload.updatedAt || new Date().toISOString(),
          });
          if (error) throw error;
        }
      } else if (item.entityType === SYNC_ENTITY_TYPES.PASSWORD) {
        if (item.action === SYNC_ACTIONS.DELETE) {
          const { error } = await supabase
            .from('passwords')
            .upsert({ id: item.entityId, user_id: userId, is_deleted: true, updated_at: new Date().toISOString() });
          if (error) throw error;
        } else {
          const { error } = await supabase.from('passwords').upsert({
            id: item.entityId,
            user_id: userId,
            title: item.payload.title || '',
            username: item.payload.username || '',
            password: item.payload.password || '',
            url: item.payload.url || '',
            notes: item.payload.notes || '',
            category: item.payload.category || 'general',
            is_deleted: false,
            updated_at: item.payload.updatedAt || new Date().toISOString(),
          });
          if (error) throw error;
        }
      } else if (
        [SYNC_ENTITY_TYPES.PHOTO, SYNC_ENTITY_TYPES.VIDEO, SYNC_ENTITY_TYPES.DOCUMENT, SYNC_ENTITY_TYPES.VOICE].includes(
          item.entityType
        )
      ) {
        if (item.action === SYNC_ACTIONS.DELETE) {
          const fileId = item.payload.fileId || item.entityId;
          const delRes = await deleteFile(fileId);
          if (!delRes.success && !delRes.error?.includes('Không tìm thấy')) {
            throw new Error(delRes.error || 'Lỗi xóa file trên cloud');
          }
        } else {
          // Upload with client-side AES-256-GCM encryption
          const uploadRes = await uploadFile({
            localUri: item.payload.uri,
            category: item.entityType,
            fileName: item.payload.name,
            mimeType: item.payload.mimeType,
          });

          if (!uploadRes.success) {
            throw new Error(uploadRes.error || 'Lỗi upload file mã hóa lên cloud');
          }

          // Record cloud file details in payload
          item.payload.cloudFileId = uploadRes.fileId;
          item.payload.storagePath = uploadRes.storagePath;
          item.payload.encryptionVersion = uploadRes.encryptionVersion;
        }
      }

      // Success
      item.status = QUEUE_STATUS.SYNCED;
      item.lastError = null;
      item.updatedAt = new Date().toISOString();
      processed++;
    } catch (taskErr) {
      item.retryCount = (item.retryCount || 0) + 1;
      item.lastError = taskErr.message || 'Lỗi đồng bộ không xác định';
      item.status = item.retryCount >= item.maxRetries ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING;
      item.updatedAt = new Date().toISOString();
      failed++;
    }
  }

  // Prune synced items and save
  const remaining = queue.filter((item) => item.status !== QUEUE_STATUS.SYNCED);
  await saveSyncQueue(userId, remaining);

  return { processed, failed, paused, remaining: remaining.length };
};

// ====================================================================
// TWO-WAY CLOUD PULL & CONFLICT RESOLUTION
// ====================================================================

/**
 * Pull updates from Supabase and Google Cloud Storage down to local storage.
 * Resolves conflicts with Last-Write-Wins and restores encrypted files on new devices.
 */
export const pullCloudChanges = async (userId, options = {}) => {
  if (!userId) return { notesPulled: 0, passwordsPulled: 0, filesPulled: 0 };

  let notesPulled = 0;
  let passwordsPulled = 0;
  let filesPulled = 0;

  // ----------------------------------------------------
  // 1. Pull Notes (Public, Private, Decoy)
  // ----------------------------------------------------
  try {
    const { data: remoteNotes, error: notesErr } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', userId);

    if (!notesErr && remoteNotes) {
      const [publicLocal, privateLocal, decoyLocal] = await Promise.all([
        readJson(STORAGE_KEYS.publicNotes, []),
        readJson(STORAGE_KEYS.privateNotes, []),
        readJson(STORAGE_KEYS.decoyNotes, []),
      ]);

      const mergeNotesByType = (localList, noteType) => {
        const matching = remoteNotes.filter((n) => n.type === noteType);
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));

        matching.forEach((remote) => {
          const localItem = map.get(remote.id);

          if (remote.is_deleted) {
            map.delete(remote.id);
            notesPulled++;
            return;
          }

          const conflict = resolveConflict(localItem, remote);
          if (conflict.winner === 'remote') {
            map.set(remote.id, {
              id: remote.id,
              title: remote.title || '',
              content: remote.content || '',
              updatedAt: remote.updated_at || remote.created_at || new Date().toISOString(),
            });
            notesPulled++;
          }
        });

        return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      };

      const updatedPublic = mergeNotesByType(publicLocal, 'public');
      const updatedPrivate = mergeNotesByType(privateLocal, 'private');
      const updatedDecoy = mergeNotesByType(decoyLocal, 'decoy');

      await Promise.all([
        writeJson(STORAGE_KEYS.publicNotes, updatedPublic),
        writeJson(STORAGE_KEYS.privateNotes, updatedPrivate),
        writeJson(STORAGE_KEYS.decoyNotes, updatedDecoy),
      ]);
    }
  } catch (err) {
    console.warn('Lỗi pull notes từ Supabase:', err.message);
  }

  // ----------------------------------------------------
  // 2. Pull Passwords
  // ----------------------------------------------------
  try {
    const { data: remotePasswords, error: pwErr } = await supabase
      .from('passwords')
      .select('*')
      .eq('user_id', userId);

    if (!pwErr && remotePasswords) {
      const localPasswords = await readJson(STORAGE_KEYS.passwordItems, []);
      const map = new Map();
      localPasswords.forEach((item) => map.set(item.id, item));

      remotePasswords.forEach((remote) => {
        const localItem = map.get(remote.id);

        if (remote.is_deleted) {
          map.delete(remote.id);
          passwordsPulled++;
          return;
        }

        const conflict = resolveConflict(localItem, remote);
        if (conflict.winner === 'remote') {
          map.set(remote.id, {
            id: remote.id,
            title: remote.title || '',
            username: remote.username || '',
            password: remote.password || '',
            url: remote.url || '',
            notes: remote.notes || '',
            category: remote.category || 'general',
            updatedAt: remote.updated_at || remote.created_at || new Date().toISOString(),
          });
          passwordsPulled++;
        }
      });

      const updatedPasswords = Array.from(map.values()).sort(
        (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
      );
      await writeJson(STORAGE_KEYS.passwordItems, updatedPasswords);
    }
  } catch (err) {
    console.warn('Lỗi pull passwords từ Supabase:', err.message);
  }

  // ----------------------------------------------------
  // 3. Pull Files & Restore Encrypted Media
  // ----------------------------------------------------
  try {
    const { data: remoteFiles, error: filesErr } = await supabase
      .from('files')
      .select('*')
      .eq('user_id', userId)
      .neq('sync_status', SYNC_STATUS.DELETED);

    if (!filesErr && remoteFiles && remoteFiles.length > 0) {
      if (ensureVaultDirectories) {
        await ensureVaultDirectories().catch(() => {});
      }

      const [localPhotos, localVideos, localDocs, localVoices] = await Promise.all([
        readJson(STORAGE_KEYS.photoItems, []),
        readJson(STORAGE_KEYS.videoItems, []),
        readJson(STORAGE_KEYS.documentItems, []),
        readJson(STORAGE_KEYS.voiceItems, []),
      ]);

      const localMapByCategory = {
        PHOTO: { list: [...localPhotos], key: STORAGE_KEYS.photoItems, dir: VAULT_DIRS.photos },
        VIDEO: { list: [...localVideos], key: STORAGE_KEYS.videoItems, dir: VAULT_DIRS.videos },
        DOCUMENT: { list: [...localDocs], key: STORAGE_KEYS.documentItems, dir: VAULT_DIRS.documents },
        VOICE: { list: [...localVoices], key: STORAGE_KEYS.voiceItems, dir: VAULT_DIRS.audios },
      };

      for (const remoteFile of remoteFiles) {
        const category = remoteFile.category ? remoteFile.category.toUpperCase() : 'PHOTO';
        const categoryConfig = localMapByCategory[category];
        if (!categoryConfig) continue;

        // Check if file is deleted remotely
        if (remoteFile.is_deleted || remoteFile.sync_status === SYNC_STATUS.DELETED) {
          const idx = categoryConfig.list.findIndex(
            (item) => item.id === remoteFile.id || item.cloudFileId === remoteFile.id
          );
          if (idx >= 0) {
            const removed = categoryConfig.list.splice(idx, 1)[0];
            if (removed.uri && FileSystem?.deleteAsync) {
              try {
                await FileSystem.deleteAsync(removed.uri, { idempotent: true });
              } catch (_) {}
            }
            filesPulled++;
          }
          continue;
        }

        // Check if file already exists locally
        const existingLocal = categoryConfig.list.find(
          (item) => item.id === remoteFile.id || item.cloudFileId === remoteFile.id
        );

        if (!existingLocal && remoteFile.sync_status === SYNC_STATUS.CLOUD) {
          // File exists on Cloud but NOT on this device (e.g., new device login)
          const ext = remoteFile.original_name ? remoteFile.original_name.split('.').pop() : 'dat';
          const destinationUri = `${categoryConfig.dir}${remoteFile.id}.${ext}`;

          try {
            // Download and decrypt with user's Master Key
            const downloadRes = await downloadFile({
              fileId: remoteFile.id,
              storagePath: remoteFile.storage_path,
              destinationUri,
            });

            if (downloadRes.success) {
              categoryConfig.list.unshift({
                id: remoteFile.id,
                cloudFileId: remoteFile.id,
                name: remoteFile.original_name,
                uri: downloadRes.uri,
                size: remoteFile.size_bytes || downloadRes.sizeBytes || 0,
                createdAt: remoteFile.created_at,
                updatedAt: remoteFile.updated_at,
              });
              filesPulled++;
            } else {
              console.warn(`Không thể khôi phục file ${remoteFile.id}:`, downloadRes.error);
            }
          } catch (dlErr) {
            console.warn(`Lỗi khôi phục media ${remoteFile.id}:`, dlErr.message);
          }
        }
      }

      // Save updated lists
      await Promise.all([
        writeJson(STORAGE_KEYS.photoItems, localMapByCategory.PHOTO.list),
        writeJson(STORAGE_KEYS.videoItems, localMapByCategory.VIDEO.list),
        writeJson(STORAGE_KEYS.documentItems, localMapByCategory.DOCUMENT.list),
        writeJson(STORAGE_KEYS.voiceItems, localMapByCategory.VOICE.list),
      ]);
    }
  } catch (err) {
    console.warn('Lỗi pull files từ Supabase/GCS:', err.message);
  }

  return { notesPulled, passwordsPulled, filesPulled };
};

// ====================================================================
// MASTER SYNC COORDINATOR
// ====================================================================

/**
 * Perform complete two-way synchronization:
 * 1. Checks user authentication.
 * 2. Checks subscription access.
 * 3. Processes pending offline queue (upload/delete).
 * 4. Pulls latest cloud changes down to local storage.
 * 5. Updates last sync timestamp.
 */
export const syncAll = async (options = {}) => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return {
        success: false,
        error: 'Bạn chưa đăng nhập. Vui lòng vào mục "Tài khoản Cloud" để đăng nhập trước khi đồng bộ.',
      };
    }

    // Subscription evaluation
    try {
      const subRecord = await fetchSubscription(user.id);
      if (subRecord) {
        const access = evaluateAccess(subRecord);
        if (!access.valid) {
          return {
            success: false,
            expired: true,
            error: 'Gói dịch vụ đã hết hạn. Vui lòng gia hạn để tiếp tục đồng bộ.',
          };
        }
      }
    } catch (subErr) {
      console.warn('Lỗi kiểm tra subscription khi syncAll:', subErr.message);
    }

    // Step A: Process offline queue (Push)
    const queueResult = await processSyncQueue(user.id, options);

    // Step B: Pull cloud changes (Pull)
    const pullResult = await pullCloudChanges(user.id, options);

    // Step C: Update last sync timestamp
    const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    await AsyncStorage.setItem(STORAGE_KEYS.lastSyncTime, timestamp);

    const pendingCount = await getPendingQueueCount(user.id);

    return {
      success: true,
      timestamp,
      queueResult,
      pullResult,
      pendingCount,
    };
  } catch (error) {
    console.warn('Lỗi tổng thể syncAll:', error);
    return {
      success: false,
      error: error.message || 'Lỗi đồng bộ không xác định.',
    };
  }
};

export const getLastSyncTime = async () => {
  return AsyncStorage.getItem(STORAGE_KEYS.lastSyncTime);
};
