'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USE_TURSO = Boolean(process.env.TURSO_DATABASE_URL);

/* --- Turso --- */
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
      userId TEXT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      interpretation TEXT NOT NULL,
      symbols TEXT NOT NULL,
      mood TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `).then(() =>
    // Se la tabella esisteva già da prima dell'introduzione degli account
    // (colonna userId assente), la aggiungiamo senza perdere i dati.
    client.execute(`ALTER TABLE dreams ADD COLUMN userId TEXT`).catch(() => {})
  );
  return tursoReady;
}

async function tursoGetAll(userId) {
  await ensureTursoSchema();
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT * FROM dreams WHERE userId = ? ORDER BY createdAt DESC',
    args: [userId]
  });
  return result.rows.map(rowToDream);
}

async function tursoAdd(userId, { title, content, interpretation, symbols, mood }) {
  await ensureTursoSchema();
  const client = getTursoClient();
  const dream = {
    id: crypto.randomUUID(),
    userId,
    title, content, interpretation,
    symbols: symbols || [],
    mood,
    createdAt: Date.now()
  };
  await client.execute({
    sql: 'INSERT INTO dreams (id, userId, title, content, interpretation, symbols, mood, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    args: [dream.id, dream.userId, dream.title, dream.content, dream.interpretation, JSON.stringify(dream.symbols), dream.mood, dream.createdAt]
  });
  return dream;
}

async function tursoRemove(userId, id) {
  await ensureTursoSchema();
  const client = getTursoClient();
  await client.execute({ sql: 'DELETE FROM dreams WHERE id = ? AND userId = ?', args: [id, userId] });
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

/* --- File JSON locale --- */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'dreams.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ schemaVersion: 2, dreams: [] }, null, 2));
  }
}

function readJournal() {
  ensureDataFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    if (!Array.isArray(parsed.dreams)) return { schemaVersion: 2, dreams: [] };
    return parsed;
  } catch (e) {
    return { schemaVersion: 2, dreams: [] };
  }
}

function writeJournal(journal) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(journal, null, 2));
}

async function fileGetAll(userId) {
  const journal = readJournal();
  return journal.dreams
    .filter(d => d.userId === userId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

async function fileAdd(userId, { title, content, interpretation, symbols, mood }) {
  const journal = readJournal();
  const dream = {
    id: crypto.randomUUID(),
    userId,
    title, content, interpretation,
    symbols: symbols || [],
    mood,
    createdAt: Date.now()
  };
  journal.dreams.push(dream);
  writeJournal(journal);
  return dream;
}

async function fileRemove(userId, id) {
  const journal = readJournal();
  journal.dreams = journal.dreams.filter(d => !(d.id === id && d.userId === userId));
  writeJournal(journal);
}

module.exports = {
  getAll: USE_TURSO ? tursoGetAll : fileGetAll,
  add: USE_TURSO ? tursoAdd : fileAdd,
  remove: USE_TURSO ? tursoRemove : fileRemove,
  backend: USE_TURSO ? 'turso' : 'json-file'
};
