import * as FileSystem from 'expo-file-system';
import { generateId } from '../utils/helpers.js';
import { SUPABASE_URL, supabase } from './supabase.js';
import {
  encryptVaultFile,
  decryptVaultFile,
  getUserMasterKey,
  getOrCreateUserMasterKey,
  getActiveMasterKey,
  CURRENT_ENCRYPTION_VERSION,
} from './crypto.js';

export const FILE_CATEGORIES = {
  PHOTO: 'PHOTO',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
  VOICE: 'VOICE',
  OTHER: 'OTHER',
};

export const SYNC_STATUS = {
  LOCAL: 'LOCAL',
  UPLOADING: 'UPLOADING',
  CLOUD: 'CLOUD',
  ERROR: 'ERROR',
  DELETED: 'DELETED',
};

// Configurable GCS bucket and backend endpoint
export const GCS_BUCKET_NAME =
  process.env.EXPO_PUBLIC_GCS_BUCKET || 'hidder-vault-storage';

export const GCS_BACKEND_URL =
  process.env.EXPO_PUBLIC_GCS_BACKEND_URL || `${SUPABASE_URL}/functions/v1/gcs-storage`;

/**
 * 1. Check storage quota against profiles table
 */
export const checkStorageQuota = async (fileSizeBytes) => {
  try {
    const { data, error } = await supabase.rpc('check_storage_quota', {
      p_file_size: Number(fileSizeBytes) || 0,
    });

    if (error) {
      console.warn('Lỗi kiểm tra quota qua RPC:', error.message);
      return { allowed: true, storage_used: 0, storage_limit: 5368709120 };
    }

    return data;
  } catch (err) {
    console.warn('Lỗi mạng khi kiểm tra quota:', err.message);
    return { allowed: true };
  }
};

/**
 * 2. Get user storage usage information (used, limit, percentage)
 */
export const getUserStorageUsage = async () => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { storage_used: 0, storage_limit: 5368709120, percentage: 0 };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('storage_used, storage_limit')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !data) {
      return { storage_used: 0, storage_limit: 5368709120, percentage: 0 };
    }

    const used = Number(data.storage_used) || 0;
    const limit = Number(data.storage_limit) || 5368709120;
    const percentage = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

    return {
      storage_used: used,
      storage_limit: limit,
      percentage,
    };
  } catch (err) {
    console.warn('Lỗi lấy thông tin dung lượng:', err.message);
    return { storage_used: 0, storage_limit: 5368709120, percentage: 0 };
  }
};

/**
 * 3. Request signed upload URL from backend/Edge Function
 */
export const requestSignedUploadUrl = async ({
  fileId,
  category,
  fileName,
  mimeType,
  sizeBytes,
}) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(GCS_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'get-upload-url',
        fileId,
        category,
        fileName,
        mimeType,
        sizeBytes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || 'Lỗi yêu cầu Signed URL từ backend',
        configured: data.configured !== false,
      };
    }

    return {
      success: true,
      signedUrl: data.signedUrl,
      storagePath: data.storagePath,
      fileId: data.fileId,
    };
  } catch (err) {
    return {
      success: false,
      error: `Không thể kết nối GCS Backend: ${err.message}`,
      configured: false,
    };
  }
};

/**
 * 4. Request signed download URL from backend/Edge Function
 */
export const requestSignedDownloadUrl = async (storagePath) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(GCS_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'get-download-url',
        storagePath,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return { success: false, error: data.error || 'Lỗi lấy Signed Download URL' };
    }

    return { success: true, signedUrl: data.signedUrl };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * 5. Request object deletion on Google Cloud Storage via backend
 */
export const requestDeleteFromCloud = async (storagePath) => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.access_token) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const response = await fetch(GCS_BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        action: 'delete-file',
        storagePath,
      }),
    });

    const data = await response.json();
    return { success: response.ok, error: data?.error };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * 6. Upload file to Cloud (Local-first: client-side encrypted before cloud PUT, preserves local file if fails)
 */
export const uploadFile = async ({
  localUri,
  fileName,
  category = FILE_CATEGORIES.PHOTO,
  mimeType = 'application/octet-stream',
  sizeBytes = 0,
}) => {
  // A. Check user authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User chưa đăng nhập' };
  }

  // B. Check Storage Quota
  const quota = await checkStorageQuota(sizeBytes);
  if (!quota.allowed) {
    return {
      success: false,
      error: 'Storage quota exceeded (Vượt quá dung lượng cho phép)',
      quotaExceeded: true,
    };
  }

  const fileId = generateId();
  const categoryPath = String(category).toLowerCase();
  const storagePath = `users/${user.id}/${categoryPath}/${fileId}`;

  // C. Client-Side Encryption: Encrypt local file into temporary container binary
  let encryptionResult;
  try {
    const masterKey =
      getActiveMasterKey() ||
      (await getUserMasterKey(user.id)) ||
      (await getOrCreateUserMasterKey(user.id));
    encryptionResult = await encryptVaultFile({
      sourceUri: localUri,
      masterKey,
      fileId,
    });
  } catch (encErr) {
    console.warn('Lỗi mã hóa file trước khi upload:', encErr.message);
    return {
      success: false,
      error: `Lỗi mã hóa client-side: ${encErr.message}`,
      fileId,
      storagePath,
      localPreserved: true,
    };
  }

  // D. Record initial metadata in Supabase files table (with encryption_version = 1)
  const initialMetadata = {
    id: fileId,
    user_id: user.id,
    original_name: fileName || fileId,
    storage_path: storagePath,
    mime_type: 'application/octet-stream', // Encrypted container binary
    size_bytes: encryptionResult.sizeBytes,
    category: category.toUpperCase(),
    sync_status: SYNC_STATUS.UPLOADING,
    encryption_version: encryptionResult.encryptionVersion,
  };

  try {
    await supabase.from('files').upsert(initialMetadata);
  } catch (metaErr) {
    console.warn('Lỗi ghi metadata ban đầu:', metaErr.message);
  }

  // E. Request signed upload URL from GCS backend (for encrypted payload size)
  const signedRes = await requestSignedUploadUrl({
    fileId,
    category,
    fileName,
    mimeType: 'application/octet-stream',
    sizeBytes: encryptionResult.sizeBytes,
  });

  if (!signedRes.success || !signedRes.signedUrl) {
    // Clean up temporary encrypted file, NEVER delete the original local file!
    try {
      await FileSystem.deleteAsync(encryptionResult.encryptedUri, { idempotent: true });
    } catch (_) { }

    await supabase
      .from('files')
      .update({ sync_status: SYNC_STATUS.ERROR, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    return {
      success: false,
      error: signedRes.error || 'Chưa cấu hình GCS backend',
      backendConfigured: signedRes.configured,
      fileId,
      storagePath,
      localPreserved: true,
    };
  }

  // F. Perform HTTP PUT upload of ENCRYPTED binary to Google Cloud Storage Signed URL
  try {
    const uploadResult = await FileSystem.uploadAsync(
      signedRes.signedUrl,
      encryptionResult.encryptedUri,
      {
        httpMethod: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      }
    );

    // Clean up temporary encrypted file immediately after upload attempt
    try {
      await FileSystem.deleteAsync(encryptionResult.encryptedUri, { idempotent: true });
    } catch (_) { }

    if (uploadResult.status >= 200 && uploadResult.status < 300) {
      // Mark as CLOUD synced in metadata
      await supabase
        .from('files')
        .update({
          sync_status: SYNC_STATUS.CLOUD,
          size_bytes: encryptionResult.sizeBytes,
          encryption_version: encryptionResult.encryptionVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', fileId);

      return {
        success: true,
        fileId,
        storagePath,
        sizeBytes: encryptionResult.sizeBytes,
        encryptionVersion: encryptionResult.encryptionVersion,
        syncStatus: SYNC_STATUS.CLOUD,
      };
    } else {
      throw new Error(`Upload to GCS failed with status code ${uploadResult.status}`);
    }
  } catch (uploadErr) {
    // Always clean up temp encrypted file on failure
    try {
      await FileSystem.deleteAsync(encryptionResult.encryptedUri, { idempotent: true });
    } catch (_) { }

    console.warn('Lỗi tải file lên GCS:', uploadErr.message);
    await supabase
      .from('files')
      .update({ sync_status: SYNC_STATUS.ERROR, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    return {
      success: false,
      error: uploadErr.message,
      fileId,
      localPreserved: true,
    };
  }
};

/**
 * 7. Download file from Google Cloud Storage to local destination
 * Handles both V1 encrypted files (decrypt locally) and V0 legacy files (backward compatibility)
 */
export const downloadFile = async ({ fileId, storagePath, destinationUri }) => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'User chưa đăng nhập' };
  }

  // A. Determine encryption_version from metadata
  let encryptionVersion = CURRENT_ENCRYPTION_VERSION;
  if (fileId) {
    const meta = await getFileMetadata(fileId);
    if (meta && typeof meta.encryption_version === 'number') {
      encryptionVersion = meta.encryption_version;
    }
  }

  // B. Request signed download URL from backend
  const signedRes = await requestSignedDownloadUrl(storagePath);
  if (!signedRes.success || !signedRes.signedUrl) {
    return { success: false, error: signedRes.error || 'Không thể lấy Signed Download URL' };
  }

  // C. Handle Legacy Plaintext File (encryption_version === 0)
  if (encryptionVersion === 0) {
    try {
      const downloadResult = await FileSystem.downloadAsync(signedRes.signedUrl, destinationUri);
      return {
        success: true,
        uri: downloadResult.uri,
        status: downloadResult.status,
        encryptionVersion: 0,
        legacy: true,
      };
    } catch (err) {
      return { success: false, error: `Lỗi tải file legacy: ${err.message}` };
    }
  }

  // D. Handle Encrypted File (encryption_version >= 1)
  const tempEncryptedUri = `${FileSystem.cacheDirectory}hidder_dl_${fileId || Date.now()}_${Math.random().toString(36).substring(2, 7)}.bin`;

  try {
    const downloadResult = await FileSystem.downloadAsync(signedRes.signedUrl, tempEncryptedUri);
    if (downloadResult.status < 200 || downloadResult.status >= 300) {
      throw new Error(`Download from GCS failed with status code ${downloadResult.status}`);
    }

    // Client-Side Decryption with existing user's Master Key (NEVER auto-generate on decrypt)
    const masterKey = getActiveMasterKey() || (await getUserMasterKey(user.id));
    if (!masterKey) {
      try {
        await FileSystem.deleteAsync(tempEncryptedUri, { idempotent: true });
      } catch (_) {}

      return {
        success: false,
        error: 'Không tìm thấy Master Encryption Key của tài khoản. Không thể giải mã file.',
      };
    }

    const decryptRes = await decryptVaultFile({
      encryptedUri: tempEncryptedUri,
      destinationUri,
      masterKey,
      expectedVersion: encryptionVersion,
    });

    // Clean up temporary encrypted file
    try {
      await FileSystem.deleteAsync(tempEncryptedUri, { idempotent: true });
    } catch (_) { }

    return {
      success: true,
      uri: decryptRes.uri,
      sizeBytes: decryptRes.sizeBytes,
      encryptionVersion,
    };
  } catch (err) {
    // Always clean up temp encrypted file on failure
    try {
      await FileSystem.deleteAsync(tempEncryptedUri, { idempotent: true });
    } catch (_) { }

    return {
      success: false,
      error: `Lỗi tải và giải mã file: ${err.message}`,
    };
  }
};

/**
 * 8. Delete file from Cloud and update metadata
 */
export const deleteFile = async (fileId) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    // A. Query file metadata to obtain storage_path
    const { data: fileRecord, error: fetchErr } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !fileRecord) {
      return { success: false, error: 'Không tìm thấy file hoặc không có quyền xóa' };
    }

    // B. Delete from GCS via backend
    await requestDeleteFromCloud(fileRecord.storage_path);

    // C. Mark as DELETED or remove from Supabase files table (triggers quota reduction via DB trigger)
    const { error: deleteErr } = await supabase
      .from('files')
      .update({ sync_status: SYNC_STATUS.DELETED, updated_at: new Date().toISOString() })
      .eq('id', fileId);

    if (deleteErr) {
      throw deleteErr;
    }

    return { success: true, fileId };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * 9. Get file metadata by fileId
 */
export const getFileMetadata = async (fileId) => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error) {
      return null;
    }
    return data;
  } catch (err) {
    return null;
  }
};

/**
 * 10. List user cloud files
 */
export const listCloudFiles = async (category = null) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    let query = supabase
      .from('files')
      .select('*')
      .eq('user_id', user.id)
      .neq('sync_status', SYNC_STATUS.DELETED)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category.toUpperCase());
    }

    const { data, error } = await query;
    if (error) {
      console.warn('Lỗi lấy danh sách cloud files:', error.message);
      return [];
    }

    return data || [];
  } catch (err) {
    console.warn('Lỗi kết nối listCloudFiles:', err.message);
    return [];
  }
};

/**
 * 11. Migration strategy: Upgrade legacy plaintext cloud file (v0) to encrypted file (v1)
 */
export const migrateLegacyFile = async (fileId) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const fileMeta = await getFileMetadata(fileId);
    if (!fileMeta) {
      return { success: false, error: 'Không tìm thấy thông tin file' };
    }

    if (fileMeta.encryption_version !== 0) {
      return { success: true, message: 'File đã được mã hóa (không phải legacy)', fileId };
    }

    // Step 1: Download legacy plaintext to temporary file
    const tempPlainUri = `${FileSystem.cacheDirectory}hidder_mig_plain_${fileId}.tmp`;
    const dlRes = await downloadFile({
      fileId,
      storagePath: fileMeta.storage_path,
      destinationUri: tempPlainUri,
    });

    if (!dlRes.success) {
      return { success: false, error: `Không thể tải file legacy: ${dlRes.error}` };
    }

    // Step 2: Encrypt locally with existing Master Key (requires existing key)
    const masterKey = getActiveMasterKey() || (await getUserMasterKey(user.id));
    if (!masterKey) {
      try {
        await FileSystem.deleteAsync(tempPlainUri, { idempotent: true });
      } catch (_) {}
      return {
        success: false,
        error: 'Không tìm thấy Master Encryption Key của tài khoản. Không thể migrate file.',
      };
    }

    const encRes = await encryptVaultFile({
      sourceUri: tempPlainUri,
      masterKey,
      fileId,
    });

    // Step 3: Request Signed Upload URL
    const signedRes = await requestSignedUploadUrl({
      fileId,
      category: fileMeta.category,
      fileName: fileMeta.original_name,
      mimeType: 'application/octet-stream',
      sizeBytes: encRes.sizeBytes,
    });

    if (!signedRes.success || !signedRes.signedUrl) {
      await FileSystem.deleteAsync(tempPlainUri, { idempotent: true });
      await FileSystem.deleteAsync(encRes.encryptedUri, { idempotent: true });
      return { success: false, error: signedRes.error || 'Lỗi lấy Signed URL để migrate' };
    }

    // Step 4: Upload encrypted replacement to GCS
    const uploadRes = await FileSystem.uploadAsync(signedRes.signedUrl, encRes.encryptedUri, {
      httpMethod: 'PUT',
      headers: { 'Content-Type': 'application/octet-stream' },
    });

    // Clean up temporary files
    await FileSystem.deleteAsync(tempPlainUri, { idempotent: true });
    await FileSystem.deleteAsync(encRes.encryptedUri, { idempotent: true });

    if (uploadRes.status < 200 || uploadRes.status >= 300) {
      return {
        success: false,
        error: `Upload encrypted replacement thất bại: status ${uploadRes.status}`,
      };
    }

    // Step 5: Update Supabase metadata to encryption_version = 1
    await supabase
      .from('files')
      .update({
        encryption_version: CURRENT_ENCRYPTION_VERSION,
        size_bytes: encRes.sizeBytes,
        sync_status: SYNC_STATUS.CLOUD,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fileId);

    return {
      success: true,
      fileId,
      migrated: true,
      encryptionVersion: CURRENT_ENCRYPTION_VERSION,
    };
  } catch (err) {
    return { success: false, error: `Lỗi migrate file legacy: ${err.message}` };
  }
};

