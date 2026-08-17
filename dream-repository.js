'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USE_TURSO = Boolean(process.env.TURSO_DATABASE_URL);

/* ------------------------------------------------------------------ */
/* Modalità Turso: database SQLite ospitato nel cloud (piano gratuito), */
/* usata quando l'app gira su un hosting gratuito senza disco          */
/* persistente affidabile (es. Render). Attiva solo se sono presenti   */
/* TURSO_DATABASE_URL e TURSO_AUTH_TOKEN come variabili d'ambiente.    */
/* ------------------------------------------------------------------ */
let tursoClient = null;
let tursoReady = null;

function getTursoClient() {
  if (!tursoClient) {
    const { createClient } = require('@libsql/client');
    tursoClient = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN
    });
  }
  return tursoClient;
}

async function ensureTursoSchema() {
  if (tursoReady) return tursoReady;
  const client = getTursoClient();
  tursoReady = client.execute(`
    CREATE TABLE IF NOT EXISTS dreams (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      interpretation TEXT NOT NULL,
      symbols TEXT NOT NULL,
      mood TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `);
  return tursoReady;
}

async function tursoGetAll() {
  await ensureTursoSchema();
  const client = getTursoClient();
  const result = await client.execute('SELECT * FROM dreams ORDER BY createdAt DESC');
  return result.rows.map(rowToDream);
}

async function tursoAdd({ title, content, interpretation, symbols, mood }) {
  await ensureTursoSchema();
  const client = getTursoClient();
  const dream = {
    id: crypto.randomUUID(),
    title,
    content,
    interpretation,
    symbols: symbols || [],
    mood,
    createdAt: Date.now()
  };
  await client.execute({
    sql: 'INSERT INTO dreams (id, title, content, interpretation, symbols, mood, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [dream.id, dream.title, dream.content, dream.interpretation, JSON.stringify(dream.symbols), dream.mood, dream.createdAt]
  });
  return dream;
}

async function tursoRemove(id) {
  await ensureTursoSchema();
  const client = getTursoClient();
  await client.execute({ sql: 'DELETE FROM dreams WHERE id = ?', args: [id] });
}

function rowToDream(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    interpretation: row.interpretation,
    symbols: JSON.parse(row.symbols || '[]'),
    mood: row.mood,
    createdAt: Number(row.createdAt)
  };
}

/* ------------------------------------------------------------------ */
/* Modalità file JSON locale: usata di default (es. self-host su NAS/  */
/* CasaOS, dove il volume Docker garantisce già la persistenza).       */
/* ------------------------------------------------------------------ */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'dreams.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ schemaVersion: 1, dreams: [] }, null, 2));
  }
}

function readJournal() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.dreams)) return { schemaVersion: 1, dreams: [] };
    return parsed;
  } catch (e) {
    return { schemaVersion: 1, dreams: [] };
  }
}

function writeJournal(journal) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(journal, null, 2));
}

async function fileGetAll() {
  const journal = readJournal();
  return journal.dreams.slice().sort((a, b) => b.createdAt - a.createdAt);
}

async function fileAdd({ title, content, interpretation, symbols, mood }) {
  const journal = readJournal();
  const dream = {
    id: crypto.randomUUID(),
    title,
    content,
    interpretation,
    symbols: symbols || [],
    mood,
    createdAt: Date.now()
  };
  journal.dreams.push(dream);
  writeJournal(journal);
  return dream;
}

async function fileRemove(id) {
  const journal = readJournal();
  journal.dreams = journal.dreams.filter(d => d.id !== id);
  writeJournal(journal);
}

/* ------------------------------------------------------------------ */
/* Interfaccia unica: il resto dell'app chiama sempre queste funzioni, */
/* senza sapere quale backend è attivo.                                */
/* ------------------------------------------------------------------ */
module.exports = {
  getAll: USE_TURSO ? tursoGetAll : fileGetAll,
  add: USE_TURSO ? tursoAdd : fileAdd,
  remove: USE_TURSO ? tursoRemove : fileRemove,
  backend: USE_TURSO ? 'turso' : 'json-file'
};
