# Presenze in servizio — Web App PWA

MVP mobile-first per digitalizzare il foglio aziendale di autocertificazione presenza.

## Cosa include
- Login lavoratore con codice + PIN
- Compilazione giornaliera con 2 fasce entrata/uscita
- Calcolo automatico ore giornaliere
- Note e conferma dichiarazione
- Storico del mese
- Area Responsabile: presenti/mancanti, filtro CDC, approvazione
- Generazione PDF mensile in Google Drive
- PWA installabile dal browser
- Frontend su GitHub Pages
- Backend Google Apps Script + Google Sheets

## 1. Crea il backend Google Apps Script
1. Vai su https://script.google.com e crea un nuovo progetto.
2. Copia il contenuto di `backend/Code.gs` nel file `Code.gs`.
3. Crea un secondo file `Setup.gs` e incolla `backend/Setup.gs`.
4. Salva.
5. Esegui manualmente `setupPresenze()` una sola volta e autorizza lo script.
6. Facoltativo: esegui `addDemoUsers()` per creare due utenti prova:
   - Lavoratore: `LEC001` / PIN `1234`
   - Responsabile: `RESP001` / PIN `5678`
7. Apri il Google Sheet creato e sostituisci gli utenti demo con quelli reali.

## 2. Pubblica il backend
1. Apps Script → **Distribuisci** → **Nuova distribuzione**.
2. Tipo: **App web**.
3. Esegui come: **Me**.
4. Accesso: **Chiunque** (oppure l'opzione equivalente disponibile nel tuo account).
5. Distribuisci e copia l'URL che termina con `/exec`.

> Attenzione: chiunque conosca l'URL può chiamare l'API, ma i dati sono protetti da login, token firmato e ruoli. Per uso aziendale reale è comunque consigliabile una revisione IT/privacy e, se possibile, autenticazione aziendale Google/Microsoft al posto del solo PIN.

## 3. Configura il frontend
Apri `config.js` e sostituisci:

```js
API_URL: "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

con il tuo URL `/exec` di Apps Script.

## 4. Pubblica su GitHub
1. Crea un nuovo repository, ad esempio `presenze-dussmann`.
2. Carica nella root:
   - `index.html`
   - `styles.css`
   - `app.js`
   - `config.js`
   - `manifest.webmanifest`
   - `sw.js`
3. La cartella `backend/` può restare nel repository come copia del codice Apps Script.
4. GitHub → **Settings** → **Pages**.
5. Source: **Deploy from a branch**.
6. Branch: `main`, cartella `/root`.
7. Salva. Dopo poco avrai l'indirizzo pubblico della web app.

## 5. Struttura Google Sheet
### Lavoratori
- `employeeCode`: codice univoco
- `name`: nome e cognome
- `pinHash`: hash SHA-256 del PIN
- `cdc`: CDC
- `appalto`: nome appalto
- `sede`: sede
- `role`: `LAVORATORE`, `RESPONSABILE`, `ADMIN`
- `managedCdc`: per responsabili, CDC separati da virgola
- `active`: `SI` / `NO`

### Presenze
Una riga per lavoratore/giorno con prima e seconda fascia, totale, note, conferma lavoratore e approvazione responsabile.

## 6. Aggiungere un lavoratore
Il PIN non va scritto in chiaro nel foglio. Nel progetto Apps Script puoi temporaneamente eseguire:

```js
Logger.log(hash_('1234'));
```

poi copia il valore nel campo `pinHash`.

## 7. PDF mensile
Dall'area Responsabile scegli mese e lavoratore e premi **Genera PDF**. Il backend crea un PDF nel folder Google Drive `Presenze - PDF mensili`.

Il PDF contiene:
- mese e anno
- nome e cognome
- CDC/appalto
- giorni 1–31
- due coppie entrata/uscita
- totale giornaliero
- note
- totale mese
- indicazione di conferma digitale lavoratore/responsabile

## 8. Prima di usarla realmente in azienda
Questa è una base tecnica pronta per test/pilota. Prima di sostituire il modulo cartaceo in produzione va concordato con azienda/HR/IT come gestire:
- validità della firma/conferma digitale;
- informativa privacy e conservazione dati;
- criteri per rettifiche delle presenze;
- accessi dei responsabili;
- periodo di conservazione e backup;
- eventuale integrazione con Oplà/INAZ/SAP.

## Prossimi miglioramenti consigliati
- QR code personale per accesso rapido
- recupero/cambio PIN
- causali ferie/malattia/permesso/riposo
- geolocalizzazione opzionale solo se autorizzata dall'azienda
- blocco modifiche dopo approvazione
- firma grafica sul touchscreen
- dashboard per provincia/sede/appalto
- esportazione Excel/CSV
- notifiche per mancata compilazione
