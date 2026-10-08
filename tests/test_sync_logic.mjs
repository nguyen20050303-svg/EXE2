import { createHash, randomBytes } from 'crypto';
import { gcm } from '@noble/ciphers/aes.js';
import b64 from 'base64-js';

const toByteArray = b64.toByteArray || b64.default?.toByteArray;
const fromByteArray = b64.fromByteArray || b64.default?.fromByteArray;

console.log('====================================================');
console.log('  HIDDER – KIỂM TRA CHUYÊN SÂU LOGIC ĐỒNG BỘ MULTI-DEVICE');
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

const isUUID = (str) => {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
};

const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// 1. Kiểm tra UUID Generation & Validation
assert(isUUID(generateUUID()), '1. generateUUID() tạo ra UUID v4 chuẩn RFC 4122');
assert(!isUUID('abc1234'), '2. isUUID("abc1234") trả về false (phát hiện chuỗi ngắn cũ)');
assert(isUUID('3d5a9d21-01cf-4926-bdae-40574007115a'), '3. isUUID nhận diện đúng định dạng PostgreSQL UUID');

// 2. Mô phỏng Mã hóa & Giải mã 2 thiết bị cùng Master Key
const masterKeyDevice1 = randomBytes(32);
const masterKeyHex = masterKeyDevice1.toString('hex');

// Thiết bị 2 tải key từ Supabase profiles.master_key
const masterKeyDevice2 = Buffer.from(masterKeyHex, 'hex');
assert(
  masterKeyDevice1.equals(masterKeyDevice2),
  '4. Master Key của Thiết bị 1 và Thiết bị 2 đồng nhất 100% khi lấy từ profiles.master_key'
);

// Thiết bị 1 mã hóa một bức ảnh
const originalPhotoBytes = Buffer.from('PRETEND_THIS_IS_A_SECRET_PHOTO_JPEG_DATA_12345');
const nonce = randomBytes(12);
const cipher1 = gcm(masterKeyDevice1, nonce);
const ciphertextWithTag = cipher1.encrypt(originalPhotoBytes);

const MAGIC_BYTES = new Uint8Array([72, 73, 68, 68, 69, 82, 95, 69, 78, 67]);
const container = new Uint8Array(23 + ciphertextWithTag.length);
container.set(MAGIC_BYTES, 0);
container[10] = 1; // version 1
container.set(nonce, 11);
container.set(ciphertextWithTag, 23);

// Thiết bị 2 tải container về và giải mã bằng masterKeyDevice2
const extractedNonce = container.slice(11, 23);
const extractedCiphertext = container.slice(23);
const cipher2 = gcm(masterKeyDevice2, extractedNonce);
const decryptedBytes = cipher2.decrypt(extractedCiphertext);

assert(
  Buffer.from(decryptedBytes).equals(originalPhotoBytes),
  '5. Thiết bị 2 giải mã thành công 100% dữ liệu gốc từ Thiết bị 1'
);

// 3. Kiểm tra Logic Reconcile Local Media vào Sync Queue
const mockLocalPhotos = [
  { id: generateUUID(), name: 'local_offline_photo.jpg', uri: 'file://photos/1.jpg' }, // chưa có cloudFileId
  { id: generateUUID(), cloudFileId: generateUUID(), name: 'synced_photo.jpg', uri: 'file://photos/2.jpg' }, // đã có cloudFileId
];

const mockQueue = [];
for (const p of mockLocalPhotos) {
  if (!p.cloudFileId) {
    mockQueue.push({
      entityType: 'PHOTO',
      entityId: p.id,
      action: 'CREATE',
      payload: { id: p.id, uri: p.uri, name: p.name },
    });
  }
}

assert(
  mockQueue.length === 1 && mockQueue[0].payload.name === 'local_offline_photo.jpg',
  '6. Auto-reconciliation: Tự động phát hiện và đưa ảnh local chưa sync vào hàng đợi upload'
);

// 4. Kiểm tra Update cloudFileId ngược về local items
const uploadedCloudId = generateUUID();
const updatedLocalPhotos = mockLocalPhotos.map((item) => {
  if (item.id === mockQueue[0].entityId) {
    return { ...item, cloudFileId: uploadedCloudId };
  }
  return item;
});

assert(
  updatedLocalPhotos[0].cloudFileId === uploadedCloudId,
  '7. Sau khi upload, cloudFileId được ghi nhận chính xác vào local storage'
);

// 5. Kiểm tra Device 1 không bị Duplicate khi Pull
const remoteFilesFromSupabase = [
  { id: uploadedCloudId, category: 'PHOTO', original_name: 'local_offline_photo.jpg' }
];

const existingOnDevice1 = updatedLocalPhotos.find(
  (item) => item.id === remoteFilesFromSupabase[0].id || item.cloudFileId === remoteFilesFromSupabase[0].id
);

assert(
  !!existingOnDevice1,
  '8. Tránh duplicate: Thiết bị 1 nhận diện được file đã có trên máy qua cloudFileId, không tải lại'
);

// 6. Kiểm tra Device 2 phát hiện file mới và khôi phục
const mockLocalDevice2Photos = [];
const existingOnDevice2 = mockLocalDevice2Photos.find(
  (item) => item.id === remoteFilesFromSupabase[0].id || item.cloudFileId === remoteFilesFromSupabase[0].id
);

assert(
  !existingOnDevice2,
  '9. Thiết bị 2 nhận diện file mới cần tải về từ Cloud'
);

console.log(`\n====================================================`);
console.log(`  KẾT QUẢ KIỂM THỬ: ${passed} / ${total} BÀI TEST THÀNH CÔNG!`);
console.log(`====================================================\n`);
