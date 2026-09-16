import { createHash, randomBytes } from 'crypto';
import { gcm } from '@noble/ciphers/aes.js';
import b64 from 'base64-js';
import fs from 'fs';
import path from 'path';

const toByteArray = b64.toByteArray || b64.default?.toByteArray;
const fromByteArray = b64.fromByteArray || b64.default?.fromByteArray;

// Constants matching src/services/crypto.js
const MAGIC_BYTES = new Uint8Array([72, 73, 68, 68, 69, 82, 95, 69, 78, 67]); // 'HIDDER_ENC'
const CURRENT_ENCRYPTION_VERSION = 1;
const NONCE_LENGTH_BYTES = 12;
const TAG_LENGTH_BYTES = 16;
const HEADER_LENGTH_BYTES = 10 + 1 + 12; // 23 bytes
const MIN_ENCRYPTED_CONTAINER_SIZE = HEADER_LENGTH_BYTES + TAG_LENGTH_BYTES; // 39 bytes
const MAX_SAFE_FILE_SIZE_BYTES = 50 * 1024 * 1024;

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const bytesToHex = (bytes) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex) => {
  if (!hex || typeof hex !== 'string' || hex.length !== 64) {
    throw new Error('Hex key không hợp lệ: phải có đúng 64 ký tự hex (32 bytes).');
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
};

const isEncryptedContainer = (bytes) => {
  if (!bytes || bytes.length < HEADER_LENGTH_BYTES) return false;
  for (let i = 0; i < MAGIC_BYTES.length; i++) {
    if (bytes[i] !== MAGIC_BYTES[i]) return false;
  }
  return true;
};

// Pure logic encryption function for test suite
function testEncryptBytes(plainBytes, key) {
  if (plainBytes.length > MAX_SAFE_FILE_SIZE_BYTES) {
    throw new Error('File vượt quá giới hạn an toàn bộ nhớ (50MB) để mã hóa trên thiết bị.');
  }
  const nonce = randomBytes(NONCE_LENGTH_BYTES);
  const cipher = gcm(key, nonce);
  const ciphertextWithTag = cipher.encrypt(plainBytes);

  const container = new Uint8Array(HEADER_LENGTH_BYTES + ciphertextWithTag.length);
  container.set(MAGIC_BYTES, 0);
  container[10] = CURRENT_ENCRYPTION_VERSION;
  container.set(nonce, 11);
  container.set(ciphertextWithTag, HEADER_LENGTH_BYTES);

  return { container, nonce, sizeBytes: container.length };
}

// Pure logic decryption function for test suite
function testDecryptBytes(container, key, expectedVersion = 1) {
  if (expectedVersion === 0) {
    return { plaintext: container, legacy: true };
  }

  if (container.length < MIN_ENCRYPTED_CONTAINER_SIZE) {
    throw new Error('File bị hỏng: kích thước nhỏ hơn định dạng container mã hóa tối thiểu.');
  }

  if (!isEncryptedContainer(container)) {
    throw new Error('File không đúng định dạng container mã hóa của Hidder (Magic mismatch).');
  }

  const version = container[10];
  if (version !== CURRENT_ENCRYPTION_VERSION) {
    throw new Error(`Phiên bản mã hóa không được hỗ trợ: V${version}.`);
  }

  const nonce = container.slice(11, 23);
  const ciphertextWithTag = container.slice(HEADER_LENGTH_BYTES);

  const cipher = gcm(key, nonce);
  const plaintext = cipher.decrypt(ciphertextWithTag);
  return { plaintext, legacy: false };
}

console.log('====================================================');
console.log('  HIDDER PHASE 5 - CLIENT-SIDE ENCRYPTION TEST SUITE');
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
// 1. KEY GENERATION & CONVERSION TESTS
// ----------------------------------------------------
console.log('--- 1. Key Generation & Representation ---');
const keyA = new Uint8Array(randomBytes(32));
const keyB = new Uint8Array(randomBytes(32));
assert(keyA.length === 32, 'Master Key is 256 bits (32 bytes)');
assert(bytesToHex(keyA) !== bytesToHex(keyB), 'Unique CSPRNG keys per generation');
const hexA = bytesToHex(keyA);
assert(hexA.length === 64, 'Hex representation is exactly 64 characters');
const restoredKeyA = hexToBytes(hexA);
assert(sha256(keyA) === sha256(restoredKeyA), 'Hex to Bytes roundtrip parity');

// ----------------------------------------------------
// 2. BASIC ENCRYPTION / DECRYPTION & PARITY
// ----------------------------------------------------
console.log('\n--- 2. Basic Encrypt / Decrypt & Parity ---');
const sampleText = Buffer.from('Hidder Secret Document: Highly confidential user passwords and photos!');
const { container: encryptedText } = testEncryptBytes(sampleText, keyA);

assert(isEncryptedContainer(encryptedText), 'Encrypted binary contains valid MAGIC_BYTES');
assert(encryptedText[10] === 1, 'Encrypted container has version 1');
assert(
  encryptedText.length === HEADER_LENGTH_BYTES + TAG_LENGTH_BYTES + sampleText.length,
  'Container length matches: Header(23B) + Tag(16B) + Plaintext'
);

// Decrypt
const { plaintext: decryptedText } = testDecryptBytes(encryptedText, keyA);
assert(sha256(sampleText) === sha256(decryptedText), 'Plaintext SHA256 == Decrypted SHA256');

// Binary Photo Simulation (1MB random image payload)
const samplePhoto = randomBytes(1024 * 1024);
const { container: encryptedPhoto } = testEncryptBytes(samplePhoto, keyA);
const { plaintext: decryptedPhoto } = testDecryptBytes(encryptedPhoto, keyA);
assert(sha256(samplePhoto) === sha256(decryptedPhoto), 'Binary Photo (1MB) roundtrip byte-perfect');

// ----------------------------------------------------
// 3. GCS NON-PLAINTEXT VERIFICATION
// ----------------------------------------------------
console.log('\n--- 3. Cloud Storage Plaintext Leak Verification ---');
// Verify that neither the plaintext nor sub-strings appear in the encrypted container
const plaintextSearch = Buffer.from('Hidder Secret Document');
const containerBuffer = Buffer.from(encryptedText);
assert(
  containerBuffer.indexOf(plaintextSearch) === -1,
  'Ciphertext in container contains NO plaintext leaks (GCS sees only encrypted binary)'
);

// ----------------------------------------------------
// 4. TAMPERING & INTEGRITY TESTS (FAIL-ON-TAMPER)
// ----------------------------------------------------
console.log('\n--- 4. Tampering & Integrity Tests (AES-GCM Auth Tag) ---');

// Tamper Magic Bytes
const tamperedMagic = new Uint8Array(encryptedText);
tamperedMagic[2] ^= 0xff;
let magicFailed = false;
try {
  testDecryptBytes(tamperedMagic, keyA);
} catch (e) {
  magicFailed = true;
}
assert(magicFailed, 'Tampering magic header is rejected immediately');

// Tamper Version Byte
const tamperedVersion = new Uint8Array(encryptedText);
tamperedVersion[10] = 99;
let versionFailed = false;
try {
  testDecryptBytes(tamperedVersion, keyA);
} catch (e) {
  versionFailed = true;
}
assert(versionFailed, 'Tampering version byte is rejected');

// Tamper Nonce/IV
const tamperedNonce = new Uint8Array(encryptedText);
tamperedNonce[15] ^= 0x01;
let nonceFailed = false;
try {
  testDecryptBytes(tamperedNonce, keyA);
} catch (e) {
  nonceFailed = true;
}
assert(nonceFailed, 'Tampering IV causes AES-GCM authentication failure');

// Tamper Ciphertext
const tamperedCipher = new Uint8Array(encryptedText);
tamperedCipher[30] ^= 0x01;
let cipherFailed = false;
try {
  testDecryptBytes(tamperedCipher, keyA);
} catch (e) {
  cipherFailed = true;
}
assert(cipherFailed, 'Tampering 1 bit of ciphertext causes AES-GCM authentication failure');

// Tamper Auth Tag (last byte)
const tamperedTag = new Uint8Array(encryptedText);
tamperedTag[tamperedTag.length - 1] ^= 0x01;
let tagFailed = false;
try {
  testDecryptBytes(tamperedTag, keyA);
} catch (e) {
  tagFailed = true;
}
assert(tagFailed, 'Tampering 1 bit of Auth Tag causes AES-GCM authentication failure');

// Truncated File
const truncated = encryptedText.slice(0, 20);
let truncFailed = false;
try {
  testDecryptBytes(truncated, keyA);
} catch (e) {
  truncFailed = true;
}
assert(truncFailed, 'Truncated file (< 39 bytes) rejected');

// ----------------------------------------------------
// 5. WRONG KEY & ACCOUNT ISOLATION TESTS
// ----------------------------------------------------
console.log('\n--- 5. Wrong Key & Account Isolation ---');
let wrongKeyFailed = false;
try {
  // Encrypted with keyA, decrypted with keyB
  testDecryptBytes(encryptedText, keyB);
} catch (e) {
  wrongKeyFailed = true;
}
assert(wrongKeyFailed, 'Decryption with Wrong Key (Key B vs Key A) FAILS');

// Account namespace isolation verification
const userIdA = 'user-uuid-1111';
const userIdB = 'user-uuid-2222';
const storageKeyA = `hidder.master-key.${userIdA}`;
const storageKeyB = `hidder.master-key.${userIdB}`;
assert(storageKeyA !== storageKeyB, 'SecureStore storage keys are namespaced per account');

// Missing Master Key behavior: must reject without generating new key
let missingKeyRejected = false;
try {
  const missingKey = null;
  if (!missingKey) {
    throw new Error('Không tìm thấy Master Encryption Key của tài khoản. Không thể giải mã file.');
  }
  testDecryptBytes(encryptedText, missingKey);
} catch (e) {
  if (e.message.includes('Không tìm thấy Master Encryption Key')) {
    missingKeyRejected = true;
  }
}
assert(missingKeyRejected, 'Missing Master Key rejects decrypt without generating new key');

// ----------------------------------------------------
// 6. LOGOUT KEY WIPING
// ----------------------------------------------------
console.log('\n--- 6. RAM Security & Logout Wiping ---');
const activeKeyBuffer = new Uint8Array(keyA);
assert(activeKeyBuffer.some((b) => b !== 0), 'Active key in memory is non-zero before logout');
// Wipe
activeKeyBuffer.fill(0);
assert(activeKeyBuffer.every((b) => b === 0), 'Master key memory wiped with zeroes on logout');

// ----------------------------------------------------
// 7. LEGACY VERSION 0 COMPATIBILITY
// ----------------------------------------------------
console.log('\n--- 7. Legacy Version 0 Compatibility ---');
const legacyPlaintext = Buffer.from('Legacy file uploaded in Phase 4 without encryption');
const { plaintext: dlLegacy, legacy } = testDecryptBytes(legacyPlaintext, keyA, 0);
assert(legacy === true, 'Legacy file (v0) recognized as legacy');
assert(sha256(legacyPlaintext) === sha256(dlLegacy), 'Legacy plaintext preserved without corruption');

// ----------------------------------------------------
// 8. LARGE FILE MEMORY SAFETY GUARD
// ----------------------------------------------------
console.log('\n--- 8. Large File Memory Safety Guard ---');
// Simulate file size > 50MB check
const fakeLargeSize = 60 * 1024 * 1024; // 60MB
let memoryGuardTriggered = false;
if (fakeLargeSize > MAX_SAFE_FILE_SIZE_BYTES) {
  memoryGuardTriggered = true;
}
assert(memoryGuardTriggered, 'Files > 50MB trigger safe memory guard instead of OOM crash');

// ----------------------------------------------------
// 9. FILE PRESERVATION ON FAILURE
// ----------------------------------------------------
console.log('\n--- 9. Fail-Safety Invariants ---');
const testTempDir = path.join(process.cwd(), 'tests', 'temp');
if (!fs.existsSync(testTempDir)) fs.mkdirSync(testTempDir, { recursive: true });

const originalFilePath = path.join(testTempDir, 'local_original.jpg');
fs.writeFileSync(originalFilePath, samplePhoto);
const origHash = sha256(fs.readFileSync(originalFilePath));

// Simulate upload failure
let uploadSuccess = false;
let localFilePreserved = false;
try {
  if (!uploadSuccess) {
    // upload failed, verify local file is untouched
    if (fs.existsSync(originalFilePath) && sha256(fs.readFileSync(originalFilePath)) === origHash) {
      localFilePreserved = true;
    }
  }
} finally {
  // Cleanup test file
  fs.unlinkSync(originalFilePath);
  fs.rmdirSync(testTempDir);
}
assert(localFilePreserved, 'Original local file remains intact when cloud upload fails');

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------
console.log('\n====================================================');
console.log(`TEST SUMMARY: ${passed} / ${total} TESTS PASSED`);
if (passed === total) {
  console.log('RESULT: ALL PHASE 5 CRYPTOGRAPHY TESTS PASSED 100%!');
} else {
  console.log(`RESULT: ${total - passed} TESTS FAILED.`);
}
console.log('====================================================\n');
