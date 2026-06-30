import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/helpers';

const STORAGE_KEYS = {
  publicNotes: 'hidder.public-notes',
  privateNotes: 'hidder.private-notes',
  decoyNotes: 'hidder.decoy-notes',
  photoItems: 'hidder.photo-items',
  seedVersion: 'hidder.seed-version',
};

const harmlessDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
};

const DEFAULT_PUBLIC_NOTES = [
  {
    id: generateId(),
    title: 'Danh sách việc làm tuần này',
    content: 'Mua đồ ăn, gọi điện cho mẹ, hoàn thành báo cáo tháng, đặt lịch cắt tóc.',
    updatedAt: harmlessDate(0),
  },
  {
    id: generateId(),
    title: 'Ý tưởng caption du lịch',
    content: 'Biển luôn là nơi chữa lành tốt nhất cho một tuần quá tải.',
    updatedAt: harmlessDate(1),
  },
  {
    id: generateId(),
    title: 'Checklist đồ đi công tác',
    content: 'Sạc laptop, áo sơ mi, tai nghe, passport, thẻ ngân hàng phụ.',
    updatedAt: harmlessDate(3),
  },
  {
    id: generateId(),
    title: 'Gợi ý quà sinh nhật',
    content: 'Nước hoa mini, móc khóa da, sách ảnh hoặc vé xem phim cuối tuần.',
    updatedAt: harmlessDate(6),
  },
];

const DEFAULT_DECOY_NOTES = [
  {
    id: generateId(),
    title: 'Kế hoạch học tiếng Anh',
    content: 'Mỗi ngày 20 phút nghe podcast, 10 từ mới và 1 đoạn viết ngắn.',
    updatedAt: harmlessDate(1),
  },
  {
    id: generateId(),
    title: 'Ảnh phong cảnh cần lưu',
    content: 'Chọn các ảnh núi, biển và cà phê để làm hình nền cuối tuần.',
    updatedAt: harmlessDate(4),
  },
];

const DEFAULT_PRIVATE_NOTES = [];
const DEFAULT_PHOTOS = [];

const readJson = async (key, fallback) => {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch (error) {
    console.error(`Lỗi đọc storage ${key}:`, error);
    return fallback;
  }
};

const writeJson = async (key, value) => {
  await AsyncStorage.setItem(key, JSON.stringify(value));
};

export const ensureSeedData = async () => {
  const currentSeedVersion = await AsyncStorage.getItem(STORAGE_KEYS.seedVersion);

  if (currentSeedVersion === 'v2') {
    return;
  }

  const [publicExisting, decoyExisting, privateExisting, photoExisting] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.publicNotes),
    AsyncStorage.getItem(STORAGE_KEYS.decoyNotes),
    AsyncStorage.getItem(STORAGE_KEYS.privateNotes),
    AsyncStorage.getItem(STORAGE_KEYS.photoItems),
  ]);

  await Promise.all([
    publicExisting ? Promise.resolve() : writeJson(STORAGE_KEYS.publicNotes, DEFAULT_PUBLIC_NOTES),
    decoyExisting ? Promise.resolve() : writeJson(STORAGE_KEYS.decoyNotes, DEFAULT_DECOY_NOTES),
    privateExisting ? Promise.resolve() : writeJson(STORAGE_KEYS.privateNotes, DEFAULT_PRIVATE_NOTES),
    photoExisting ? Promise.resolve() : writeJson(STORAGE_KEYS.photoItems, DEFAULT_PHOTOS),
  ]);

  await AsyncStorage.setItem(STORAGE_KEYS.seedVersion, 'v2');
};

export const getPublicNotes = async () => {
  const notes = await readJson(STORAGE_KEYS.publicNotes, DEFAULT_PUBLIC_NOTES);
  return notes.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
};

export const createPublicNote = async ({ title, content }) => {
  const existing = await getPublicNotes();
  const note = {
    id: generateId(),
    title: title.trim(),
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  };

  const next = [note, ...existing];
  await writeJson(STORAGE_KEYS.publicNotes, next);
  return note;
};

export const searchPublicNotes = async (query) => {
  const normalizedQuery = query.trim().toLowerCase();
  const notes = await getPublicNotes();

  if (!normalizedQuery) {
    return notes;
  }

  return notes.filter((note) => {
    const haystack = `${note.title} ${note.content}`.toLowerCase();
    return haystack.includes(normalizedQuery);
  });
};

const keyByMode = (mode) => (mode === 'decoy' ? STORAGE_KEYS.decoyNotes : STORAGE_KEYS.privateNotes);

export const getVaultNotes = async (mode = 'real') => {
  const key = keyByMode(mode);
  const fallback = mode === 'decoy' ? DEFAULT_DECOY_NOTES : DEFAULT_PRIVATE_NOTES;
  const notes = await readJson(key, fallback);
  return notes.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
};

export const createVaultNote = async (mode = 'real', { title, content }) => {
  const existing = await getVaultNotes(mode);
  const note = {
    id: generateId(),
    title: title.trim(),
    content: content.trim(),
    updatedAt: new Date().toISOString(),
  };

  const next = [note, ...existing];
  await writeJson(keyByMode(mode), next);
  return note;
};

export const getPhotoItems = async () => {
  const photos = await readJson(STORAGE_KEYS.photoItems, DEFAULT_PHOTOS);
  return photos.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const addPhotoItem = async (photo) => {
  const existing = await getPhotoItems();
  const next = [{ ...photo, id: photo.id || generateId() }, ...existing];
  await writeJson(STORAGE_KEYS.photoItems, next);
  return next[0];
};

export const getVaultSummary = async (mode = 'real') => {
  const [notes, photos] = await Promise.all([getVaultNotes(mode), getPhotoItems()]);

  return {
    noteCount: notes.length,
    photoCount: mode === 'real' ? photos.length : 0,
    recentNotes: notes.slice(0, 3),
  };
};
