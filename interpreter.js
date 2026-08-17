'use strict';

/**
 * Motore di interpretazione dei sogni completamente locale e deterministico.
 * Stessa logica della versione Kotlin dell'app Android: nessuna chiamata
 * esterna, un dizionario di simboli con più varianti testuali ciascuno,
 * composte in prosa continua con una selezione pseudo-casuale ma stabile
 * (stesso sogno -> stessa lettura).
 */

const symbolDictionary = [
  { keywords: ['acqua', 'mare', 'oceano', 'onde', 'nuotare', 'fiume', 'lago', 'piscina', 'pioggia'], label: 'Acqua', meanings: [
    "l'acqua richiama il mondo emotivo e l'inconscio: la sua calma o il suo tumulto sembrano rispecchiare qualcosa del tuo stato interiore in questo periodo",
    'dove compare l\'acqua, il sogno sta probabilmente parlando di emozioni: quanto erano limpide o agitate, in quel momento del sogno?',
    "l'elemento acquatico porta con sé un invito ad ascoltare ciò che senti, più che ciò che pensi, riguardo a quanto stai vivendo"
  ]},
  { keywords: ['volare', 'volo', 'ali', 'cielo', 'librarsi', 'planare'], label: 'Volo', meanings: [
    'volare in sogno esprime spesso un desiderio di libertà, di superare un limite che senti stretto nella vita da sveglio',
    'il volo è tra i simboli più diretti di voglia di elevarsi al di sopra di una situazione che ti sta pesando',
    'sollevarsi da terra nel sogno può indicare che stai cercando, anche solo mentalmente, un punto di vista diverso su qualcosa'
  ]},
  { keywords: ['cadere', 'caduta', 'precipizio', 'precipitare', 'sprofondare'], label: 'Caduta', meanings: [
    'la caduta è tra i simboli più antichi del sogno: segnala spesso insicurezza o la sensazione di perdere il controllo su qualcosa',
    'precipitare nel sogno accompagna in genere la paura di non essere all\'altezza di una situazione imminente',
    'cadere può riflettere il timore che qualcosa a cui tieni ti stia sfuggendo di mano proprio ora'
  ]},
  { keywords: ['casa', 'stanza', 'porta', 'corridoio', 'finestra', 'soffitta', 'cantina', 'scale'], label: 'Casa', meanings: [
    'la casa rappresenta spesso la struttura del sé: le sue stanze possono essere lette come parti diverse della tua personalità da esplorare',
    'muoversi tra stanze e corridoi nel sogno somiglia a un attraversamento interiore, tra ciò che conosci di te e ciò che è ancora inesplorato',
    'una casa sconosciuta o diversa dal solito suggerisce che qualcosa nella tua identità sta cambiando forma in questo periodo'
  ]},
  { keywords: ['morte', 'morire', 'funerale', 'tomba', 'lapide', 'bara'], label: 'Morte', meanings: [
    "la morte onirica raramente va presa alla lettera: più spesso annuncia la fine di una fase e l'inizio di una trasformazione",
    'sognare la morte accompagna in genere un cambiamento profondo già in corso, non un presagio da temere',
    'questo simbolo parla di chiusura: qualcosa dentro di te sta lasciando spazio a qualcos\'altro'
  ]},
  { keywords: ['inseguito', 'inseguimento', 'fuggire', 'scappare', 'correre via', 'nascondersi'], label: 'Inseguimento', meanings: [
    'essere inseguiti riflette spesso un evitamento: qualcosa che preferisci non affrontare direttamente nella vita reale',
    'la fuga nel sogno racconta di una tensione che rincorre da vicino, anche se magari nella veglia la tieni a distanza',
    'chi o cosa ti insegue nel sogno può essere una versione simbolica di un pensiero o una responsabilità che eviti di guardare in faccia'
  ]},
  { keywords: ['nudo', 'nuda', 'spogliato', 'spogliata', 'vestiti'], label: 'Nudità', meanings: [
    'la nudità in sogno tocca spesso il tema della vulnerabilità e del timore di essere giudicati per ciò che si è davvero',
    'sentirsi esposti nel sogno parla di quanto, nella vita reale, ti senti al sicuro nel mostrarti senza filtri agli altri',
    'questo simbolo emerge spesso in momenti in cui ti senti osservato o valutato più del solito'
  ]},
  { keywords: ['denti', 'dente'], label: 'Denti', meanings: [
    "la perdita dei denti è un classico simbolo di ansia legata all'immagine di sé o alla paura di perdere potere personale",
    'sognare i denti che cadono accompagna spesso periodi in cui ti senti meno sicuro di come ti presenti agli altri',
    'questo simbolo torna frequentemente quando avverti il passare del tempo o un cambiamento nel proprio aspetto o ruolo'
  ]},
  { keywords: ['serpente', 'serpenti', 'vipera'], label: 'Serpente', meanings: [
    'il serpente è un simbolo ambivalente: trasformazione e rinnovamento, ma anche minaccia latente o tradimento, a seconda del contesto',
    'la presenza di un serpente nel sogno spesso indica un\'energia che sta cambiando forma dentro di te, per meglio o per peggio',
    'questo simbolo invita a chiederti se c\'è qualcosa, in una relazione o situazione, che percepisci come non del tutto sincero'
  ]},
  { keywords: ['bambino', 'bambina', 'neonato', 'bimbo', 'bimba'], label: 'Bambino', meanings: [
    'il bambino onirico rappresenta spesso una parte nuova e fragile di te, o un progetto ancora in crescita',
    'un bambino nel sogno può incarnare la parte più spontanea e vulnerabile della tua personalità',
    'questo simbolo compare spesso quando qualcosa nella tua vita è appena nato e ha ancora bisogno di cure e attenzione'
  ]},
  { keywords: ['buio', 'oscurità', 'notte', 'ombra', 'tenebre'], label: 'Ombra', meanings: [
    "l'oscurità richiama l'archetipo junghiano dell'Ombra: gli aspetti di te non ancora riconosciuti o accettati del tutto",
    'il buio nel sogno non è necessariamente negativo: a volte segnala solo che stai esplorando territori interiori poco familiari',
    "muoversi nell'oscurità del sogno suggerisce che stai cercando di orientarti in una situazione poco chiara della tua vita"
  ]},
  { keywords: ['specchio', 'riflesso'], label: 'Specchio', meanings: [
    'lo specchio invita a un confronto diretto con l\'immagine che hai di te stesso, a volte rivelandone una versione inattesa',
    'vedersi riflessi nel sogno spesso accompagna una fase di autovalutazione, magari più severa del solito',
    'questo simbolo chiede: ti riconosci davvero in ciò che il sogno ti ha mostrato di te?'
  ]},
  { keywords: ['scuola', 'esame', 'interrogazione', 'compito', 'professore', 'professoressa'], label: 'Esame', meanings: [
    "sognare un esame segnala spesso il timore di essere valutati, o di non essere all'altezza di un'aspettativa propria o altrui",
    'questo simbolo torna nei momenti in cui senti che le tue capacità sono sotto osservazione, anche solo nella tua testa',
    'un esame nel sogno parla di prestazione: c\'è qualcosa su cui ti senti costantemente sotto giudizio in questo periodo?'
  ]},
  { keywords: ['treno', 'aereo', 'auto', 'macchina', 'strada', 'viaggio', 'autobus', 'bicicletta', 'nave', 'barca'], label: 'Viaggio', meanings: [
    'i mezzi di trasporto rappresentano spesso il tuo percorso di vita: perderli o guidarli male esprime quanto senti di avere il controllo sulla tua direzione',
    'un viaggio nel sogno racconta del cammino che stai percorrendo, con le sue deviazioni, i suoi ritardi o le sue accelerazioni improvvise',
    'questo simbolo invita a chiederti se, nella vita reale, ti senti tu al volante della situazione o più in balìa degli eventi'
  ]},
  { keywords: ['fuoco', 'incendio', 'fiamme', 'brucia', 'bruciare'], label: 'Fuoco', meanings: [
    'il fuoco è energia trasformativa: può indicare una passione intensa oppure una situazione emotiva vicina a sfuggire di mano',
    "le fiamme nel sogno parlano spesso di qualcosa che si sta consumando rapidamente - un'idea, una relazione, un'energia",
    "questo simbolo chiede attenzione: c'è qualcosa che sta bruciando dentro di te più velocemente di quanto pensassi?"
  ]},
  { keywords: ['animale', 'animali', 'cane', 'gatto', 'lupo', 'leone', 'uccello', 'cavallo', 'orso', 'pesce', 'insetto', 'ragno', 'farfalla'], label: 'Animale', meanings: [
    'le figure animali incarnano spesso istinti e pulsioni non del tutto integrati nella vita cosciente',
    'un animale nel sogno può rappresentare una parte di te più istintiva, che magari nella veglia tieni sotto controllo',
    'il comportamento dell\'animale nel sogno - amichevole o minaccioso - dice molto su come vivi quell\'istinto in questo momento'
  ]},
  { keywords: ['labirinto', 'perso', 'persa', 'smarrito', 'smarrita', 'disorientato', 'disorientata'], label: 'Smarrimento', meanings: [
    'sentirsi persi in un labirinto riflette spesso un momento di incertezza rispetto a una scelta o a una direzione da prendere',
    'questo simbolo emerge quando ti senti davanti a troppe strade possibili, senza sapere quale imboccare per prima',
    'lo smarrimento onirico non sempre è un cattivo segno: a volte prepara il terreno a una decisione che stai per prendere'
  ]},
  { keywords: ['tempesta', 'temporale', 'uragano', 'fulmine', 'fulmini'], label: 'Tempesta', meanings: [
    'la tempesta è emozione che preme per esprimersi: un conflitto interiore vicino a raggiungere il suo culmine',
    'un temporale nel sogno racconta spesso di tensioni accumulate che chiedono, prima o poi, di trovare sfogo',
    "questo simbolo suggerisce che qualcosa dentro di te è più carico, elettrico, di quanto lasci trasparire di giorno"
  ]},
  { keywords: ['volto', 'faccia', 'maschera', 'irriconoscibile'], label: 'Maschera', meanings: [
    "una maschera o un volto irriconoscibile suggeriscono la distanza tra il sé che mostri agli altri e quello più autentico",
    'questo simbolo compare spesso quando senti di dover recitare una parte diversa da chi sei davvero, in qualche contesto della tua vita',
    'un volto che cambia o si nasconde nel sogno invita a chiederti quanto ti senti visto per come sei realmente'
  ]},
  { keywords: ['gravidanza', 'incinta', 'partorire', 'parto'], label: 'Gravidanza', meanings: [
    "la gravidanza onirica, al di là del significato letterale, è spesso metafora di un progetto o un'idea ancora in gestazione",
    'questo simbolo parla di qualcosa che stai portando avanti dentro di te, non ancora pronto per essere mostrato al mondo',
    'sognare una gravidanza può indicare l\'attesa - a volte impaziente, a volte serena - di qualcosa che sta per nascere nella tua vita'
  ]},
  { keywords: ['lavoro', 'ufficio', 'capo', 'collega', 'riunione', 'licenziato', 'licenziata'], label: 'Lavoro', meanings: [
    'gli scenari lavorativi nei sogni parlano spesso di riconoscimento, prestazione e del peso delle responsabilità quotidiane',
    'questo simbolo emerge quando il tema del valore personale si intreccia a doppio filo con quello che fai ogni giorno',
    'un sogno ambientato al lavoro racconta spesso più di come ti senti valutato, che del lavoro in sé'
  ]},
  { keywords: ['matrimonio', 'sposa', 'sposo', 'sposarsi', 'anello'], label: 'Unione', meanings: [
    'il matrimonio onirico simboleggia un\'unione, non necessariamente romantica: può indicare l\'integrazione di parti diverse di te',
    'questo simbolo parla spesso di un impegno che stai per prendere, o che senti di dover chiarire, con te stesso o con altri',
    'sognare un\'unione può riflettere il desiderio di far coincidere due parti di te che finora hai tenuto separate'
  ]},
  { keywords: ['soldi', 'denaro', 'monete', 'banconote', 'portafoglio', 'ricco', 'ricca', 'povero', 'povera'], label: 'Denaro', meanings: [
    'il denaro nei sogni è spesso metafora di valore personale ed energia vitale, più che una questione puramente economica',
    'questo simbolo emerge quando ti interroghi su quanto vali, quanto dai e quanto ricevi in cambio, in un ambito della vita',
    'perdere o trovare denaro nel sogno parla spesso di sicurezza percepita, non di conti in banca'
  ]},
  { keywords: ['montagna', 'vetta', 'salita', 'scalare', 'arrampicarsi'], label: 'Montagna', meanings: [
    'salire una montagna rappresenta spesso uno sforzo verso un obiettivo importante e il desiderio di una prospettiva più ampia',
    'questo simbolo racconta di una fatica che percepisci come necessaria, per arrivare a vedere le cose da più in alto',
    'una vetta nel sogno può indicare quanto ti senti vicino, o lontano, dal raggiungere qualcosa a cui tieni'
  ]},
  { keywords: ['chiave', 'chiavi', 'serratura', 'bloccato', 'bloccata', 'intrappolato', 'intrappolata'], label: 'Soglia', meanings: [
    'chiavi, serrature e porte chiuse parlano spesso di accessi negati o desiderati: qualcosa che vuoi raggiungere ma non riesci ancora ad aprire',
    'questo simbolo emerge quando ti senti bloccato davanti a un passaggio che non sai ancora come attraversare',
    'una porta chiusa nel sogno non significa necessariamente un rifiuto definitivo: a volte è solo un invito ad aspettare il momento giusto'
  ]},
  { keywords: ['fantasma', 'fantasmi', 'spirito', 'presenza'], label: 'Presenza invisibile', meanings: [
    'presenze non del tutto definite nel sogno spesso incarnano emozioni o ricordi non ancora del tutto elaborati',
    "questo simbolo compare quando qualcosa del passato continua a farsi sentire, anche se pensavi di averlo lasciato andare",
    "una presenza indefinita nel sogno può rappresentare un pensiero che ti accompagna senza che tu riesca a metterlo del tutto a fuoco"
  ]},
  { keywords: ['esplosione', 'esplodere', 'bomba', 'guerra', 'battaglia', 'combattimento'], label: 'Conflitto', meanings: [
    'scene di conflitto o distruzione riflettono spesso tensioni interiori che cercano una via di scarico o di risoluzione',
    "questo simbolo emerge quando qualcosa dentro di te è arrivato a un punto di rottura, o teme di arrivarci presto",
    'un conflitto nel sogno può rappresentare uno scontro tra due parti di te che stanno tirando in direzioni opposte'
  ]},
  { keywords: ['spiaggia', 'sole', 'tramonto', 'alba'], label: 'Luce naturale', meanings: [
    'luce, albe e tramonti accompagnano spesso momenti di passaggio, la chiusura o l\'apertura di un ciclo emotivo',
    'questo simbolo suggerisce che una fase si sta chiudendo, o aprendo, in modo più naturale e meno traumatico di quanto temi',
    'una luce calda nel sogno spesso indica che, nonostante tutto, c\'è una parte di te che si sente più in pace del solito'
  ]}
];

const positiveWords = ['felice', 'felicità', 'gioia', 'sereno', 'serena', 'pace', 'amore', 'libertà', 'libero', 'libera', 'leggero', 'leggera', 'luce', 'sorriso', 'calma', 'abbraccio', 'volare', 'festa', 'ridere', 'risata'];
const negativeWords = ['paura', 'ansia', 'angoscia', 'terrore', 'urlo', 'urlare', 'piangere', 'pianto', 'morte', 'morire', 'buio', 'solo', 'sola', 'perso', 'persa', 'smarrito', 'smarrita', 'cadere', 'inseguito', 'inseguita', 'soffocare', 'intrappolato', 'intrappolata', 'rabbia', 'tradimento', 'panico', 'incubo'];
const stopWords = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'ma', 'che', 'non', 'come', 'poi', 'quando', 'mentre', 'anche', 'più', 'molto', 'questo', 'questa', 'quello', 'quella', 'mi', 'ti', 'si', 'ci', 'vi', 'li', 'ne', 'sono', 'sei', 'è', 'siamo', 'siete', 'ero', 'eri', 'era', 'eravamo', 'eravate', 'erano', 'ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'avevo', 'aveva', 'stavo', 'stava', 'stavamo', 'mio', 'mia', 'miei', 'mie', 'tuo', 'tua', 'suo', 'sua', 'loro', 'nostro', 'nostra', 'del', 'della', 'dello', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'nel', 'nella', 'nello', 'nei', 'negli', 'nelle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'sul', 'sulla', 'sullo', 'sui', 'sugli', 'sulle', 'quindi', 'però', 'cioè', 'cosa', 'cose', 'dove', 'chi', 'cui', 'se', 'già', 'ancora', 'sempre', 'mai', 'così', 'tutto', 'tutti', 'tutta', 'tutte']);
const connectors = ['Accanto a questo, ', "C'è poi ", 'Non meno importante: ', 'A questo si intreccia ', 'Un altro filo del sogno riguarda ', 'Vale la pena notare anche '];
const openings = [
  (s) => `Il sogno si apre così: «${s}». Da qui parte il filo che proviamo a seguire.`,
  (s) => `Colpisce, in questo racconto, il punto in cui dici: «${s}».`,
  (s) => `Partiamo da un dettaglio che hai scritto tu stesso: «${s}».`,
  (s) => `C'è un'immagine che resta impressa: «${s}».`
];
const moodVariants = {
  luminoso: [
    'Il tono emotivo che attraversa il racconto è disteso: sembra che questo sogno rifletta un momento di equilibrio, o un bisogno di leggerezza che sta finalmente trovando spazio nella tua vita da sveglio.',
    'Nel complesso il sogno respira con calma: più che un allarme, sembra la fotografia di una fase in cui ti senti relativamente centrato.',
    "L'atmosfera generale è più serena che inquieta - vale la pena chiedersi cosa, nella tua vita, sta contribuendo a questa sensazione di respiro."
  ],
  inquieto: [
    'Il tono emotivo che attraversa il racconto è teso: il sogno sembra dare voce a una preoccupazione o una tensione che chiede di essere riconosciuta, non necessariamente risolta subito.',
    "C'è una corrente di disagio che percorre l'intero racconto - non per allarmarti, ma per suggerirti che qualcosa dentro di te sta chiedendo attenzione.",
    'Il sogno porta con sé un peso emotivo evidente: prova a chiederti, senza giudicarti, da dove viene questa tensione nella tua vita reale.'
  ],
  ambivalente: [
    'Il racconto non pende chiaramente né verso la leggerezza né verso il disagio: è un sogno più contemplativo, forse legato a un momento di passaggio o di attesa.',
    'L\'atmosfera resta sospesa tra due poli, come se il sogno stesso non sapesse ancora se stia elaborando qualcosa di buono o di difficile.',
    'Il tono emotivo è misto, quasi in equilibrio precario - spesso è il segno di una fase di transizione, più che di una crisi o di una svolta netta.'
  ]
};
const closings = [
  'Questa lettura nasce dal confronto tra le tue parole e un dizionario simbolico generale: non è una previsione né una diagnosi, ma uno spunto per osservarti con più attenzione.',
  'Prendi questa interpretazione come un punto di partenza, non come una verità assoluta: il significato più autentico del sogno lo conosci solo tu.',
  'Nessuna lettura simbolica sostituisce ciò che senti tu stesso ripensando al sogno: usa queste righe come una lente in più, non come l\'unica.',
  'Come sempre in questi casi, il valore di questa interpretazione sta più nelle domande che apre che nelle risposte che offre.'
];

function seedFrom(lower) {
  let h = BigInt('1125899906842597');
  const mod = BigInt('18446744073709551616'); // 2^64, per restare in un range gestibile
  for (const c of lower) {
    h = (h * BigInt(31) + BigInt(c.codePointAt(0))) % mod;
  }
  return Number(h % BigInt(2147483647));
}

// Generatore pseudo-casuale seedato (mulberry32), deterministico.
function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}

function shuffle(rand, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function extractPersonalKeywords(lower) {
  const words = (lower.match(/[a-zàèéìòù']+/g) || []).filter(w => w.length >= 4 && !stopWords.has(w));
  if (words.length === 0) return [];
  const counts = {};
  words.forEach((w, i) => {
    if (!counts[w]) counts[w] = { count: 0, firstIndex: i };
    counts[w].count++;
  });
  return Object.entries(counts)
    .sort((a, b) => b[1].count - a[1].count || a[1].firstIndex - b[1].firstIndex)
    .slice(0, 3)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function firstSnippet(content) {
  const firstSentence = content.split(/[.!?\n]/).find(s => s.trim().length > 0) || content;
  const words = firstSentence.trim().split(/\s+/).filter(Boolean);
  const snippet = words.slice(0, 14).join(' ');
  return words.length > 14 ? snippet + '…' : snippet;
}

function buildTitle(rand, symbolLabels, mood) {
  if (symbolLabels.length === 0) {
    const options = {
      luminoso: ['Un sogno di quiete', 'Un respiro leggero', 'Una parentesi serena'],
      inquieto: ['Un sogno inquieto', 'Una tensione notturna', 'Un allarme silenzioso'],
      ambivalente: ['Un sogno sospeso', 'Un passaggio incerto', 'Un equilibrio precario']
    }[mood];
    return pick(rand, options);
  }
  const main = symbolLabels[0];
  const templates = [`Il sogno di ${main}`, `Tra le immagini di ${main}`, `Ciò che porta con sé ${main}`];
  const base = pick(rand, templates);
  return symbolLabels.length > 1 ? `${base} e ${symbolLabels[1].toLowerCase()}` : base;
}

function interpret(rawContent) {
  const content = (rawContent || '').trim();
  const lower = content.toLowerCase();
  const rand = mulberry32(seedFrom(lower));

  const matchedSymbols = symbolDictionary.filter(s => s.keywords.some(k => lower.includes(k)));
  const positiveHits = positiveWords.filter(w => lower.includes(w)).length;
  const negativeHits = negativeWords.filter(w => lower.includes(w)).length;
  const mood = positiveHits > negativeHits ? 'luminoso' : (negativeHits > positiveHits ? 'inquieto' : 'ambivalente');

  const personalKeywords = matchedSymbols.length === 0 ? extractPersonalKeywords(lower) : [];
  const symbolLabels = matchedSymbols.length > 0 ? matchedSymbols.map(s => s.label) : personalKeywords;

  const title = buildTitle(rand, symbolLabels, mood);

  const paragraphs = [];
  const snippet = firstSnippet(content);
  if (snippet) paragraphs.push(pick(rand, openings)(snippet));

  if (matchedSymbols.length > 0) {
    const ordered = shuffle(rand, matchedSymbols);
    let body = '';
    ordered.forEach((symbol, index) => {
      const meaning = pick(rand, symbol.meanings);
      if (index === 0) {
        body += `Il primo elemento che risalta è ${symbol.label.toLowerCase()}: ${meaning}. `;
      } else {
        body += `${pick(rand, connectors)}${symbol.label.toLowerCase()} - ${meaning}. `;
      }
    });
    paragraphs.push(body.trim());
  } else if (personalKeywords.length > 0) {
    const intro = pick(rand, [
      'Non compaiono simboli tra quelli più classici della tradizione onirica, ma alcune parole ricorrono più delle altre nel tuo racconto e probabilmente portano il senso più personale di questo sogno: ',
      'Il tuo sogno non richiama gli archetipi più comuni, ma alcuni termini tornano più volte - vale la pena partire da lì: '
    ]);
    const kwPhrase = personalKeywords.map(k => k.toLowerCase()).join(', ');
    paragraphs.push(`${intro}${kwPhrase}. Prova a chiederti cosa rappresentano per te nella vita reale, e quale emozione portano con sé quando ci pensi.`);
  } else {
    paragraphs.push("Il racconto è troppo breve o generico per individuare simboli specifici. Prova ad aggiungere qualche dettaglio in più - luoghi, persone, oggetti, cosa provavi - per un'interpretazione più ricca.");
  }

  paragraphs.push(pick(rand, moodVariants[mood]));
  paragraphs.push(pick(rand, closings));

  return {
    title,
    interpretation: paragraphs.join('\n\n'),
    symbols: symbolLabels,
    mood
  };
}

module.exports = { interpret };
