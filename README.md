# Onirica Web — Diario dei Sogni (self-hosted)

Versione web di Onirica: stesso motore di interpretazione (locale a regole
o, opzionalmente, via un modello AI usando una tua chiave Groq gratuita),
stesso "database" JSON, pensata per girare in Docker sul tuo NAS con
CasaOS. Nessun account, nessun servizio esterno obbligatorio: i dati
restano sul tuo server.

## Struttura del progetto

```
onirica-web/
├── server.js              Express: static + API
├── interpreter.js          motore di interpretazione locale (stesso dell'app Android)
├── groq-client.js          interpretazione AI opzionale (usa GROQ_API_KEY se presente)
├── dream-repository.js     "database" JSON (data/dreams.json)
├── public/index.html       frontend (tema cosmico scuro, coerente con l'app)
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

## Come funziona l'interpretazione

- Se la variabile d'ambiente `GROQ_API_KEY` **non** è impostata: Onirica
  usa il motore locale a regole (`interpreter.js`), zero dipendenze esterne.
- Se è impostata: prova prima Groq: in caso di errore (rete, rate limit,
  chiave non valida) ripiega automaticamente sul motore locale, così il
  server non fallisce mai una richiesta.

La chiave, se la usi, va in un file `.env` locale (mai committato) o
passata direttamente a `docker run -e GROQ_API_KEY=...`.

## Deploy su CasaOS via Termux (stesso workflow di GridVault)

### 1. Prepara il progetto su GitHub (facoltativo ma consigliato)

```bash
cd onirica-web
git init
git add -A
git commit -m "Onirica Web: prima versione self-hosted"
git branch -M main
git remote add origin https://github.com/mrrearm/onirica-web.git
git push -u origin main
```

### 2. Copia il progetto sul NAS via SSH da Termux

```bash
scp -r onirica-web tuo-utente@indirizzo-nas:/percorso/dove/vuoi/onirica-web
ssh tuo-utente@indirizzo-nas
cd /percorso/dove/vuoi/onirica-web
```

(Sostituisci `tuo-utente` e `indirizzo-nas` con le credenziali/IP del tuo
NAS, come hai già fatto per GridVault.)

### 3. (Facoltativo) Attiva l'interpretazione AI

Sul NAS, dentro la cartella del progetto:

```bash
cp .env.example .env
nano .env
```

Incolla la tua chiave Groq gratuita (presa su console.groq.com) accanto a
`GROQ_API_KEY=`, salva.

Se salti questo passaggio, l'app funziona comunque con il motore locale.

### 4. Build e avvio con Docker Compose

```bash
docker compose up -d --build
```

L'app sarà raggiungibile su `http://indirizzo-nas:3020`.

### 5. Aggiungerlo a CasaOS

CasaOS rileva automaticamente i container Docker già in esecuzione e li
mostra nella dashboard. In alternativa, per un'integrazione più curata:

1. Apri CasaOS → **App Store** → **Custom Install**
2. Incolla il contenuto di `docker-compose.yml` (o usa l'opzione "Import"
   se disponibile nella tua versione di CasaOS)
3. Imposta l'icona e il nome come preferisci

### Aggiornare dopo modifiche al codice

```bash
cd /percorso/onirica-web
git pull                       # se lavori via Git
docker compose up -d --build   # ricostruisce e riavvia
```

I dati (`data/dreams.json`) restano intatti tra un aggiornamento e
l'altro, perché sono su un volume montato fuori dal container.

## Porta

Di default `3020`, per non entrare in conflitto con GridVault (che usa la
`3010`). Cambiabile in `docker-compose.yml` e nella variabile `PORT`.

## Sicurezza

- Nessuna chiave nel codice sorgente o nel repository Git (`.env` è nel
  `.gitignore`).
- Il "database" è un file JSON in chiaro (in modalità self-host): se il
  NAS è esposto su internet, valuta di mettere l'app dietro
  autenticazione (es. tramite il reverse proxy che già usi, o le
  funzioni di accesso di CasaOS).

## Deploy come sito pubblico gratuito (Render + Turso)

Se invece vuoi un sito raggiungibile da chiunque, con un indirizzo web
pubblico e senza tenere il NAS acceso, questa combinazione è interamente
gratuita e non richiede carta di credito:

- **Render** (render.com): hosting gratuito per il servizio Node/Docker.
  Limite del piano gratuito: il servizio "si addormenta" dopo 15 minuti
  di inattività e la prima richiesta successiva impiega qualche secondo
  in più per "svegliarlo" - normale, non un errore.
- **Turso** (turso.tech): database SQLite ospitato nel cloud, piano
  gratuito generoso, usato al posto del file JSON perché il disco di
  Render (piano gratuito) non è persistente tra un riavvio e l'altro.

### 1. Crea il database su Turso

1. Vai su **turso.tech** → registrati (gratis, login con GitHub va bene)
2. Dalla dashboard web: **Create Database** → dagli un nome (es. `onirica`)
3. Nella pagina del database, copia:
   - **Database URL** (inizia con `libsql://...`)
   - Crea un **Auth Token** (di solito un pulsante "Create Token") e copialo

Tienili da parte, servono al passo 3.

### 2. Metti il progetto su GitHub

```bash
cd onirica-web
git init
git add -A
git commit -m "Onirica Web"
git branch -M main
git remote add origin https://github.com/mrrearm/onirica-web.git
git push -u origin main
```

(Se lo hai già fatto per il deploy su NAS, salta questo passaggio.)

### 3. Crea il servizio su Render

1. Vai su **render.com** → registrati (gratis, login con GitHub va bene)
2. **New** → **Web Service** → collega il repository `onirica-web`
3. Render rileva automaticamente il `Dockerfile` incluso nel progetto -
   lascia le impostazioni di build predefinite
4. Scegli il piano **Free**
5. In **Environment Variables**, aggiungi:
   - `TURSO_DATABASE_URL` → il valore copiato al passo 1
   - `TURSO_AUTH_TOKEN` → il valore copiato al passo 1
   - `GROQ_API_KEY` → (facoltativo) la tua chiave Groq gratuita, se vuoi
     l'interpretazione AI anche qui
6. **Create Web Service** → Render fa la build e il deploy in automatico

Alla fine ti dà un indirizzo pubblico tipo:

```
https://onirica-web.onrender.com
```

Quello è il tuo sito, raggiungibile da chiunque, ovunque, gratuitamente.

### Aggiornare il sito in futuro

Basta fare push su GitHub: Render rileva il nuovo commit e ricostruisce
il servizio in automatico (nessun comando da lanciare a mano).

```bash
git add -A
git commit -m "..."
git push
```
