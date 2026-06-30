import * as FileSystem from 'expo-file-system';
import { generateId } from '../utils/helpers';

const PHOTO_DIRECTORY = `${FileSystem.documentDirectory}hidder/photos/`;

export const ensureVaultDirectories = async () => {
  const directoryInfo = await FileSystem.getInfoAsync(PHOTO_DIRECTORY);

  if (!directoryInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTO_DIRECTORY, { intermediates: true });
  }
};

export const importPhotoToVault = async (asset) => {
  await ensureVaultDirectories();

  const extension = asset?.mimeType?.split('/')[1] || asset?.uri?.split('.').pop() || 'jpg';
  const fileName = `${generateId()}.${extension}`;
  const destination = `${PHOTO_DIRECTORY}${fileName}`;

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
