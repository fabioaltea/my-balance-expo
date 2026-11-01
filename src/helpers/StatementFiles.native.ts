import { File, Paths } from 'expo-file-system';

export function statementFileSize(uri: string): number {
  return new File(uri).size;
}

export function releaseStatementFile(uri: string): void {
  // Never delete originals outside the app's temporary cache.
  if (uri.startsWith(Paths.cache.uri)) {
    const file = new File(uri);
    if (file.exists) file.delete();
  }
}
