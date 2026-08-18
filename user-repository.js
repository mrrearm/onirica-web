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

async function ensureSchema() {
  if (tursoReady) return tursoReady;
  const client = getTursoClient();
  tursoReady = client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      passwordHash TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    )
  `);
  return tursoReady;
}

async function tursoFindByEmail(email) {
  await ensureSchema();
  const client = getTursoClient();
  const result = await client.execute({
    sql: 'SELECT * FROM users WHERE email = ?',
    args: [email.toLowerCase()]
  });
  return result.rows[0] || null;
}

async function tursoFindById(id) {
  await ensureSchema();
  const client = getTursoClient();
  const result = await client.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
  return result.rows[0] || null;
}

async function tursoCreate({ email, passwordHash }) {
  await ensureSchema();
  const client = getTursoClient();
  const user = { id: crypto.randomUUID(), email: email.toLowerCase(), passwordHash, createdAt: Date.now() };
  await client.execute({
    sql: 'INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)',
    args: [user.id, user.email, user.passwordHash, user.createdAt]
  });
  return user;
}

/* --- File JSON locale --- */
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

function ensureUsersFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
}

function readUsers() {
  ensureUsersFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    return Array.isArray(parsed.users) ? parsed.users : [];
  } catch (e) {
    return [];
  }
}

function writeUsers(users) {
  ensureUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify({ users }, null, 2));
}

async function fileFindByEmail(email) {
  return readUsers().find(u => u.email === email.toLowerCase()) || null;
}

async function fileFindById(id) {
  return readUsers().find(u => u.id === id) || null;
}

async function fileCreate({ email, passwordHash }) {
  const users = readUsers();
  const user = { id: crypto.randomUUID(), email: email.toLowerCase(), passwordHash, createdAt: Date.now() };
  users.push(user);
  writeUsers(users);
  return user;
}

module.exports = {
  findByEmail: USE_TURSO ? tursoFindByEmail : fileFindByEmail,
  findById: USE_TURSO ? tursoFindById : fileFindById,
  create: USE_TURSO ? tursoCreate : fileCreate
};
