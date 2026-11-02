# Passaggio a Codex: importazione locale estratti conto

Checkpoint del 2026-11-01. **Implementazione interrotta su richiesta dell'utente;
WIP, non pronta per il rilascio.** Non considerare il commit una funzionalita
completata o validata end-to-end.

## Richiesta e base

L'utente vuole importare estratti conto mensili/annuali da PDF o foto, riconoscere
il conto, estrarre movimenti, collegare quelli gia tracciati per data/importo e
salvare i mancanti. Elaborazione locale, senza inviare documento o testo OCR a
un'API di ragionamento.

- Branch di lavoro: `feat/local-statement-import`.
- Creato da `origin/dev/main`, commit base
  `60e991d0744587b0f266d404509bc0df9ccd9364`.
- Piano dettagliato: `STATEMENT_IMPORT_PLAN.md`.
- Ultima richiesta: mettere in pausa, scrivere questo passaggio e committare
  quanto fatto. Nessuna PR aperta; questo checkpoint non richiede push.

## Stato effettivo dei file

| Area | File | Implementazione presente |
| --- | --- | --- |
| Parser | `src/helpers/StatementParser.ts` | Parser condiviso, date validate, importi EUR, segni espliciti, seconda data valuta, descrizioni multilinea, avvisi e suggerimento conto per nome univoco. |
| Riconciliazione | `src/helpers/StatementReconciliation.ts` | Confronto conto/direzione/centesimi/data; candidati entro tre giorni; collegamenti esatti univoci; decisioni auto/crea/escludi/collega. |
| Servizio | `src/helpers/StatementImportService.ts` | Lettura aggiornata prima del salvataggio; controllo firma della riconciliazione; POST sequenziali dei mancanti; diario AsyncStorage con hash e ID; blocco locale per import simultanei. |
| Lettura web | `src/helpers/StatementReader.web.ts` | PDF.js self-hosted; estrazione testo posizionale; fallback OCR Tesseract per pagine senza movimenti riconosciuti; worker e canvas rilasciati. |
| Lettura nativa | `src/helpers/StatementReader.native.ts` | Estrazione PDF pagina per pagina; ML Kit per immagini; fallback PDF al nuovo modulo locale. |
| Modulo nativo | `modules/statement-pdf/` | Swift PDFKit/Vision e Kotlin PdfRenderer/ML Kit; ricostruzione delle righe da bounding box; codice non compilato. |
| File temporanei | `src/helpers/StatementFiles.native.ts`, `.web.ts` | Limite dimensione e rilascio copie locali/blob; adapter nativo con errori TypeScript da risolvere. |
| UI | `src/views/statement-import-view.tsx` | Selezione PDF/immagini, fotocamera e galleria; revisione modificabile; conferma conto; candidati; conferma salvataggio; stato di avanzamento. |
| Route | `app/import-statement.tsx`, `app/_layout.tsx` | Schermata condivisa, azzerata al cambio spreadsheet tramite key. |
| Ingressi | `app/dashboard/home.tsx`, `src/layout/landscape-layout.web.tsx` | Rimosso import immediato duplicato; navigazione alla nuova route. OCR scontrini esistente mantenuto. |
| Privacy POST | `src/helpers/HttpHelper.ts` | Opzione `sensitive` per evitare corpo e risposta sensibile nei log del POST import; rimosso log del payload anche dai normali POST. Da verificare tutti i percorsi di errore. |
| Asset | `scripts/prepare-ocr-assets.cjs`, `package.json`, `pnpm-lock.yaml`, `.gitignore` | PDF.js, lingue ita/eng, filesystem; postinstall copia asset in `public/ocr/`, ignorato da Git. |

**Importante:** l'ultima patch proposta per eliminare `OCRHelper.native.ts` e
`OCRHelper.web.ts` e creare `ReceiptParser.ts` e stata interrotta e NON applicata.
Entrambi gli OCRHelper originari esistono e sono invariati; `ReceiptParser.ts`
non esiste. Non assumere che sia gia stata eseguita una migrazione degli scontrini.
I vecchi parser estratti conto e il loader CDN restano negli OCRHelper, ma gli
ingressi dell'import estratti ora usano la nuova schermata. Decidere se rimuovere
solo il codice morto; preservare il comportamento degli scontrini.

## Verifiche eseguite al checkpoint

- Installazione riuscita con
  `npm exec --yes --package=pnpm@9.4.0 -- pnpm install --ignore-scripts`.
  Il comando `pnpm` non era disponibile direttamente; Node locale 26.12.1.
  Lockfile aggiornato. Installazione con script normali ancora da verificare.
- `node scripts/prepare-ocr-assets.cjs`: riuscito dopo correzione del percorso
  di risoluzione di `tesseract.js-core`, rieseguito con successo al checkpoint.
- `git diff --check`: riuscito.
- `./node_modules/.bin/tsc --noEmit --pretty false`: FALLITO.
  Errori nuovi in `src/helpers/StatementFiles.native.ts`:
  `File.size` (riga 4), `Paths.cache.uri` (riga 9), `File.exists` e
  `File.delete` (riga 11) non riconosciuti dai tipi installati.
  Indagare API Expo 58 e risoluzione tipi/moduli; non coprire con cast `any`.
- Errori TypeScript gia osservati prima di aggiungere adapter file e UI:
  `src/components/ui/context-menu.web.tsx:285` (`arrow-up-right`);
  `src/views/manage-view.web.tsx:682` e `src/views/map-view.web.tsx:670`
  (`overflowWrap`). Non corretti perche fuori scope.
- Lint mirato FALLITO:
  `./node_modules/.bin/eslint app/import-statement.tsx src/views/statement-import-view.tsx src/helpers/Statement*.ts scripts/prepare-ocr-assets.cjs`.
  Un `no-undef` per `__dirname` nello script; sei `react-hooks/refs` nella UI
  alle righe 161, 167, 168, 169, 192, 227 (callback passate al render helper
  `button`). Correggere struttura componente/handler senza disattivare
  indiscriminatamente le regole.
- Nessun test nuovo scritto. Lo script `test:statements` esiste, ma
  `tests/statement-*.test.cjs` non esiste ancora.
- Nessun export web, test browser, build iOS/Android o prova su dispositivo.
- Nessuna chiamata di import effettuata verso un backend reale.

## Priorita per proseguire

1. Risolvere i nuovi errori di tipi/lint e formattare solo i file modificati.
   Non proseguire dando per funzionanti UI e modulo nativo.
2. Scrivere test sintetici per parser, riconciliazione e servizio usando
   `tests/load-ts.cjs` e `node:test`, gia adottati nel repository.
3. Verificare i punti critici sotto; correggere prima delle prove con dati reali.
4. Verificare schema API, autolinking modulo locale e build native; esportare
   web e controllare rete/worker con documenti sintetici.
5. Aggiornare README, piano e questo documento con risultati effettivi; rimuovere
   gli avvisi WIP solo quando i criteri di accettazione sono soddisfatti.

## Rischi e questioni ancora aperte

Questi sono punti di revisione, non risultati di test gia eseguiti.

### Parser e completezza

- Non supporta genericamente colonne dare/avere o saldo progressivo: righe con
  piu importi vengono scartate con avviso. La UI non consente ancora di aggiungere
  a mano righe assenti, solo di modificare quelle estratte.
- Verificare importi spezzati, segni finali/parentesi, OCR per colonne, date isolate,
  footer/header, valute dichiarate nell'intestazione e righe con numeri nella
  descrizione. Non trasformare silenziosamente valute non EUR.
- Il fallback OCR e attivato quando una pagina non produce alcun movimento:
  PDF misti con parte digitale leggibile e altre righe scansionate nella stessa
  pagina possono richiedere una strategia diversa.
- Le pagine vengono concatenate prima del parsing; controllare che descrizioni
  e intestazioni non si contaminino ai confini pagina/documento.
- I nomi conto non contengono necessariamente dati presenti sull'estratto.
  `Account` non ha IBAN: selezione manuale obbligatoria se il suggerimento fallisce.
  L'intervallo mostrato e quello delle righe rilevate, non il periodo certificato.

### Riconciliazione e persistenza

- Testare rigorosamente transazioni identiche nello stesso giorno, candidati
  condivisi, link manuali duplicati, righe escluse e override "crea nuovo".
  Un candidato gia reclamato viene tolto dall'insieme disponibile: verificare
  che cio non classifichi automaticamente un'altra riga come sicuramente nuova.
- Il diario usa hash di spreadsheet/conto/data/descrizione/importo/direzione e
  numero di occorrenza. Verificare duplicati tra estratto mensile/annuale, ordine
  differente, descrizioni corrette e differenze OCR tra reimport.
- Il namespace include spreadsheet ma non identita utente; valutare isolamento,
  logout, pulizia e durata del diario. Non salvare OCR/documenti per compensare.
- `pending` viene scritto prima del POST. Un errore o interruzione puo lasciare
  una riga bloccata senza procedura UI di risoluzione: attualmente viene chiesto
  di verificarla/escluderla. Definire un recupero sicuro senza retry ciechi.
- Verificare il comportamento dopo errore parziale e aggiornamento dei dati:
  i contatori, link ripristinati e movimenti appena salvati devono essere coerenti.
- `fetchStatementTransactions` riusa `rawToTransactionData` (parser importi
  preesistente) e richiede identificatori stabili; testare payload reale con
  importi stringa/numero, status e risposta completa, senza fallback a lista vuota.
- Verificare che `/transactions` accetti il payload con array `transactions`
  gia usato dall'import precedente, che conservi `movementId` fornito e che
  `response.data` segnali davvero successo. Non e stato verificato sul backend.
- Nessuna modifica ai movimenti collegati; collegamenti persistenti solo locali.
  Senza idempotenza backend non esiste garanzia exactly-once tra dispositivi.

### UI, privacy e lifecycle

- Verificare navigazione indietro hardware/gesture durante un POST, cambio conto,
  cambio spreadsheet, unmount e cancellazione durante OCR. Il bottone Chiudi e
  bloccato durante salvataggio, ma questo non garantisce il blocco delle gesture.
- Alcune operazioni non sono interrompibili subito; il segnale viene verificato
  tra le fasi. Evitare aggiornamenti UI o scritture dopo cambio sessione.
- `reloadData()` nel finally del salvataggio richiede gestione esplicita dei
  fallimenti; non nascondere esiti parziali.
- Il limite e 25 MB per file, 150 pagine PDF, 30 immagini per selezione. Valutare
  memoria cumulativa e limiti reali per estratti annuali.
- Verificare che picker e camera restituiscano URI supportati e che vengano
  cancellate esclusivamente copie nella cache dell'app, mai originali utente.
- Verificare errori PDF protetti, retry caricamento asset, terminazione worker e
  attributi accessibilita. Testare camera web, native permissions e galleria.
- Gli asset sono self-hosted, ma il browser li deve caricare: non promettere
  disponibilita offline a freddo senza una strategia di caching verificata.
- Controllare richieste di rete e log: nessun PDF, testo OCR o intestazione deve
  raggiungere CDN/servizi AI. L'app continua a usare l'API per normali transazioni.

### Build e dipendenze

- `modules/statement-pdf` e un modulo Expo locale nuovo: verificare discovery,
  configurazione Gradle/Podspec, thread di esecuzione e compilazione Swift/Kotlin.
- iOS e tracciato nel repository: non fare clean prebuild che sovrascriva
  personalizzazioni. `ios/Podfile.lock` non e stato aggiornato per il nuovo modulo.
- Verificare configurazione camera per Android generato e permessi iOS.
- Verificare PDF.js globale `pdfjsLib`, percorso worker, core WASM e lingue in
  export Expo statico; nessuna di queste integrazioni e stata provata nel browser.
- `public/ocr` e generato e ignorato. Il deploy deve eseguire la preparazione;
  se installa con `--ignore-scripts`, eseguire lo script esplicitamente.
- Conservare lockfile, licenze degli asset e patch ML Kit preesistente.

## Matrice minima di test da aggiungere

- Date italiane e cambio anno, anni bisestili, date invalide, formato importi
  italiano/inglese, segni assenti e righe saldo escluse.
- Una/due date, multilinea, colonne multiple, immagini e PDF digitali/scansionati.
- Matching esatto, +/- tre giorni, conto/direzione errati, centesimi, status
  confirmed/unconfirmed contro recurrent/DELETED/dismissed, split movements.
- Candidati uno-a-molti e molti-a-uno; nessuna deduplicazione arbitraria delle righe.
- Reimport, overlap mensile/annuale, successo parziale, response lost, diario
  corrotto/non scrivibile, lista API fallita, dati cambiati prima del salvataggio.
- Nessun POST prima della conferma, nessun payload documento, errori senza dati
  sensibili, invalidazione cache dopo import.

Il checkpoint salva il lavoro per consentire la ripresa, non per distribuirlo.

## Ripresa del 2026-11-02

- Corretti gli errori dell'adapter file e il lint mirato; aggiunta riga manuale,
  blocco navigazione durante POST e gestione esplicita del fallimento di refresh.
- La riconciliazione richiede revisione quando un candidato e gia reclamato;
  importi API numerici e stringa vengono validati, la risposta POST deve confermare
  il movementId, e il log dei percorsi sensibili viene limitato. Le pagine sono
  separate nel parsing e valute non EUR riconosciute interrompono l'estrazione.
- Nove test sintetici (`node --test tests/statement-*.test.cjs`) e lint mirato
  passano. `pnpm install --frozen-lockfile` e postinstall riusciti; export web
  riuscito con Node 26. L'autolinking trova il modulo su iOS e Android.
- TypeScript globale presenta ancora gli errori preesistenti in context-menu,
  manage e map e i tipi route generati localmente non aggiornati per la nuova
  route. Non e stata effettuata una prova browser o su dispositivo, ne una prova
  con backend reale. I casi misti digitali/scansionati sulla stessa pagina,
  l'isolamento del diario per utente e il recupero guidato degli esiti incerti
  restano aperti. Il blocco WIP rimane valido.

- `pod install` riuscito e `ios/Podfile.lock` aggiornato per StatementPdf.
- Compilazione Android tentata sul progetto generato locale: fallisce prima del
  modulo per Gradle 8.14.3, mentre il plugin Android richiede almeno 9.4.1.
  La directory `android/` e ignorata: rigenerare/verificare la configurazione
  compatibile prima di ripetere la build e la prova su dispositivo.
- Compilazione mirata iOS avviata dopo l'installazione dei pod, poi interrotta
  durante la compilazione delle dipendenze React Native: esito non verificato.
- Corretto il caricamento OCR web: il modello italiano non cerca piu il file
  opzionale `ita.special-words`; PDF.js riceve `iccUrl` e i profili CMYK sono
  copiati con la relativa licenza. Undici test passano, inclusa inizializzazione
  Tesseract reale; export web riuscito e profilo ICC presente nell'export.

### Riconoscimento conto e direzione (2026-11-02)

- `StatementLayout.ts` conserva le coordinate delle parole, riconosce le colonne
  Addebiti/Accrediti, Dare/Avere e Uscite/Entrate anche invertite e assegna la
  direzione dalla colonna. Esclude totali e saldo, conserva descrizioni a cavallo
  pagina e richiede verifica per righe ambigue. Rimane il parser generico quando
  il layout non e riconosciuto: nessuna direzione inventata.
- `StatementAccount.ts` identifica banca e IBAN con checksum nell'intestazione;
  suggerisce solo un conto univoco. `StatementAccountMemory.ts` ricorda la scelta
  esplicitamente confermata con hash SHA-256 per utente/foglio/IBAN e accountId.
  IBAN, testo OCR e documento non vengono salvati nelle preferenze o nei test.
- La revisione mostra la banca e solo le ultime quattro cifre dell'IBAN. Il web
  usa la modale nella dashboard con selettore file diretto e stile condiviso.
- Verifica locale su campione Intesa fornito dall'utente: il lettore web completo
  legge 151 righe, 136 uscite e 15 entrate. Le somme di entrambe le direzioni
  coincidono con i rispettivi totali del PDF. Nessuna chiamata al backend; nessun
  campione reale aggiunto al repository, copie di estrazione temporanee rimosse.
- 23 test sintetici passano, lint mirato ed export web riusciti. TypeScript
  globale resta limitato dai tre errori preesistenti in context-menu/manage/map.
- Immagini native: coordinate ML Kit; PDF iOS: nuove parole PDFKit o Vision;
  Android: nuove parole ML Kit dal renderer PDF. Questi metodi del modulo locale
  richiedono una nuova build. Sintassi Swift verificata, compilazione completa
  Swift/Kotlin e prova su dispositivo ancora da eseguire. WIP rimane valido.

### Compatibilita delle transazioni esistenti (2026-11-02)

- La conferma conto verifica le righe del conto selezionato ed esclude prima i
  template ricorrenti, le occorrenze ignorate e le righe eliminate. Riconosce
  importi italiani/inglesi, segni finali o parentesi, date ISO e stato ACTIVE;
  valori incoerenti del conto scelto fermano ancora il salvataggio con un errore
  che identifica il campo, senza riprodurre dati sensibili.
- Gli identificativi ripetuti nei fogli esistenti non bloccano piu tutta la
  riconciliazione. Ogni riga duplicata conserva l'ID originale e riceve una chiave
  locale SHA-256 dei dati normalizzati piu occorrenza. Nessuna riga viene fusa o
  scartata. UI, confronto e diario usano la chiave locale; il journal legacy
  non ripristina automaticamente un collegamento se sono presenti piu candidati.
- 31 test sintetici e lint mirato passano. TypeScript non segnala nuovi errori
  nelle modifiche, restano quelli preesistenti in context-menu/manage/map.
- Le incoerenze fra segno e tipologia legacy non bloccano il caricamento:
  il segno esplicito prevale nella rappresentazione locale, mentre il candidato
  rimane disponibile per entrambe le direzioni e non e collegato automaticamente.
  La UI richiede verifica manuale e il diario ricorda questa conferma. Un conflitto
  comparso dopo la revisione invalida la conferma di salvataggio precedente.
  35 test sintetici passano; i dati originali non vengono modificati.
