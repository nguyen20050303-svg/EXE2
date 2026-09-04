import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateId } from '../utils/helpers';
import { supabase } from './supabase';

const STORAGE_KEYS = {
  publicNotes: 'hidder.public-notes',
  privateNotes: 'hidder.private-notes',
  decoyNotes: 'hidder.decoy-notes',
  photoItems: 'hidder.photo-items',
  videoItems: 'hidder.video-items',
  documentItems: 'hidder.document-items',
  passwordItems: 'hidder.password-items',
  voiceItems: 'hidder.voice-items',
  seedVersion: 'hidder.seed-version',
  lastSyncTime: 'hidder.last-sync-time',
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

// =======================
// SUPABASE SYNC HELPERS
// =======================

export const pushNoteToSupabase = async (note, type = 'public') => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      return;
    }

    const { error } = await supabase.from('notes').upsert(
      {
        id: note.id,
        title: note.title,
        content: note.content,
        type: type,
        user_id: userId,
        updated_at: note.updatedAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn(`Lỗi đẩy note (${type}) lên Supabase:`, error.message);
    }
  } catch (err) {
    console.warn('Lỗi mạng khi sync note lên Supabase (hoạt động offline):', err.message);
  }
};

export const pushPhotoToSupabase = async (photo) => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id;
    if (!userId) {
      return;
    }

    const { error } = await supabase.from('photos').upsert(
      {
        id: photo.id,
        name: photo.name,
        url: photo.uri,
        size: photo.size || 0,
        user_id: userId,
        created_at: photo.createdAt || new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      console.warn('Lỗi đẩy photo lên Supabase:', error.message);
    }
  } catch (err) {
    console.warn('Lỗi mạng khi sync photo lên Supabase (hoạt động offline):', err.message);
  }
};

export const syncAllWithSupabase = async () => {
  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;

    if (!user) {
      return {
        success: false,
        error: 'Bạn chưa đăng nhập. Vui lòng vào mục "Tài khoản Cloud" để đăng nhập trước khi đồng bộ.',
      };
    }

    // 1. Đọc dữ liệu local hiện tại
    const [publicLocal, privateLocal, decoyLocal, photoLocal] = await Promise.all([
      readJson(STORAGE_KEYS.publicNotes, []),
      readJson(STORAGE_KEYS.privateNotes, []),
      readJson(STORAGE_KEYS.decoyNotes, []),
      readJson(STORAGE_KEYS.photoItems, []),
    ]);

    // 2. Đẩy các ghi chú local lên Supabase gắn với user_id
    const allLocalNotesToPush = [
      ...publicLocal.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: 'public',
        user_id: user.id,
        updated_at: n.updatedAt,
      })),
      ...privateLocal.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: 'private',
        user_id: user.id,
        updated_at: n.updatedAt,
      })),
      ...decoyLocal.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content,
        type: 'decoy',
        user_id: user.id,
        updated_at: n.updatedAt,
      })),
    ];

    if (allLocalNotesToPush.length > 0) {
      const { error: pushNotesErr } = await supabase
        .from('notes')
        .upsert(allLocalNotesToPush, { onConflict: 'id' });
      if (pushNotesErr) throw pushNotesErr;
    }

    if (photoLocal.length > 0) {
      const allPhotosToPush = photoLocal.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.uri,
        size: p.size || 0,
        user_id: user.id,
        created_at: p.createdAt || new Date().toISOString(),
      }));
      const { error: pushPhotosErr } = await supabase
        .from('photos')
        .upsert(allPhotosToPush, { onConflict: 'id' });
      if (pushPhotosErr) throw pushPhotosErr;
    }

    // 3. Tải dữ liệu mới nhất từ Supabase về (theo user_id)
    const { data: remoteNotes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('user_id', user.id);
    if (notesError) throw notesError;

    const { data: remotePhotos, error: photosError } = await supabase
      .from('photos')
      .select('*')
      .eq('user_id', user.id);
    if (photosError) throw photosError;

    // 4. Hợp nhất (Merge) dữ liệu Supabase vào local
    if (remoteNotes && remoteNotes.length > 0) {
      const mergeNotes = (localList, targetType) => {
        const matchingRemote = remoteNotes.filter((n) => n.type === targetType);
        const map = new Map();
        localList.forEach((item) => map.set(item.id, item));

        matchingRemote.forEach((rem) => {
          const item = {
            id: rem.id,
            title: rem.title,
            content: rem.content,
            updatedAt: rem.updated_at || rem.created_at || new Date().toISOString(),
          };

          if (!map.has(rem.id)) {
            map.set(rem.id, item);
          } else {
            const existing = map.get(rem.id);
            if (new Date(item.updatedAt) > new Date(existing.updatedAt)) {
              map.set(rem.id, item);
            }
          }
        });

        return Array.from(map.values()).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      };

      const nextPublic = mergeNotes(publicLocal, 'public');
      const nextPrivate = mergeNotes(privateLocal, 'private');
      const nextDecoy = mergeNotes(decoyLocal, 'decoy');

      await Promise.all([
        writeJson(STORAGE_KEYS.publicNotes, nextPublic),
        writeJson(STORAGE_KEYS.privateNotes, nextPrivate),
        writeJson(STORAGE_KEYS.decoyNotes, nextDecoy),
      ]);
    }

    if (remotePhotos && remotePhotos.length > 0) {
      const map = new Map();
      photoLocal.forEach((p) => map.set(p.id, p));

      remotePhotos.forEach((rem) => {
        if (!map.has(rem.id)) {
          map.set(rem.id, {
            id: rem.id,
            name: rem.name,
            uri: rem.url,
            size: Number(rem.size) || 0,
            createdAt: rem.created_at || new Date().toISOString(),
          });
        }
      });

      const nextPhotos = Array.from(map.values()).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      await writeJson(STORAGE_KEYS.photoItems, nextPhotos);
    }

    const timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    await AsyncStorage.setItem(STORAGE_KEYS.lastSyncTime, timestamp);

    return {
      success: true,
      timestamp,
      totalNotes: remoteNotes ? remoteNotes.length : 0,
      totalPhotos: remotePhotos ? remotePhotos.length : 0,
    };
  } catch (error) {
    console.warn('Lỗi khi đồng bộ Supabase:', error);
    return { success: false, error: error.message };
  }
};

export const getLastSyncTime = async () => {
  return AsyncStorage.getItem(STORAGE_KEYS.lastSyncTime);
};

// =======================
// LOCAL DATA ACCESSORS
// =======================

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

  // Khởi động đồng bộ nền lần đầu
  void syncAllWithSupabase();
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

  // Background sync sang Supabase mà không chặn giao diện
  void pushNoteToSupabase(note, 'public');

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

  // Background sync sang Supabase mà không chặn giao diện
  void pushNoteToSupabase(note, mode === 'decoy' ? 'decoy' : 'private');

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

  // Background sync metadata ảnh lên Supabase
  void pushPhotoToSupabase(next[0]);

  return next[0];
};

export const getVaultSummary = async (mode = 'real') => {
  const [notes, photos, videos, passwords, documents, voices] = await Promise.all([
    getVaultNotes(mode),
    mode === 'real' ? getPhotoItems() : Promise.resolve([]),
    mode === 'real' ? getVideoItems() : Promise.resolve([]),
    mode === 'real' ? getPasswordItems() : Promise.resolve([]),
    mode === 'real' ? getDocumentItems() : Promise.resolve([]),
    mode === 'real' ? getVoiceItems() : Promise.resolve([]),
  ]);

  return {
    noteCount: notes.length,
    photoCount: photos.length,
    videoCount: videos.length,
    passwordCount: passwords.length,
    documentCount: documents.length,
    voiceCount: voices.length,
    recentNotes: notes.slice(0, 3),
  };
};

// =======================
// VIDEOS
// =======================
export const getVideoItems = async () => {
  const videos = await readJson(STORAGE_KEYS.videoItems, []);
  return videos.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const addVideoItem = async (video) => {
  const existing = await getVideoItems();
  const next = [{ ...video, id: video.id || generateId() }, ...existing];
  await writeJson(STORAGE_KEYS.videoItems, next);
  return next[0];
};

export const deleteVideoItem = async (id) => {
  const existing = await getVideoItems();
  const next = existing.filter((item) => item.id !== id);
  await writeJson(STORAGE_KEYS.videoItems, next);
  return next;
};

// =======================
// PASSWORDS & CARDS
// =======================
export const getPasswordItems = async () => {
  const items = await readJson(STORAGE_KEYS.passwordItems, []);
  return items.sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
};

export const savePasswordItem = async (item) => {
  const existing = await getPasswordItems();
  const index = existing.findIndex((i) => i.id === item.id);
  const updatedItem = {
    ...item,
    id: item.id || generateId(),
    updatedAt: new Date().toISOString(),
  };

  let next;
  if (index >= 0) {
    next = [...existing];
    next[index] = updatedItem;
  } else {
    next = [updatedItem, ...existing];
  }
  await writeJson(STORAGE_KEYS.passwordItems, next);
  return updatedItem;
};

export const deletePasswordItem = async (id) => {
  const existing = await getPasswordItems();
  const next = existing.filter((item) => item.id !== id);
  await writeJson(STORAGE_KEYS.passwordItems, next);
  return next;
};

// =======================
// DOCUMENTS
// =======================
export const getDocumentItems = async () => {
  const docs = await readJson(STORAGE_KEYS.documentItems, []);
  return docs.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const addDocumentItem = async (doc) => {
  const existing = await getDocumentItems();
  const next = [{ ...doc, id: doc.id || generateId() }, ...existing];
  await writeJson(STORAGE_KEYS.documentItems, next);
  return next[0];
};

export const deleteDocumentItem = async (id) => {
  const existing = await getDocumentItems();
  const next = existing.filter((item) => item.id !== id);
  await writeJson(STORAGE_KEYS.documentItems, next);
  return next;
};

// =======================
// VOICE MEMOS
// =======================
export const getVoiceItems = async () => {
  const voices = await readJson(STORAGE_KEYS.voiceItems, []);
  return voices.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
};

export const addVoiceItem = async (voice) => {
  const existing = await getVoiceItems();
  const next = [{ ...voice, id: voice.id || generateId() }, ...existing];
  await writeJson(STORAGE_KEYS.voiceItems, next);
  return next[0];
};

export const deleteVoiceItem = async (id) => {
  const existing = await getVoiceItems();
  const next = existing.filter((item) => item.id !== id);
  await writeJson(STORAGE_KEYS.voiceItems, next);
  return next;
};

