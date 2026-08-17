'use strict';

const express = require('express');
const path = require('path');
const { interpret } = require('./interpreter');
const { interpretWithGroq } = require('./groq-client');
const repository = require('./dream-repository');

const app = express();
const PORT = process.env.PORT || 3020;

app.use(express.json({ limit: '256kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', aiEnabled: Boolean(process.env.GROQ_API_KEY), storage: repository.backend });
});

app.get('/api/dreams', async (req, res) => {
  try {
    const dreams = await repository.getAll();
    res.json(dreams);
  } catch (e) {
    res.status(500).json({ error: 'Impossibile leggere il diario.' });
  }
});

app.post('/api/interpret', async (req, res) => {
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

  const saved = await repository.add({
    title: result.title,
    content: dreamText,
    interpretation: result.interpretation,
    symbols: result.symbols,
    mood: result.mood
  });

  res.json({ ...saved, source });
});

app.delete('/api/dreams/:id', async (req, res) => {
  try {
    await repository.remove(req.params.id);
    res.json({ deleted: true });
  } catch (e) {
    res.status(500).json({ error: 'Impossibile eliminare il sogno.' });
  }
});

app.listen(PORT, () => {
  console.log(`Onirica web in ascolto sulla porta ${PORT}`);
  console.log(`Interpretazione AI: ${process.env.GROQ_API_KEY ? 'attiva' : 'non configurata (uso motore locale)'}`);
  console.log(`Storage: ${repository.backend}`);
});
