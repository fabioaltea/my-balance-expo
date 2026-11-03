import React from 'react';
import { useAuthContext } from '@/src/state/AuthProvider';
import StatementImportView from '@/src/views/statement-import-view';

export default function ImportStatement() {
  const { selectedSpreadsheetId } = useAuthContext();
  return <StatementImportView key={selectedSpreadsheetId} spreadsheetId={selectedSpreadsheetId} />;
}
