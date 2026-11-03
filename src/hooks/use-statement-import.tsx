import React, { useCallback, useEffect, useState } from 'react';
import { Modal, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAuthContext } from '@/src/state';
import { useThemeColor } from '@/src/hooks/use-theme-color';
import StatementImportView, { type InitialStatementRead } from '@/src/views/statement-import-view';
import { readStatement, MAX_STATEMENT_BYTES } from '@/src/helpers/StatementReader';
import { releaseStatementFile, statementFileSize } from '@/src/helpers/StatementFiles';

export function useStatementImport() {
  const { selectedSpreadsheetId } = useAuthContext();
  const backgroundColor = useThemeColor({ light: '#F6F8F6', dark: '#1D211F' }, 'background');
  const borderColor = useThemeColor(
    { light: 'rgba(23,38,31,0.11)', dark: 'rgba(255,255,255,0.11)' },
    'cardBorder',
  );
  const { width, height } = useWindowDimensions();
  const [statementImport, setStatementImport] = useState<{
    read: InitialStatementRead;
    controller: AbortController;
    spreadsheetId: string;
    fileName: string;
  } | null>(null);
  useEffect(
    () => () => statementImport?.controller.abort(),
    [statementImport, selectedSpreadsheetId],
  );
  const openStatementImport = useCallback(async () => {
    const showError = (error: string) =>
      setStatementImport({
        read: Promise.resolve({ error }),
        controller: new AbortController(),
        spreadsheetId: selectedSpreadsheetId || '',
        fileName: '',
      });
    if (!selectedSpreadsheetId) {
      showError('Seleziona un foglio di lavoro prima di scegliere il documento.');
      return;
    }
    try {
      const picked = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        base64: false,
      });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      const controller = new AbortController();
      const read: InitialStatementRead = (async () => {
        try {
          if ((asset.size ?? (await statementFileSize(asset.uri))) > MAX_STATEMENT_BYTES) {
            throw new Error('Documento troppo grande: massimo 25 MB.');
          }
          const pdf =
            asset.mimeType === 'application/pdf' || /\.pdf$/i.test(asset.name || asset.uri);
          return { data: await readStatement(asset.uri, pdf, undefined, controller.signal) };
        } catch (error) {
          return { error: error instanceof Error ? error.message : 'Lettura non riuscita.' };
        } finally {
          try {
            await releaseStatementFile(asset.uri);
          } catch {
            /* Best effort for the browser blob. */
          }
        }
      })();
      setStatementImport({
        read,
        controller,
        spreadsheetId: selectedSpreadsheetId,
        fileName: asset.name || 'Estratto conto',
      });
    } catch {
      showError('Impossibile aprire il selettore di documenti. Riprova dalla dashboard.');
    }
  }, [selectedSpreadsheetId]);
  const statementImportModal = (
    <Modal
      visible={!!statementImport && statementImport.spreadsheetId === (selectedSpreadsheetId || '')}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={[styles.overlay, { padding: width < 760 ? 8 : 24 }]}>
        <View
          style={[
            styles.dialog,
            { backgroundColor, borderColor, maxHeight: height - (width < 760 ? 16 : 48) },
          ]}
          accessibilityViewIsModal
        >
          {statementImport && statementImport.spreadsheetId === (selectedSpreadsheetId || '') && (
            <StatementImportView
              spreadsheetId={statementImport.spreadsheetId}
              initialRead={statementImport.read}
              initialFileName={statementImport.fileName}
              onClose={() => {
                statementImport.controller.abort();
                setStatementImport(null);
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
  return { openStatementImport, statementImportModal };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(8, 14, 11, 0.5)',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 1040,
    height: '94%',
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    boxShadow: '0 24px 80px rgba(8,14,11,0.22)',
  },
});
