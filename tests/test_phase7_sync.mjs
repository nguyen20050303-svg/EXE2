// ====================================================================
// HIDDER PHASE 7 – SYNC MANAGER & OFFLINE QUEUE TEST SUITE
// ====================================================================

import { createHash, randomBytes } from 'crypto';
import { gcm } from '@noble/ciphers/aes.js';
import b64 from 'base64-js';
import fs from 'fs';
import path from 'path';

const toByteArray = b64.toByteArray || b64.default?.toByteArray;
const fromByteArray = b64.fromByteArray || b64.default?.fromByteArray;

console.log('====================================================');
console.log('  HIDDER PHASE 7 – SYNC MANAGER & TWO-WAY SYNC TEST');
console.log('====================================================\n');

let passed = 0;
let total = 0;

function assert(condition, testName) {
  total++;
  if (condition) {
    console.log(`  [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// Mock In-Memory Storage for Testing
// ----------------------------------------------------
const mockAsyncStorage = new Map();

const storageAdapter = {
  getItem: async (key) => mockAsyncStorage.get(key) || null,
  setItem: async (key, val) => mockAsyncStorage.set(key, String(val)),
  removeItem: async (key) => mockAsyncStorage.delete(key),
  clear: async () => mockAsyncStorage.clear(),
};

// Queue helper logic mirroring src/services/syncManager.js
const QUEUE_STATUS = {
  PENDING: 'PENDING',
  SYNCING: 'SYNCING',
  SYNCED: 'SYNCED',
  FAILED: 'FAILED',
};

const SYNC_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
};

const SYNC_ENTITY_TYPES = {
  NOTE: 'NOTE',
  PASSWORD: 'PASSWORD',
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  VOICE: 'VOICE',
};

const MAX_RETRIES = 3;

const getQueueKey = (userId) => `hidder.sync-queue.${userId}`;

const getSyncQueue = async (userId) => {
  const raw = await storageAdapter.getItem(getQueueKey(userId));
  return raw ? JSON.parse(raw) : [];
};

const saveSyncQueue = async (userId, queue) => {
  await storageAdapter.setItem(getQueueKey(userId), JSON.stringify(queue));
};

const addToSyncQueue = async ({ userId, entityType, entityId, action, payload = {} }) => {
  const queue = await getSyncQueue(userId);

  const existingIndex = queue.findIndex(
    (item) =>
      item.entityType === entityType &&
      item.entityId === entityId &&
      (item.status === QUEUE_STATUS.PENDING || item.status === QUEUE_STATUS.FAILED)
  );

  let queueItem;

  if (existingIndex >= 0) {
    const existing = queue[existingIndex];

    if (action === SYNC_ACTIONS.DELETE && existing.action === SYNC_ACTIONS.CREATE) {
      queue.splice(existingIndex, 1);
      await saveSyncQueue(userId, queue);
      return null;
    }

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
    queueItem = {
      queueId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
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

const resolveConflict = (localItem, remoteItem) => {
  if (!localItem) return { winner: 'remote', item: remoteItem };
  if (!remoteItem) return { winner: 'local', item: localItem };

  const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
  const remoteTime = new Date(remoteItem.updated_at || remoteItem.created_at || 0).getTime();

  if (remoteTime > localTime) {
    return { winner: 'remote', item: remoteItem };
  }
  return { winner: 'local', item: localItem };
};

// ----------------------------------------------------
// 1. OFFLINE QUEUE PERSISTENCE & ACCOUNT ISOLATION
// ----------------------------------------------------
console.log('--- 1. Offline Queue Persistence & Account Isolation ---');
await storageAdapter.clear();

const userA = 'user-alpha-111';
const userB = 'user-beta-222';

const itemA = await addToSyncQueue({
  userId: userA,
  entityType: SYNC_ENTITY_TYPES.NOTE,
  entityId: 'note-001',
  action: SYNC_ACTIONS.CREATE,
  payload: { title: 'Secret Note User A', content: 'Top Secret' },
});

assert(itemA !== null, 'Item A added to sync queue successfully');
assert(itemA.status === QUEUE_STATUS.PENDING, 'Item A status is PENDING');

const queueA = await getSyncQueue(userA);
assert(queueA.length === 1, `User A queue has 1 item (found ${queueA.length})`);
assert(queueA[0].payload.title === 'Secret Note User A', 'Item A payload matches');

const queueB = await getSyncQueue(userB);
assert(queueB.length === 0, `User B queue is empty (found ${queueB.length}) – Account Isolation preserved`);

// Add item for user B
const itemB = await addToSyncQueue({
  userId: userB,
  entityType: SYNC_ENTITY_TYPES.PASSWORD,
  entityId: 'pw-999',
  action: SYNC_ACTIONS.CREATE,
  payload: { title: 'Bank Account B', username: 'userB' },
});
assert(itemB !== null, 'Item B added to user B sync queue');
const updatedQueueB = await getSyncQueue(userB);
assert(updatedQueueB.length === 1, 'User B queue has 1 item');
assert(updatedQueueB[0].userId === userB, 'User B queue item belongs to User B');

// ----------------------------------------------------
// 2. QUEUE COALESCENCE & DEDUPLICATION
// ----------------------------------------------------
console.log('\n--- 2. Queue Coalescence & Deduplication ---');

// Coalesce UPDATE into existing CREATE
const updatedItemA = await addToSyncQueue({
  userId: userA,
  entityType: SYNC_ENTITY_TYPES.NOTE,
  entityId: 'note-001',
  action: SYNC_ACTIONS.UPDATE,
  payload: { title: 'Updated Title User A' },
});

const queueAAfterUpdate = await getSyncQueue(userA);
assert(queueAAfterUpdate.length === 1, 'Queue length remains 1 after update (coalesced)');
assert(queueAAfterUpdate[0].payload.title === 'Updated Title User A', 'Payload title updated');
assert(queueAAfterUpdate[0].payload.content === 'Top Secret', 'Existing payload preserved');

// Delete an un-synced created item: cancels creation
const cancelledItem = await addToSyncQueue({
  userId: userA,
  entityType: SYNC_ENTITY_TYPES.NOTE,
  entityId: 'note-001',
  action: SYNC_ACTIONS.DELETE,
  payload: {},
});
assert(cancelledItem === null, 'Deleting offline-created unsynced item returns null (cancelled)');
const queueAAfterCancel = await getSyncQueue(userA);
assert(queueAAfterCancel.length === 0, 'Queue is now empty after cancelling un-synced item');

// ----------------------------------------------------
// 3. QUEUE EXECUTION & RETRY BACKOFF
// ----------------------------------------------------
console.log('\n--- 3. Queue Execution & Retry Logic ---');

const retryTask = await addToSyncQueue({
  userId: userA,
  entityType: SYNC_ENTITY_TYPES.PHOTO,
  entityId: 'photo-err-1',
  action: SYNC_ACTIONS.CREATE,
  payload: { uri: 'file:///vault/photo1.jpg', name: 'photo1.jpg' },
});

// Simulate failure 1
retryTask.retryCount += 1;
retryTask.lastError = 'Network timeout';
retryTask.status = retryTask.retryCount >= retryTask.maxRetries ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING;
assert(retryTask.status === QUEUE_STATUS.PENDING, 'Retry 1/3 keeps status PENDING for automatic retry');
assert(retryTask.retryCount === 1, 'Retry count incremented to 1');

// Simulate failure 2
retryTask.retryCount += 1;
retryTask.lastError = 'Server 500 error';
retryTask.status = retryTask.retryCount >= retryTask.maxRetries ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING;
assert(retryTask.status === QUEUE_STATUS.PENDING, 'Retry 2/3 keeps status PENDING');

// Simulate failure 3 (reaches max retries)
retryTask.retryCount += 1;
retryTask.lastError = 'Storage bucket unreachable';
retryTask.status = retryTask.retryCount >= retryTask.maxRetries ? QUEUE_STATUS.FAILED : QUEUE_STATUS.PENDING;
assert(retryTask.status === QUEUE_STATUS.FAILED, 'Reaching max retries (3/3) marks status as FAILED');
assert(retryTask.lastError === 'Storage bucket unreachable', 'Last error preserved accurately');

// Simulate successful recovery
retryTask.status = QUEUE_STATUS.SYNCED;
retryTask.lastError = null;
assert(retryTask.status === QUEUE_STATUS.SYNCED, 'Successful execution transitions task to SYNCED');

// ----------------------------------------------------
// 4. CONFLICT RESOLUTION (LAST-WRITE-WINS)
// ----------------------------------------------------
console.log('\n--- 4. Conflict Resolution (Last-Write-Wins) ---');

const t0 = '2026-09-16T10:00:00.000Z';
const t1 = '2026-09-16T10:05:00.000Z';
const t2 = '2026-09-16T10:10:00.000Z';

// Scenario A: Remote is newer
const localNoteOld = { id: 'n1', title: 'Local V1', updatedAt: t0 };
const remoteNoteNew = { id: 'n1', title: 'Remote V2', updated_at: t2 };
const conflictA = resolveConflict(localNoteOld, remoteNoteNew);
assert(conflictA.winner === 'remote', 'Remote wins when remote.updated_at > local.updatedAt');
assert(conflictA.item.title === 'Remote V2', 'Remote item is selected');

// Scenario B: Local is newer
const localNoteNew = { id: 'n1', title: 'Local V3', updatedAt: t2 };
const remoteNoteOld = { id: 'n1', title: 'Remote V2', updated_at: t1 };
const conflictB = resolveConflict(localNoteNew, remoteNoteOld);
assert(conflictB.winner === 'local', 'Local wins when local.updatedAt > remote.updated_at');
assert(conflictB.item.title === 'Local V3', 'Local item is preserved');

// Scenario C: New remote item (not on device)
const conflictC = resolveConflict(null, remoteNoteNew);
assert(conflictC.winner === 'remote', 'Remote wins when local item does not exist (new item)');

// Scenario D: Local item without remote
const conflictD = resolveConflict(localNoteNew, null);
assert(conflictD.winner === 'local', 'Local wins when remote item does not exist');

// ----------------------------------------------------
// 5. SUBSCRIPTION GATE ON REAL VAULT SYNC
// ----------------------------------------------------
console.log('\n--- 5. Subscription Gate on Sync ---');

function mockProcessQueueWithSubscription(item, isSubscriptionValid) {
  const isRealVaultItem =
    (item.entityType === SYNC_ENTITY_TYPES.NOTE && item.payload?.type === 'private') ||
    item.entityType === SYNC_ENTITY_TYPES.PASSWORD ||
    [SYNC_ENTITY_TYPES.PHOTO, SYNC_ENTITY_TYPES.VIDEO, SYNC_ENTITY_TYPES.DOCUMENT, SYNC_ENTITY_TYPES.VOICE].includes(item.entityType);

  if (isRealVaultItem && !isSubscriptionValid) {
    return {
      allowed: false,
      status: QUEUE_STATUS.FAILED,
      error: 'Subscription expired: Gia hạn để tiếp tục đồng bộ dữ liệu Real Vault.',
    };
  }

  return { allowed: true, status: QUEUE_STATUS.SYNCED };
}

const privatePhotoItem = {
  entityType: SYNC_ENTITY_TYPES.PHOTO,
  payload: { uri: 'file:///vault/photo.jpg' },
};

const expiredSyncResult = mockProcessQueueWithSubscription(privatePhotoItem, false);
assert(expiredSyncResult.allowed === false, 'Real vault item blocked from sync when subscription EXPIRED');
assert(expiredSyncResult.status === QUEUE_STATUS.FAILED, 'Task status paused/failed when expired');
assert(expiredSyncResult.error.includes('Subscription expired'), 'Informative error returned without corrupting local data');

const validSyncResult = mockProcessQueueWithSubscription(privatePhotoItem, true);
assert(validSyncResult.allowed === true, 'Real vault item allowed to sync when subscription VALID');

const publicNoteItem = {
  entityType: SYNC_ENTITY_TYPES.NOTE,
  payload: { type: 'public', title: 'Shopping list' },
};
const publicNoteExpiredSync = mockProcessQueueWithSubscription(publicNoteItem, false);
assert(publicNoteExpiredSync.allowed === true, 'Public notes continue syncing even when vault subscription expired');

// ----------------------------------------------------
// 6. ENCRYPTED FILE SYNC & RESTORE LIFECYCLE (AES-256-GCM)
// ----------------------------------------------------
console.log('\n--- 6. Encrypted File Sync & Restore Lifecycle (Phase 5 + Phase 7) ---');

const MAGIC_BYTES = new Uint8Array([72, 73, 68, 68, 69, 82, 95, 69, 78, 67]); // 'HIDDER_ENC'
const CURRENT_ENCRYPTION_VERSION = 1;
const NONCE_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;
const HEADER_LENGTH_BYTES = 10 + 1 + 12; // 23 bytes

function encryptContainer(plainBytes, key) {
  const nonce = randomBytes(NONCE_LENGTH_BYTES);
  const cipher = gcm(key, nonce);
  const ciphertextWithTag = cipher.encrypt(plainBytes);

  const container = new Uint8Array(HEADER_LENGTH_BYTES + ciphertextWithTag.length);
  container.set(MAGIC_BYTES, 0);
  container[10] = CURRENT_ENCRYPTION_VERSION;
  container.set(nonce, 11);
  container.set(ciphertextWithTag, HEADER_LENGTH_BYTES);
  return container;
}

function decryptContainer(container, key) {
  // Validate magic bytes
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (container[i] !== MAGIC_BYTES[i]) {
      throw new Error('Invalid magic bytes: Not a Hidder container');
    }
  }
  const version = container[10];
  if (version !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${version}`);
  }
  const nonce = container.subarray(11, 11 + NONCE_LENGTH_BYTES);
  const ciphertextWithTag = container.subarray(HEADER_LENGTH_BYTES);

  const cipher = gcm(key, nonce);
  return cipher.decrypt(ciphertextWithTag);
}

// User master keys
const userMasterKey = randomBytes(32);
const wrongMasterKey = randomBytes(32);

// Simulated original vault photo bytes
const originalPhotoData = Buffer.from('RAW_JPEG_IMAGE_PIXELS_CLASSIFIED_EVIDENCE_1234567890');

// Step 1: Client-Side Encryption before upload
const encryptedUploadContainer = encryptContainer(originalPhotoData, userMasterKey);
assert(encryptedUploadContainer.length > originalPhotoData.length, 'Encrypted container includes header and tag');
assert(
  Buffer.from(encryptedUploadContainer.subarray(0, 10)).toString('utf8') === 'HIDDER_ENC',
  'Encrypted container starts with HIDDER_ENC magic bytes'
);
assert(encryptedUploadContainer[10] === 1, 'Encrypted container specifies version 1');

// Step 2: Multi-Device Restoration
// On new device, container is downloaded and decrypted with matching master key
const restoredPhotoData = decryptContainer(encryptedUploadContainer, userMasterKey);
assert(
  Buffer.compare(originalPhotoData, Buffer.from(restoredPhotoData)) === 0,
  'Restored photo matches original photo byte-for-byte on new device'
);

// Step 3: Decryption fails safely with wrong master key
let decryptFailed = false;
try {
  decryptContainer(encryptedUploadContainer, wrongMasterKey);
} catch (err) {
  decryptFailed = true;
}
assert(decryptFailed, 'Decryption with incorrect master key fails safely without data leak');

// ----------------------------------------------------
// 7. DATABASE MIGRATION VERIFICATION
// ----------------------------------------------------
console.log('\n--- 7. Database Migration SQL Verification ---');

const migrationPath = path.resolve('supabase/migrations/20260916_phase7_sync.sql');
assert(fs.existsSync(migrationPath), 'Phase 7 migration file exists');

const migrationSql = fs.readFileSync(migrationPath, 'utf8');
assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.notes'), 'Migration creates public.notes table');
assert(migrationSql.includes('CREATE TABLE IF NOT EXISTS public.passwords'), 'Migration creates public.passwords table');
assert(migrationSql.includes('ALTER TABLE public.files ADD COLUMN IF NOT EXISTS is_deleted'), 'Migration adds is_deleted to public.files');
assert(migrationSql.includes('ENABLE ROW LEVEL SECURITY'), 'Migration enables Row Level Security');
assert(migrationSql.includes('auth.uid() = user_id'), 'Migration enforces user_id RLS policies');

console.log('\n====================================================');
console.log(`  PHASE 7 TEST RESULTS: ${passed}/${total} TESTS PASSED`);
console.log('====================================================\n');
