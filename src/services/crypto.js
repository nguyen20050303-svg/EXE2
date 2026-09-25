import * as Crypto from 'expo-crypto';
import { gcm } from '@noble/ciphers/aes.js';
import b64 from 'base64-js';
import * as FileSystem from 'expo-file-system/legacy';
import { secureDeleteItem, secureGetItem, secureSetItem } from './secureStorage';

// ==========================================
// 1. LEGACY SECRET CODE UTILITIES (PRESERVED)
// ==========================================
export const normalizeSecretCode = (value) => value?.trim().toLowerCase() ?? '';

export const isValidSecretCode = (value) => normalizeSecretCode(value).length >= 4;

export const maskSecretCode = (value) => {
  const normalized = normalizeSecretCode(value);

  if (!normalized) {
    return '';
  }

  if (normalized.length <= 2) {
    return '•'.repeat(normalized.length);
  }

  return `${normalized[0]}${'•'.repeat(Math.max(1, normalized.length - 2))}${normalized[normalized.length - 1]}`;
};

// ==========================================
// 2. CRYPTOGRAPHIC CONSTANTS & SPECIFICATION
// ==========================================
// Magic ASCII: 'HIDDER_ENC' (10 bytes)
export const MAGIC_BYTES = new Uint8Array([72, 73, 68, 68, 69, 82, 95, 69, 78, 67]);
export const CURRENT_ENCRYPTION_VERSION = 1;
export const NONCE_LENGTH_BYTES = 12; // 96 bits for standard AES-GCM
export const TAG_LENGTH_BYTES = 16; // 128 bits GCM Auth Tag
export const HEADER_LENGTH_BYTES = 10 + 1 + 12; // 23 bytes (Magic + Version + Nonce)
export const MIN_ENCRYPTED_CONTAINER_SIZE = HEADER_LENGTH_BYTES + TAG_LENGTH_BYTES; // 39 bytes

// Memory safety limit: 50MB safe buffer threshold on mobile devices
export const MAX_SAFE_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const toByteArray = b64.toByteArray || b64.default?.toByteArray;
const fromByteArray = b64.fromByteArray || b64.default?.fromByteArray;

// ==========================================
// 3. CSPRNG & KEY MANAGEMENT (ACCOUNT ISOLATED)
// ==========================================

/**
 * Generate cryptographically secure random bytes
 */
export const getRandomBytes = (byteCount) => {
  if (Crypto && typeof Crypto.getRandomBytes === 'function') {
    return Crypto.getRandomBytes(byteCount);
  }
  if (
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    typeof globalThis.crypto.getRandomValues === 'function'
  ) {
    const arr = new Uint8Array(byteCount);
    globalThis.crypto.getRandomValues(arr);
    return arr;
  }
  throw new Error('Không có bộ sinh số ngẫu nhiên an toàn (CSPRNG) trên môi trường hiện tại.');
};

/**
 * Convert Uint8Array to 64-character hex string
 */
export const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

/**
 * Convert 64-character hex string to 32-byte Uint8Array (AES-256)
 */
export const hexToBytes = (hex) => {
  if (!hex || typeof hex !== 'string' || hex.length !== 64) {
    throw new Error('Hex key không hợp lệ: phải có đúng 64 ký tự hex (32 bytes).');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

/**
 * Zero out sensitive bytes in memory
 */
export const wipeMemoryBytes = (bytes) => {
  if (bytes && bytes instanceof Uint8Array) {
    bytes.fill(0);
  }
};

/**
 * Generate a new 256-bit (32-byte) Master Encryption Key via CSPRNG
 */
export const generateMasterKey = () => getRandomBytes(32);

/**
 * Active Master Key held in memory during user session
 */
let _inMemoryMasterKey = null;

export const setActiveMasterKey = (keyBytes) => {
  if (keyBytes && keyBytes instanceof Uint8Array && keyBytes.length === 32) {
    // Clone to prevent external mutation
    _inMemoryMasterKey = new Uint8Array(keyBytes);
  } else {
    _inMemoryMasterKey = null;
  }
};

export const getActiveMasterKey = () => _inMemoryMasterKey;

export const clearActiveMasterKey = () => {
  if (_inMemoryMasterKey) {
    wipeMemoryBytes(_inMemoryMasterKey);
    _inMemoryMasterKey = null;
  }
};

/**
 * Retrieve User's Master Encryption Key from SecureStore (namespaced by userId)
 */
export const getUserMasterKey = async (userId) => {
  if (!userId) return null;
  const storageKey = `hidder.master-key.${userId}`;
  const hex = await secureGetItem(storageKey);
  if (!hex) return null;
  try {
    return hexToBytes(hex);
  } catch (err) {
    console.error('Lỗi phân tích Master Key từ SecureStore:', err);
    return null;
  }
};

/**
 * Retrieve or generate a new Master Encryption Key for a specific account
 */
export const getOrCreateUserMasterKey = async (userId) => {
  if (!userId) {
    throw new Error('Cần userId để nạp hoặc tạo Master Encryption Key.');
  }

  const existing = await getUserMasterKey(userId);
  if (existing) {
    setActiveMasterKey(existing);
    return existing;
  }

  // Generate new 256-bit random key
  const newKey = generateMasterKey();
  const hex = bytesToHex(newKey);
  const storageKey = `hidder.master-key.${userId}`;

  await secureSetItem(storageKey, hex);
  setActiveMasterKey(newKey);

  return newKey;
};

/**
 * Delete User's Master Encryption Key from SecureStore
 */
export const deleteUserMasterKey = async (userId) => {
  if (!userId) return;
  const storageKey = `hidder.master-key.${userId}`;
  await secureDeleteItem(storageKey);
  clearActiveMasterKey();
};

// ==========================================
// 4. CONTAINER FORMAT HELPERS
// ==========================================

/**
 * Check if binary matches Hidder encrypted container magic bytes
 */
export const isEncryptedContainer = (bytes) => {
  if (!bytes || bytes.length < HEADER_LENGTH_BYTES) return false;
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (bytes[i] !== MAGIC_BYTES[i]) return false;
  }
  return true;
};

// ==========================================
// 5. FILE ENCRYPTION & DECRYPTION APIS
// ==========================================

/**
 * Encrypt a local file using AES-256-GCM and package into V1 binary container
 * 
 * Container Format:
 * [0..9]   : ASCII 'HIDDER_ENC' (10 bytes)
 * [10]     : Version = 0x01 (1 byte)
 * [11..22] : CSPRNG Nonce/IV (12 bytes)
 * [23..end]: Ciphertext + GCM Auth Tag (16 bytes)
 * 
 * @param {Object} params
 * @param {string} params.sourceUri - Path to original local file
 * @param {Uint8Array} [params.masterKey] - 32-byte encryption key (defaults to active key)
 * @param {string} [params.fileId] - Optional file ID for temp file naming
 * @returns {Promise<{ encryptedUri: string, sizeBytes: number, encryptionVersion: number }>}
 */
export const encryptVaultFile = async ({ sourceUri, masterKey = null, fileId = null }) => {
  const key = masterKey || getActiveMasterKey();
  if (!key || key.length !== 32) {
    throw new Error('Khóa mã hóa không hợp lệ hoặc chưa được nạp.');
  }

  // 1. Verify source file exists and check size
  const fileInfo = await FileSystem.getInfoAsync(sourceUri, { size: true });
  if (!fileInfo.exists) {
    throw new Error(`File gốc không tồn tại: ${sourceUri}`);
  }

  const rawSize = fileInfo.size || 0;
  if (rawSize > MAX_SAFE_FILE_SIZE_BYTES) {
    throw new Error(
      `File kích thước ${(rawSize / (1024 * 1024)).toFixed(1)}MB vượt quá giới hạn an toàn bộ nhớ (50MB) để mã hóa trên thiết bị.`
    );
  }

  const tempEncryptedUri = `${FileSystem.cacheDirectory}hidder_enc_${fileId || Date.now()}_${Math.random().toString(36).substring(2, 7)}.bin`;

  try {
    // 2. Read local file as Base64
    const base64Plain = await FileSystem.readAsStringAsync(sourceUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const plaintextBytes = toByteArray(base64Plain);

    // 3. Generate unique random 12-byte CSPRNG IV (NEVER reuse)
    const nonce = getRandomBytes(NONCE_LENGTH_BYTES);

    // 4. Encrypt with AES-256-GCM (returns ciphertext + 16-byte authentication tag)
    const cipher = gcm(key, nonce);
    const ciphertextWithTag = cipher.encrypt(plaintextBytes);

    // 5. Assemble container binary
    const container = new Uint8Array(HEADER_LENGTH_BYTES + ciphertextWithTag.length);
    container.set(MAGIC_BYTES, 0);
    container[10] = CURRENT_ENCRYPTION_VERSION;
    container.set(nonce, 11);
    container.set(ciphertextWithTag, HEADER_LENGTH_BYTES);

    // 6. Write container to temporary encrypted file
    const base64Encrypted = fromByteArray(container);
    await FileSystem.writeAsStringAsync(tempEncryptedUri, base64Encrypted, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      encryptedUri: tempEncryptedUri,
      sizeBytes: container.length,
      encryptionVersion: CURRENT_ENCRYPTION_VERSION,
    };
  } catch (err) {
    // Cleanup temporary encrypted file if created, NEVER delete the original source!
    try {
      const tempCheck = await FileSystem.getInfoAsync(tempEncryptedUri);
      if (tempCheck.exists) {
        await FileSystem.deleteAsync(tempEncryptedUri, { idempotent: true });
      }
    } catch (_) {}

    throw new Error(`Mã hóa file thất bại: ${err.message}`);
  }
};

/**
 * Decrypt an encrypted container file and write the plaintext to destinationUri
 * 
 * Verifies Magic Header, Version, and AES-256-GCM Tag.
 * Throws an error immediately if data was tampered with or if key is incorrect.
 * 
 * @param {Object} params
 * @param {string} params.encryptedUri - Path to encrypted container file
 * @param {string} params.destinationUri - Path where plaintext file should be saved
 * @param {Uint8Array} [params.masterKey] - 32-byte encryption key (defaults to active key)
 * @param {number} [params.expectedVersion] - Expected encryption version (0 = legacy plaintext, 1 = V1)
 * @returns {Promise<{ success: boolean, uri: string, sizeBytes: number }>}
 */
export const decryptVaultFile = async ({
  encryptedUri,
  destinationUri,
  masterKey = null,
  expectedVersion = CURRENT_ENCRYPTION_VERSION,
}) => {
  // 1. Verify encrypted file exists
  const fileInfo = await FileSystem.getInfoAsync(encryptedUri, { size: true });
  if (!fileInfo.exists) {
    throw new Error(`File mã hóa không tồn tại: ${encryptedUri}`);
  }

  // Handle legacy version 0 (plaintext)
  if (expectedVersion === 0) {
    // Copy directly without decryption
    await FileSystem.copyAsync({
      from: encryptedUri,
      to: destinationUri,
    });
    return {
      success: true,
      uri: destinationUri,
      sizeBytes: fileInfo.size || 0,
      legacy: true,
    };
  }

  const key = masterKey || getActiveMasterKey();
  if (!key || key.length !== 32) {
    throw new Error('Khóa giải mã không hợp lệ hoặc chưa được nạp.');
  }

  if (fileInfo.size < MIN_ENCRYPTED_CONTAINER_SIZE) {
    throw new Error('File bị hỏng: kích thước nhỏ hơn định dạng container mã hóa tối thiểu.');
  }

  if (fileInfo.size > MAX_SAFE_FILE_SIZE_BYTES + HEADER_LENGTH_BYTES + TAG_LENGTH_BYTES) {
    throw new Error(
      `File mã hóa vượt quá giới hạn an toàn bộ nhớ (50MB) để giải mã trên thiết bị.`
    );
  }

  try {
    // 2. Read encrypted file as Base64
    const base64Data = await FileSystem.readAsStringAsync(encryptedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const container = toByteArray(base64Data);

    // 3. Verify Magic Header
    if (!isEncryptedContainer(container)) {
      throw new Error('File không đúng định dạng container mã hóa của Hidder (Magic mismatch).');
    }

    // 4. Verify Version
    const version = container[10];
    if (version !== CURRENT_ENCRYPTION_VERSION) {
      throw new Error(`Phiên bản mã hóa không được hỗ trợ: V${version}.`);
    }

    // 5. Extract Nonce/IV and Ciphertext+Tag
    const nonce = container.slice(11, 23);
    const ciphertextWithTag = container.slice(HEADER_LENGTH_BYTES);

    // 6. Decrypt and verify integrity via AES-256-GCM
    // Note: gcm.decrypt throws an error automatically if tag verification fails!
    const cipher = gcm(key, nonce);
    const plaintextBytes = cipher.decrypt(ciphertextWithTag);

    // 7. Write plaintext to destinationUri
    const base64Plain = fromByteArray(plaintextBytes);
    await FileSystem.writeAsStringAsync(destinationUri, base64Plain, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      success: true,
      uri: destinationUri,
      sizeBytes: plaintextBytes.length,
    };
  } catch (err) {
    // Clean up partial destination if created so no corrupted/tampered file remains
    try {
      const destCheck = await FileSystem.getInfoAsync(destinationUri);
      if (destCheck.exists) {
        await FileSystem.deleteAsync(destinationUri, { idempotent: true });
      }
    } catch (_) {}

    throw new Error(`Giải mã file thất bại (File có thể bị can thiệp hoặc sai khóa): ${err.message}`);
  }
};

/**
 * Verify integrity of an encrypted file without writing to destination
 */
export const verifyFileIntegrity = async ({ encryptedUri, masterKey = null }) => {
  const key = masterKey || getActiveMasterKey();
  if (!key || key.length !== 32) {
    return { valid: false, error: 'Chưa có khóa giải mã.' };
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(encryptedUri, { size: true });
    if (!fileInfo.exists || fileInfo.size < MIN_ENCRYPTED_CONTAINER_SIZE) {
      return { valid: false, error: 'Kích thước file không hợp lệ.' };
    }

    const base64Data = await FileSystem.readAsStringAsync(encryptedUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const container = toByteArray(base64Data);

    if (!isEncryptedContainer(container)) {
      return { valid: false, error: 'Không phải file mã hóa Hidder hợp lệ.' };
    }

    const version = container[10];
    if (version !== CURRENT_ENCRYPTION_VERSION) {
      return { valid: false, error: `Phiên bản V${version} không được hỗ trợ.` };
    }

    const nonce = container.slice(11, 23);
    const ciphertextWithTag = container.slice(HEADER_LENGTH_BYTES);

    const cipher = gcm(key, nonce);
    cipher.decrypt(ciphertextWithTag);

    return { valid: true, version, sizeBytes: ciphertextWithTag.length - TAG_LENGTH_BYTES };
  } catch (err) {
    return { valid: false, error: `Kiểm tra toàn vẹn thất bại: ${err.message}` };
  }
};
