import * as FileSystem from 'expo-file-system/legacy';

export async function statementFileSize(uri: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists || info.isDirectory) throw new Error('File locale non disponibile.');
  return info.size;
}

export async function releaseStatementFile(uri: string): Promise<void> {
  // Only document-picker copies inside its dedicated cache directory are owned here.
  const cache = FileSystem.cacheDirectory;
  if (cache && uri.startsWith(`${cache}DocumentPicker/`) && !uri.includes('/../')) {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  }
}
