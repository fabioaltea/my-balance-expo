export async function statementFileSize(uri: string): Promise<number> {
  if (!/^(?:blob:|data:)/.test(uri)) throw new Error('Selezionare un documento locale.');
  const response = await fetch(uri);
  return (await response.blob()).size;
}

export function releaseStatementFile(uri: string): void {
  if (uri.startsWith('blob:')) URL.revokeObjectURL(uri);
}
