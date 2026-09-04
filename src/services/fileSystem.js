import * as FileSystem from 'expo-file-system';
import { generateId } from '../utils/helpers';

export const VAULT_DIRS = {
  photos: `${FileSystem.documentDirectory}hidder/photos/`,
  videos: `${FileSystem.documentDirectory}hidder/videos/`,
  documents: `${FileSystem.documentDirectory}hidder/documents/`,
  audios: `${FileSystem.documentDirectory}hidder/audios/`,
};

export const ensureVaultDirectories = async () => {
  for (const dir of Object.values(VAULT_DIRS)) {
    const dirInfo = await FileSystem.getInfoAsync(dir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    }
  }
};

export const importPhotoToVault = async (asset) => {
  await ensureVaultDirectories();

  const extension = asset?.mimeType?.split('/')[1] || asset?.uri?.split('.').pop() || 'jpg';
  const fileName = `${generateId()}.${extension}`;
  const destination = `${VAULT_DIRS.photos}${fileName}`;

  await FileSystem.copyAsync({
    from: asset.uri,
    to: destination,
  });

  const info = await FileSystem.getInfoAsync(destination, { size: true });

  return {
    id: generateId(),
    uri: destination,
    name: asset.fileName || fileName,
    mimeType: asset.mimeType || 'image/jpeg',
    size: info.size || 0,
    createdAt: new Date().toISOString(),
  };
};

export const importVideoToVault = async (asset) => {
  await ensureVaultDirectories();

  const extension = asset?.uri?.split('.').pop() || 'mp4';
  const fileName = `${generateId()}.${extension}`;
  const destination = `${VAULT_DIRS.videos}${fileName}`;

  await FileSystem.copyAsync({
    from: asset.uri,
    to: destination,
  });

  const info = await FileSystem.getInfoAsync(destination, { size: true });

  return {
    id: generateId(),
    uri: destination,
    name: asset.fileName || `Video_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}`,
    mimeType: asset.mimeType || 'video/mp4',
    size: info.size || asset.fileSize || 0,
    duration: asset.duration ? Math.round(asset.duration / 1000) : null,
    createdAt: new Date().toISOString(),
  };
};

export const importDocumentToVault = async (doc) => {
  await ensureVaultDirectories();

  const extension = doc.name?.split('.').pop() || 'dat';
  const fileName = `${generateId()}.${extension}`;
  const destination = `${VAULT_DIRS.documents}${fileName}`;

  await FileSystem.copyAsync({
    from: doc.uri,
    to: destination,
  });

  const info = await FileSystem.getInfoAsync(destination, { size: true });

  return {
    id: generateId(),
    uri: destination,
    name: doc.name || fileName,
    mimeType: doc.mimeType || 'application/octet-stream',
    size: info.size || doc.size || 0,
    createdAt: new Date().toISOString(),
  };
};

export const saveAudioToVault = async (tempUri, customName = '') => {
  await ensureVaultDirectories();

  const fileName = `${generateId()}.m4a`;
  const destination = `${VAULT_DIRS.audios}${fileName}`;

  await FileSystem.copyAsync({
    from: tempUri,
    to: destination,
  });

  const info = await FileSystem.getInfoAsync(destination, { size: true });

  return {
    id: generateId(),
    uri: destination,
    name: customName || `Ghi_am_${new Date().toLocaleTimeString('vi-VN').replace(/:/g, '-')}`,
    size: info.size || 0,
    createdAt: new Date().toISOString(),
  };
};
