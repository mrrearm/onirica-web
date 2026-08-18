'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// In produzione va impostata una variabile d'ambiente JWT_SECRET tua,
// diversa per ogni installazione. Se manca, ne generiamo una casuale
// all'avvio: funziona, ma le sessioni non sopravvivono a un riavvio del
// server (gli utenti dovrebbero rifare login). Per il NAS/Render, imposta
// JWT_SECRET tra le variabili d'ambiente per evitare questo.
const JWT_SECRET = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
const COOKIE_NAME = 'onirica_session';
const TOKEN_TTL = '30d';

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

function createSessionToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return payload.sub;
  } catch (e) {
    return null;
  }
}

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

function getTokenFromRequest(req) {
  return req.cookies?.[COOKIE_NAME] || null;
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getTokenFromRequest
};
