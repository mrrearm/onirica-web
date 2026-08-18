'use strict';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT =
  'Sei un assistente esperto di interpretazione dei sogni, con un tono caldo, ' +
  'riflessivo e psicologicamente informato (ispirazione junghiana, senza tecnicismi). ' +
  'Rispondi sempre e solo in italiano.';

/**
 * Interpreta il sogno tramite Groq, se GROQ_API_KEY è impostata come
 * variabile d'ambiente del container. La chiave non è mai nel codice o
 * nel repository: va passata a `docker run -e GROQ_API_KEY=...` o nel
 * docker-compose.yml (letta da un file .env locale, non committato).
 *
 * Ritorna null in caso di qualunque errore, così il chiamante può
 * ripiegare sull'interprete locale senza far fallire la richiesta.
 */
async function interpretWithGroq(dreamText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  const userPrompt =
    `Interpreta questo sogno: "${dreamText.replace(/"/g, "'")}"\n\n` +
    'Rispondi ESCLUSIVAMENTE con un oggetto JSON valido, senza markdown e senza testo ' +
    'fuori dal JSON, con questi campi esatti:\n' +
    '- "title": titolo breve ed evocativo (max 6 parole)\n' +
    '- "interpretation": interpretazione in prosa continua di 3-4 paragrafi, personalizzata sui dettagli del sogno raccontato\n' +
    '- "symbols": array di massimo 5 simboli principali individuati nel racconto (stringhe brevi)\n' +
    '- "mood": una sola parola tra "luminoso", "inquieto", "ambivalente"';

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.85,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      })
    });

    if (!response.ok) {
      const bodyText = await response.text().catch(() => '');
      console.error(`[Groq] Richiesta fallita: HTTP ${response.status} - ${bodyText.slice(0, 300)}`);
      return null;
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!parsed.title || !parsed.interpretation) return null;

    return {
      title: parsed.title,
      interpretation: parsed.interpretation,
      symbols: Array.isArray(parsed.symbols) ? parsed.symbols : [],
      mood: parsed.mood || 'ambivalente'
    };
  } catch (e) {
    console.error('[Groq] Errore durante la chiamata:', e.message);
    return null;
  }
}

module.exports = { interpretWithGroq };
