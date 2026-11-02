# Importazione locale degli estratti conto

Base: `dev/main`. Obiettivo: estratti mensili e annuali, senza inviare documenti
o testo OCR a un servizio di interpretazione.

## Piano

1. **Acquisizione locale**: PDF, immagini e fotocamera; limiti espliciti di dimensione
   e pagine. PDF digitali letti direttamente; pagine scansionate rasterizzate e
   riconosciute sul dispositivo. Web: PDF.js e Tesseract con asset self-hosted;
   iOS/Android: estrazione PDF nativa e OCR on-device.
2. **Parser condiviso e prudente**: date reali, importi in centesimi, segno,
   data operazione/valuta, descrizioni su piu righe. Non eliminare righe uguali:
   possono essere acquisti distinti. Segnalare righe non interpretabili, saldi,
   colonne multiple e direzioni incerte invece di inventare dati.
3. **Revisione**: suggerire il conto solo da un nome univoco nell'intestazione;
   conferma obbligatoria (il modello Account non contiene IBAN). Mostrare intervallo
   rilevato, avvisi, righe modificabili, esclusione e scelta entrata/uscita.
4. **Riconciliazione locale**: caricare tutte le transazioni aggiornate, non solo
   il mese visibile. Confrontare conto, direzione, centesimi e data; collegamento
   automatico solo per corrispondenze esatte univoche in entrambe le direzioni.
   Proporre corrispondenze entro tre giorni, senza confermarle automaticamente.
   Escludere template ricorrenti, eliminati e occorrenze ignorate.
5. **Conferma e persistenza**: inviare all'API solo i normali movimenti mancanti
   approvati, conservando le transazioni collegate senza modificarle. Diario
   locale minimale (hash e ID, non testo/documento) per collegamenti e stato delle
   scritture. Rileggere prima del salvataggio; fermarsi in caso di dati cambiati,
   errori o esito incerto. Nessun retry automatico di POST incerti.
6. **Integrazione e verifica**: sostituire entrambi gli import immediati (home e
   desktop); test parser, riconciliazione, errori, reimport, privacy e adapter OCR;
   controllo TypeScript/lint e bundle web. Verifiche native su development build.

## Scelte e confini

- Nessun mini-LLM nella prima versione: OCR piu regole verificabili riduce risorse,
  allucinazioni e superficie di esposizione. Non esiste fallback cloud.
- EUR, date con anno a due/quattro cifre, layout a una colonna importo e tabelle
  con colonne etichettate Addebiti/Accrediti, Dare/Avere o Uscite/Entrate.
  Le coordinate determinano la direzione; il saldo progressivo resta escluso.
  Colonne non riconosciute o entrambe valorizzate richiedono verifica manuale.
- Il periodo mostrato e l'intervallo dei movimenti estratti, non una garanzia di
  completezza dell'estratto. L'utente deve confrontare avvisi e documento originale.
- PDF protetti devono essere esportati senza password prima dell'importazione.
- Nessun nuovo endpoint/backend necessario. Il diario dei collegamenti rimane
  su questo dispositivo; gli altri dispositivi riconciliano dai movimenti salvati.
  Senza idempotenza/operazione atomica lato API non si puo garantire exactly-once
  tra dispositivi concorrenti. Un POST di esito incerto viene bloccato, non ritentato.
- Bozza e testo OCR solo in memoria. Le copie temporanee create dall'app vengono
  eliminate dopo la lettura; foto originali e documenti dell'utente non sono cancellati.
- Il motore locale non comporta che l'intera app sia offline: autenticazione,
  lettura delle transazioni e salvataggio continuano a usare l'API esistente.
- Conto proposto da nome/banca solo se univoco. Dopo conferma esplicita, un IBAN
  valido viene associato al conto sul dispositivo: chiave SHA-256 per utente,
  spreadsheet e IBAN, valore accountId. Il testo OCR e l'IBAN non sono persistiti.

## Criteri di accettazione

- Nessuna scrittura prima della conferma del conto e della revisione.
- Un movimento gia presente non viene duplicato; candidati multipli e date vicine
  richiedono una decisione, inclusi acquisti identici nello stesso giorno.
- Un errore di lettura API non equivale a elenco vuoto; una scrittura fallita non
  viene conteggiata come riuscita e non provoca retry automatici.
- PDF digitali/scansionati, immagini, estratti annuali, cambio anno, date invalide,
  importi italiani/inglesi e import parziali coperti da test sintetici.
- Documenti, IBAN, OCR e descrizioni non vengono scritti nei log dell'import.
- Rilascio nativo subordinato a compilazione iOS/Android e prova su dispositivo
  (PDF multipagina, rotazione foto, permessi negati, memoria e interruzione).

## Aggiornamento del 2026-11-02

Sono stati aggiunti inserimento manuale, protezione dei candidati condivisi,
validazione prudente degli importi API, separazione fra pagine e test sintetici.
Lint mirato e nove test passano; export web riuscito con Node 26. Autolinking
rileva il modulo su entrambe le piattaforme. Restano necessari test browser reali,
compilazione e prove su dispositivi, verifica dei casi OCR e import parziale end
to end. I criteri di rilascio sopra non sono ancora tutti soddisfatti.
