'use strict';

const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const { interpret } = require('./interpreter');
const { interpretWithGroq } = require('./groq-client');
const dreamRepository = require('./dream-repository');
const userRepository = require('./user-repository');
const auth = require('./auth');

const app = express();
const PORT = process.env.PORT || 3020;

app.use(express.json({ limit: '256kb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* ------------------------------------------------------------------ */
/* Middleware: verifica la sessione, popola req.userId se valida.      */
/* ------------------------------------------------------------------ */
function requireAuth(req, res, next) {
  const token = auth.getTokenFromRequest(req);
  const userId = token ? auth.verifySessionToken(token) : null;
  if (!userId) {
    return res.status(401).json({ error: 'Devi accedere per continuare.' });
  }
  req.userId = userId;
  next();
}

/* ------------------------------------------------------------------ */
/* Autenticazione                                                      */
/* ------------------------------------------------------------------ */
app.post('/api/auth/register', async (req, res) => {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const password = (req.body?.password || '').toString();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email non valida.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'La password deve avere almeno 8 caratteri.' });
  }

  const existing = await userRepository.findByEmail(email);
  if (existing) {
    return res.status(409).json({ error: 'Esiste già un account con questa email.' });
  }

  const passwordHash = await auth.hashPassword(password);
  const user = await userRepository.create({ email, passwordHash });

  const token = auth.createSessionToken(user.id);
  auth.setSessionCookie(res, token);
  res.json({ email: user.email });
});

app.post('/api/auth/login', async (req, res) => {
  const email = (req.body?.email || '').toString().trim().toLowerCase();
  const password = (req.body?.password || '').toString();

  const user = await userRepository.findByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Email o password non corretti.' });
  }
  const valid = await auth.verifyPassword(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Email o password non corretti.' });
  }

  const token = auth.createSessionToken(user.id);
  auth.setSessionCookie(res, token);
  res.json({ email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.json({ ok: true });
});

app.get('/api/auth/me', async (req, res) => {
  const token = auth.getTokenFromRequest(req);
  const userId = token ? auth.verifySessionToken(token) : null;
  if (!userId) return res.json({ user: null });

  const user = await userRepository.findById(userId);
  if (!user) return res.json({ user: null });
  res.json({ user: { email: user.email } });
});

/* ------------------------------------------------------------------ */
/* Salute del servizio (pubblica, non richiede login)                  */
/* ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiEnabled: Boolean(process.env.GROQ_API_KEY), storage: dreamRepository.backend });
});

/* ------------------------------------------------------------------ */
/* Diario dei sogni: tutte queste rotte richiedono di aver fatto login */
/* e restituiscono/modificano SOLO i sogni dell'utente autenticato.    */
/* ------------------------------------------------------------------ */
app.get('/api/dreams', requireAuth, async (req, res) => {
  try {
    const dreams = await dreamRepository.getAll(req.userId);
    const publicDreams = dreams.map(({ userId, ...rest }) => rest);
    res.json(publicDreams);
  } catch (e) {
    res.status(500).json({ error: 'Impossibile leggere il diario.' });
  }
});

app.post('/api/interpret', requireAuth, async (req, res) => {
  const dreamText = (req.body?.dream || '').toString().trim();
  if (dreamText.length < 12) {
    return res.status(400).json({ error: 'Racconta qualche dettaglio in più (almeno 12 caratteri).' });
  }
  if (dreamText.length > 4000) {
    return res.status(400).json({ error: 'Il racconto è troppo lungo (massimo 4000 caratteri).' });
  }

  let result = await interpretWithGroq(dreamText);
  let source = 'ai';
  if (!result) {
    result = interpret(dreamText);
    source = 'local';
  }

  const saved = await dreamRepository.add(req.userId, {
    title: result.title,
    content: dreamText,
    interpretation: result.interpretation,
    symbols: result.symbols,
    mood: result.mood
  });

  const { userId, ...publicDream } = saved;
  res.json({ ...publicDream, source });
});

app.delete('/api/dreams/:id', requireAuth, async (req, res) => {
  try {
    await dreamRepository.remove(req.userId, req.params.id);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: 'Impossibile eliminare il sogno.' });
  }
});

app.listen(PORT, () => {
  console.log(`Onirica web in ascolto sulla porta ${PORT}`);
  console.log(`Interpretazione AI: ${process.env.GROQ_API_KEY ? 'attiva' : 'non configurata (uso motore locale)'}`);
  console.log(`Storage: ${dreamRepository.backend}`);
  if (!process.env.JWT_SECRET) {
    console.log('ATTENZIONE: JWT_SECRET non impostata. Le sessioni non sopravviveranno a un riavvio del server.');
  }
});
