/* Il mio inglese — logica app (vanilla JS, nessun framework) */
(function () {
  'use strict';
  var D = window.DATA;

  /* ---------- storage ---------- */
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  var fav = new Set(load('fav', []));
  var review = new Set(load('review', []));
  var recent = load('recent', []);
  function saveFav() { save('fav', Array.from(fav)); }
  function saveReview() { save('review', Array.from(review)); }
  function saveRecent() { save('recent', recent); }

  /* ---------- helpers ---------- */
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function bold(s) { return esc(s).split('**').map(function (x, i) { return i % 2 ? '<strong>' + x + '</strong>' : x; }).join(''); }
  function markedHtml(t) {
    var s = esc(t).split('//').join('').split('/').join('');
    s = s.replace(/\*\*(.+?)\*\*/g, '<b class="st">$1</b>');
    return s.split('').join('<span class="pz">//</span>').split('').join('<span class="pz">/</span>');
  }
  // parole che la voce del telefono legge male → le facciamo pronunciare con un omofono/spelling corretto
  var SAY = { hour: 'our' };
  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var say = SAY[text.trim().toLowerCase()] || text;
      var u = new SpeechSynthesisUtterance(say);
      u.lang = 'en-GB'; u.rate = 0.9;
      var vs = speechSynthesis.getVoices();
      var v = vs.filter(function (x) { return /^en(-|_)?(GB|US|AU)?/i.test(x.lang); })[0];
      if (v) u.voice = v;
      speechSynthesis.speak(u);
    } catch (e) {}
  }
  // iOS: "sblocca" la sintesi vocale al primo tocco (altrimenti a volte resta muta)
  var voiceReady = false;
  document.addEventListener('touchstart', function () {
    if (voiceReady || !('speechSynthesis' in window)) return;
    voiceReady = true;
    try { var w = new SpeechSynthesisUtterance(' '); w.volume = 0; speechSynthesis.speak(w); } catch (e) {}
  }, { once: false, passive: true });
  function keyOf(en) { return en.toLowerCase().replace(/^(to be |to have |to |a |an |the )/, ''); }

  /* ---------- icons (SVG puliti) ---------- */
  var IC = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/></svg>',
    regole: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z"/><path d="M9 8h6M9 12h6"/></svg>',
    vocab: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h10M4 18h7"/></svg>',
    frasi: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H8l-4 4V5a2 2 0 012-2h13a2 2 0 012 2z"/></svg>',
    flash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="13" rx="3"/><path d="M7 9h6"/></svg>',
    heart: function (on) { return '<svg viewBox="0 0 24 24" ' + (on ? 'fill="currentColor" stroke="none"' : 'fill="none" stroke="currentColor" stroke-width="1.8"') + '><path d="M12 21s-7-4.6-9.3-8.2C1 10 2 6.5 5.2 6 7 5.7 8.6 6.7 12 9.5 15.4 6.7 17 5.7 18.8 6 22 6.5 23 10 21.3 12.8 19 16.4 12 21 12 21z"/></svg>'; },
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 8.5a4 4 0 010 7"/></svg>'
  };

  /* ---------- tab bar ---------- */
  var TABS = [
    { id: 'home', label: 'Home', ic: IC.home },
    { id: 'regole', label: 'Regole', ic: IC.regole },
    { id: 'vocab', label: 'Vocabolario', ic: IC.vocab },
    { id: 'frasi', label: 'Modi di dire', ic: IC.frasi },
    { id: 'flashcard', label: 'Flashcard', ic: IC.flash }
  ];
  function renderTabs() {
    var el = document.getElementById('tabbar');
    el.innerHTML = TABS.map(function (t) {
      return '<button data-act="go" data-arg="' + t.id + '" class="' + (route.name === t.id ? 'active' : '') + '">' + t.ic + '<span>' + t.label + '</span></button>';
    }).join('');
  }

  /* ---------- favorites / recent ---------- */
  function favBtn(id) { var on = fav.has(id); return '<button class="iconbtn fav ' + (on ? 'on' : '') + '" data-act="fav" data-arg="' + id + '" aria-label="Preferito">' + IC.heart(on) + '</button>'; }
  function speakBtn(text) { return '<button class="iconbtn" data-act="speak" data-arg="' + esc(text) + '" aria-label="Ascolta">' + IC.speaker + '</button>'; }
  function pushRecent(item) {
    recent = recent.filter(function (r) { return r.id !== item.id; });
    recent.unshift(item); if (recent.length > 6) recent = recent.slice(0, 6); saveRecent();
  }

  /* ---------- rendering pieces ---------- */
  function ruleCard(r, open) {
    var desc = (r.items[0] && r.items[0].s ? r.items[0].s.replace(/\*\*/g, '') : '');
    var chars = r.items.map(function (i) { return i.s || ''; }).join(' ').length;
    var lunga = chars > 500 ? '<span class="lunga">LUNGA</span>' : '';
    var body = r.items.map(function (it) {
      if (it.t === 'exp') return '<p class="exp">' + bold(it.s) + '</p>';
      return '<div class="exline ' + it.t + '"><b>' + (it.t === 'wrong' ? '✗' : '✓') + '</b>' + esc(it.s) + '</div>';
    }).join('');
    return '<div class="card ' + (open ? 'open' : '') + '" data-rule="' + r.n + '">' +
      '<div class="head" data-act="rule" data-arg="' + r.n + '"><span class="num">' + r.n + '</span>' +
      '<span class="ctitle">' + esc(r.title) + lunga + (open ? '' : '<span class="cdesc">' + esc(desc.slice(0, 70)) + (desc.length > 70 ? '…' : '') + '</span>') + '</span>' +
      favBtn('r' + r.n) + '<span class="chev">›</span></div>' +
      '<div class="body"><div class="body-in">' + body + '</div></div></div>';
  }
  function vocRow(v, i) {
    return '<div class="row">' + speakBtn(v.en.replace(/\(.*?\)/g, '')) +
      '<div class="main"><div class="line"><span class="en">' + esc(v.en) + '</span>' +
      (v.extra ? '<span class="pr">/' + esc(v.extra) + '/</span>' : '') +
      '<span class="it">' + esc(v.it) + '</span></div></div>' + favBtn('v' + i) + '</div>';
  }
  function idiRow(d, i) {
    return '<div class="row"><div class="main"><div class="line"><span class="en">' + esc(d.en) + '</span>' +
      '<span class="it">' + esc(d.it) + '</span></div>' + (d.ex ? '<div class="exq">' + esc(d.ex) + '</div>' : '') + '</div>' +
      favBtn('i' + i) + '</div>';
  }
  function alphaList(arr, rowFn) {
    var out = '', letter = '';
    arr.forEach(function (x) {
      var L = keyOf(x.d.en)[0].toUpperCase();
      if (L !== letter) { letter = L; out += '<div class="letter">' + L + '</div>'; }
      out += rowFn(x.d, x.i);
    });
    return out || '<div class="empty">Nessun risultato.</div>';
  }

  /* ---------- screens ---------- */
  function screenHtml() {
    if (route.name === 'home') return home();
    if (route.name === 'regole') return listScreen('Regole', 'Cerca una regola…', regoleBody);
    if (route.name === 'vocab') return listScreen('Vocabolario', 'Cerca una parola…', vocabBody);
    if (route.name === 'frasi') return listScreen('Modi di dire', 'Cerca un modo di dire…', frasiBody);
    if (route.name === 'phrasal') return listScreen('Phrasal verbs', 'Cerca un phrasal verb…', phrasalBody, true);
    if (route.name === 'flashcard') return flashScreen();
    if (route.name === 'canzoni') return listScreen('Canzoni', 'Cerca…', canzoniBody, true);
    if (route.name === 'racconti') return raccontiScreen();
    if (route.name === 'schemi') return schemiScreen();
    if (route.name === 'racc') return raccDetail(route.arg);
    if (route.name === 'preferiti') return preferitiScreen();
    if (route.name === 'componi') return componiScreen();
    if (route.name === 'composed') return composedScreen();
    return home();
  }
  function topBar(title, back) {
    return '<div class="top">' + (back ? '<button class="back" data-act="go" data-arg="' + back + '">‹ Indietro</button>' : '<span class="title">' + esc(title) + '</span>') + '<span class="spacer"></span></div>';
  }
  function listScreen(title, ph, bodyFn, back) {
    return topBar(title, back ? 'home' : null) +
      '<div class="search"><input id="q" type="search" placeholder="' + ph + '" autocomplete="off"></div>' +
      '<main class="fade" id="body">' + bodyFn('') + '</main>';
  }
  var regCat = 'all'; // categoria selezionata nel tab Regole
  function regoleBody(term) {
    var t = term.toLowerCase();
    var cats = D.catOrder || [];
    function match(r) { return !t || (r.title + ' ' + r.items.map(function (i) { return i.s; }).join(' ')).toLowerCase().indexOf(t) >= 0; }
    var matched = D.rules.filter(match);
    // barra dei chip (categorie), con conteggio in base alla ricerca
    var chips = '<button class="chip2 ' + (regCat === 'all' ? 'on' : '') + '" data-act="regcat" data-arg="all">Tutte (' + matched.length + ')</button>';
    cats.forEach(function (c) {
      var n = matched.filter(function (r) { return r.cat === c; }).length;
      if (!n) return;
      chips += '<button class="chip2 ' + (regCat === c ? 'on' : '') + '" data-act="regcat" data-arg="' + esc(c) + '">' + esc(c) + ' (' + n + ')</button>';
    });
    var chipbar = '<div class="chips">' + chips + '</div>';
    var shown = matched.filter(function (r) { return regCat === 'all' || r.cat === regCat; });
    if (!shown.length) return chipbar + '<div class="empty">Nessuna regola trovata.</div>';
    // raggruppa per categoria, nell'ordine definito
    var out = '';
    cats.forEach(function (c) {
      if (regCat !== 'all' && c !== regCat) return;
      var rs = shown.filter(function (r) { return r.cat === c; });
      if (!rs.length) return;
      out += '<div class="hgroup">' + esc(c) + '</div>' + rs.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
    });
    return chipbar + out;
  }
  function vocabBody(term) {
    var t = term.toLowerCase();
    var arr = D.vocab.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return !t || (x.d.en + ' ' + x.d.it + ' ' + x.d.extra).toLowerCase().indexOf(t) >= 0; });
    return alphaList(arr, vocRow);
  }
  function frasiBody(term) {
    var t = term.toLowerCase();
    var arr = D.idiomi.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return !t || (x.d.en + ' ' + x.d.it + ' ' + x.d.ex).toLowerCase().indexOf(t) >= 0; });
    return alphaList(arr, idiRow);
  }
  function phrRow(d, i) {
    return '<div class="row">' + speakBtn(d.pv.replace(/^to /, '')) +
      '<div class="main"><div class="line"><span class="en">' + esc(d.pv) + '</span>' +
      '<span class="it">' + esc(d.it) + '</span></div>' +
      '<div class="exq">(= ' + esc(d.eq) + ') · ' + esc(d.sep) + '</div>' +
      (d.ex ? '<div class="exq">' + esc(d.ex) + '</div>' : '') + '</div>' + favBtn('p' + i) + '</div>';
  }
  function phrasalBody(term) {
    var t = term.toLowerCase();
    var arr = (D.phrasal || []).map(function (d, i) { return { d: d, i: i }; })
      .filter(function (x) { return !t || (x.d.pv + ' ' + x.d.it + ' ' + x.d.eq + ' ' + x.d.ex).toLowerCase().indexOf(t) >= 0; });
    arr.sort(function (a, b) { return keyOf(a.d.pv) < keyOf(b.d.pv) ? -1 : 1; });
    if (!arr.length) return '<div class="empty">Nessun risultato.</div>';
    var out = '', letter = '';
    arr.forEach(function (x) {
      var L = keyOf(x.d.pv)[0].toUpperCase();
      if (L !== letter) { letter = L; out += '<div class="letter">' + L + '</div>'; }
      out += phrRow(x.d, x.i);
    });
    return out;
  }
  function canzoniBody(term) {
    var t = term.toLowerCase();
    return D.canzoni.map(function (s) {
      var rows = s.items.filter(function (d) { return !t || (d.en + ' ' + d.it + ' ' + d.ex).toLowerCase().indexOf(t) >= 0; });
      if (!rows.length) return '';
      return '<div class="hgroup">' + esc(s.song) + ' — ' + esc(s.artist) + '</div>' +
        rows.map(function (d) { return '<div class="row"><div class="main"><div class="line"><span class="en">' + esc(d.en) + '</span><span class="it">' + esc(d.it) + '</span></div>' + (d.ex ? '<div class="exq">' + esc(d.ex) + '</div>' : '') + '</div></div>'; }).join('');
    }).join('') || '<div class="empty">Nessun risultato.</div>';
  }
  function raccontiScreen() {
    var list = D.racconti.map(function (s, i) {
      var m = s.title.match(/^(.*?)\s*\((.*?)\)\s*$/);
      var title = m ? m[1].trim() : s.title, date = m ? m[2] : '';
      return '<div class="card" data-act="go2" data-arg="racc:' + i + '"><div class="head"><span class="ctitle">' + esc(title) + (date ? '<span class="cdesc">' + esc(date) + '</span>' : '') + '</span><span class="chev">›</span></div></div>';
    }).join('');
    return topBar('Racconti', 'home') + '<main class="fade">' + list + '</main>';
  }
  function raccDetail(i) {
    var s = D.racconti[i]; if (!s) return home();
    var body = s.blocks.map(function (b) {
      if (b.t === 'label') return '<div class="lab">' + esc(b.s) + '</div>';
      if (b.t === 'plain') return '<p class="plain">' + esc(b.s) + '</p>';
      if (b.t === 'marked') return '<p class="marked">' + markedHtml(b.s) + '</p>';
      if (b.t === 'note') return '<p class="note">' + esc(b.s) + '</p>';
      if (b.t === 'pron') return '<div class="pron">' + b.items.map(function (p) { return '<div class="pchip"><b>' + esc(p.w) + '</b> ' + esc(p.h) + '</div>'; }).join('') + '</div>';
      return '';
    }).join('');
    var m = s.title.match(/^(.*?)\s*\(/); var title = m ? m[1].trim() : s.title;
    return topBar(title, 'racconti') + '<main class="fade"><div style="background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.06);padding:16px">' + body + '</div></main>';
  }

  /* ---------- schemi (tabelle di riferimento rapido) ---------- */
  function schemiScreen() {
    var list = (D.schemi || []).map(function (s) {
      var head = '<tr>' + s.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
      var rows = s.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('');
      return '<div class="schemecard">' +
        '<div class="schemetitle">' + esc(s.title) + '</div>' +
        '<div class="tablewrap"><table class="scheme"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
        (s.note ? '<div class="schemenote">' + esc(s.note) + '</div>' : '') +
        '</div>';
    }).join('') || '<div class="empty">Nessuno schema ancora.</div>';
    return topBar('Schemi', 'home') + '<main class="fade">' + list + '</main>';
  }

  /* ---------- flashcard ---------- */
  var card = null, revealed = false;
  // mazzo flashcard = TUTTO ciò che hai incontrato: vocaboli + modi di dire + espressioni delle canzoni
  var flashDeck = load('flashDeck', 'all'); // 'all' | 'voc' | 'phr' | 'pv'
  function flashPool() {
    var a = [];
    D.vocab.forEach(function (d, i) { a.push({ id: 'v' + i, en: d.en, it: d.it, pr: d.extra, ty: 'voc' }); });
    D.idiomi.forEach(function (d, i) { a.push({ id: 'i' + i, en: d.en, it: d.it, pr: '', ty: 'phr' }); });
    D.canzoni.forEach(function (s, si) { s.items.forEach(function (d, ii) { a.push({ id: 's' + si + '_' + ii, en: d.en, it: d.it, pr: '', ty: 'phr' }); }); });
    if (D.phrasal) D.phrasal.forEach(function (d, i) { a.push({ id: 'p' + i, en: d.pv, it: d.it + ' (= ' + d.eq + ', ' + d.sep + ')', pr: '', ty: 'pv' }); });
    return a;
  }
  function deckPool() {
    var all = flashPool();
    if (flashDeck === 'voc') return all.filter(function (x) { return x.ty === 'voc'; });
    if (flashDeck === 'phr') return all.filter(function (x) { return x.ty === 'phr'; });
    if (flashDeck === 'pv') return all.filter(function (x) { return x.ty === 'pv'; });
    return all;
  }
  function pickCard() {
    var all = deckPool();
    var prev = card ? card.id : null;
    // le carte "da ripassare" compaiono più spesso (x3), ma si avanza SEMPRE a una carta diversa
    var weighted = [];
    all.forEach(function (x) { weighted.push(x); if (review.has(x.id)) { weighted.push(x); weighted.push(x); } });
    var pool = weighted.filter(function (x) { return x.id !== prev; });
    if (!pool.length) pool = all;
    card = pool[Math.floor(Math.random() * pool.length)];
    revealed = false;
  }
  function flashScreen() {
    if (!card) pickCard();
    var word = esc(card.en.replace(/\(.*?\)/g, ''));
    var seg = '<div class="fseg">' +
      '<button class="' + (flashDeck === 'all' ? 'on' : '') + '" data-act="deck" data-arg="all">Tutto</button>' +
      '<button class="' + (flashDeck === 'voc' ? 'on' : '') + '" data-act="deck" data-arg="voc">Vocaboli</button>' +
      '<button class="' + (flashDeck === 'phr' ? 'on' : '') + '" data-act="deck" data-arg="phr">Frasi</button>' +
      '<button class="' + (flashDeck === 'pv' ? 'on' : '') + '" data-act="deck" data-arg="pv">Phrasal</button></div>';
    var body = '<div class="flashwrap"><div class="flash" data-act="reveal">' +
      '<div class="fw">' + esc(card.en) + '</div>' + (card.pr ? '<div class="fpr">/' + esc(card.pr) + '/</div>' : '') +
      (revealed ? '<div class="fa">' + esc(card.it) + '</div>' : '<div class="hint">tocca per vedere la traduzione</div>') + '</div>' +
      '<button class="fspk" data-act="speak" data-arg="' + word + '">' + IC.speaker + '<span>Ascolta</span></button>' +
      (revealed ? '<div class="fbtns"><button class="again" data-act="again">↺ Ripassa</button><button class="know" data-act="know">✓ Conosciuta</button></div>' : '') +
      '<div class="fcount">' + deckPool().length + ' carte' + (review.size ? ' · ' + review.size + ' da ripassare (più frequenti)' : '') + '</div></div>';
    return topBar('Flashcard') + '<main>' + seg + body + '</main>';
  }

  /* ---------- Frase del giorno (componi) ---------- */
  var composePrompt = null;
  function pickCompose() { var p = flashPool(); composePrompt = p[Math.floor(Math.random() * p.length)]; }
  function componiScreen() {
    if (!composePrompt) pickCompose();
    var c = composePrompt, word = esc(c.en.replace(/\(.*?\)/g, ''));
    var saved = load('composed', []);
    return topBar('Frase del giorno') + '<main class="fade">' +
      '<div class="prompt">' +
      '<div class="pl">Scrivi una frase usando:</div>' +
      '<div class="pw">' + esc(c.en) + '</div>' + (c.pr ? '<div class="fpr">/' + esc(c.pr) + '/</div>' : '') +
      '<div class="pt">' + esc(c.it) + '</div>' +
      '<button class="fspk" data-act="speak" data-arg="' + word + '">' + IC.speaker + '<span>Ascolta</span></button>' +
      '</div>' +
      '<textarea id="compose" class="compose" placeholder="Scrivi qui la tua frase in inglese…"></textarea>' +
      '<div class="cbtns"><button class="cbtn check" data-act="compose-check">Controlla</button><button class="cbtn save" data-act="compose-save">Salva</button><button class="cbtn next" data-act="compose-next">Prossima →</button></div>' +
      '<div id="hints"></div>' +
      '<div class="savedlink" data-act="go" data-arg="composed">Le tue frasi salvate (' + saved.length + ') ›</div>' +
      '</main>';
  }
  // Controllo offline: riconosce SOLO gli errori tipici, non tutto.
  function checkSentence(t) {
    var h = [], s = ' ' + t.toLowerCase().replace(/[’]/g, "'") + ' ';
    if (/(go|goes|going|went|come|comes|coming|came|return|returns|returned|get|gets|getting|got|arrive|arrives|arrived)\s+(back\s+)?at\s+home/.test(s)) h.push('“home” col movimento va senza preposizione: return home, get home (non “at home”).');
    if (/keen on to/.test(s)) h.push('“keen on” + -ing (keen on drinking) oppure “keen to” + verbo (keen to drink).');
    if (/\b(don't|doesn't|didn't|can't|won't|isn't|aren't|haven't|hasn't|not)\b[^.!?]*\b(no|nothing|never|nobody|nowhere|none)\b/.test(s)) h.push('Doppia negazione: in inglese si usa UNA sola negazione.');
    if (/check(ed|ing)? out\s+(my\s+)?(e-?mail|mail|inbox)/.test(s)) h.push('Si dice “check my email”, non “check out”.');
    if (/\b(informations|advices|peoples|furnitures|homeworks|breads)\b/.test(s)) h.push('Nome non numerabile → niente plurale (information, advice, people…).');
    if (/\bmore\s+(big|small|old|new|tall|short|fast|slow|hot|cold|nice|easy|young|long|high|low|cheap)\b/.test(s)) h.push('Aggettivo corto → forma in -er (bigger), non “more big”.');
    if (/\bthe most\s+(big|small|old|new|tall|short|fast|slow|hot|cold|nice|easy|young|long|high|low|cheap)\b/.test(s)) h.push('Superlativo corto → the …-est (the biggest), non “the most big”.');
    if (/\bgift(s|ed)?\s+(me|him|her|them|us|a |an |the )/.test(s)) h.push('Come verbo si usa “give” (he gives her…), non “gift”.');
    if (/\beveryday\b/.test(s)) h.push('“everyday” = quotidiano (aggettivo); “ogni giorno” = every day (staccato).');
    if (/\ba\s+[aeiou]/.test(s)) h.push('Prima di un suono vocalico va “an” (an apple, an hour).');
    if (/\bmuch\s+(cars|people|friends|books|things|dogs|cats|children|apples|words|days|years|houses)\b/.test(s)) h.push('Con i numerabili plurali si usa “many”, non “much”.');
    if (/\b(he|she|it)\s+don't\b/.test(s)) h.push('Terza persona: doesn’t (non “don’t”): he/she/it doesn’t.');
    if (/\bi'm keen\b[^.]*\bto\b/.test(s) && !/keen to /.test(s)) { /* già coperto sopra */ }
    return h;
  }
  function composedScreen() {
    var arr = load('composed', []);
    var body = arr.length ? arr.map(function (x, i) {
      return '<div class="row"><div class="main"><div class="en">' + esc(x.p) + '</div><div class="cs">' + esc(x.s) + '</div><div class="dt">' + esc(x.d || '') + '</div></div><button class="iconbtn" data-act="compose-del" data-arg="' + i + '" aria-label="Elimina">✕</button></div>';
    }).join('') : '<div class="empty">Nessuna frase salvata ancora.<br>Scrivi una frase in “Frase del giorno” e salvala.</div>';
    return topBar('Le tue frasi', 'componi') + '<main class="fade"><p class="note" style="padding:0 4px 4px">Copiale e portamele in chat per la correzione a fondo, o incollale su LanguageTool.</p>' + body + '</main>';
  }

  /* ---------- home ---------- */
  function home() {
    return '<div class="top"><span class="title">Il mio inglese</span><span class="spacer"></span><span style="color:#b0b0b6;font-size:12px;font-weight:600">v15</span></div>' +
      '<div class="search"><input id="q" type="search" placeholder="Cerca ovunque (regole, parole, racconti…)" autocomplete="off"></div>' +
      '<main class="fade" id="body">' + homeBody('') + '</main>';
  }
  function homeBody(term) {
    if (term && term.trim()) return searchAll(term.trim().toLowerCase());
    var out = '<button class="bigbtn" data-act="go" data-arg="flashcard">▶︎  Riprendi studio</button>' +
      '<button class="bigbtn alt" data-act="go" data-arg="componi">✎  Frase del giorno</button>';
    if (recent.length) {
      out += '<div class="hgroup">Ultime aperte</div>';
      out += recent.map(function (r) { return '<div class="card" data-act="go2" data-arg="' + r.id + '"><div class="head"><span class="ctitle">' + esc(r.label) + '</span><span class="chev">›</span></div></div>'; }).join('');
    }
    out += '<div class="hgroup">Sezioni</div><div class="tiles">' +
      tile('regole', '📚', 'Regole', D.rules.length + ' regole') +
      tile('schemi', '📊', 'Schemi', (D.schemi ? D.schemi.length : 0) + ' tabelle') +
      tile('vocab', '🔤', 'Vocabolario', D.vocab.length + ' parole') +
      tile('frasi', '💬', 'Modi di dire', D.idiomi.length + ' frasi') +
      tile('phrasal', '🔗', 'Phrasal verbs', (D.phrasal ? D.phrasal.length : 0) + ' verbi') +
      tile('flashcard', '🃏', 'Flashcard', 'Ripassa') +
      tile('componi', '✍️', 'Frase del giorno', 'Esercitati') +
      tile('canzoni', '🎵', 'Canzoni', D.canzoni.length + ' brani') +
      tile('racconti', '📖', 'Racconti', D.racconti.length + ' testi') +
      tile('preferiti', '⭐', 'Preferiti', fav.size + ' salvati') +
      '</div>';
    return out;
  }
  function tile(id, ic, label, sub) {
    return '<div class="tile" data-act="go" data-arg="' + id + '"><div class="ti">' + ic + '</div><div class="tl">' + label + '</div><div class="ts">' + sub + '</div></div>';
  }
  function searchAll(t) {
    var out = '';
    var rr = D.rules.filter(function (r) { return (r.title + ' ' + r.items.map(function (i) { return i.s; }).join(' ')).toLowerCase().indexOf(t) >= 0; });
    if (rr.length) out += '<div class="hgroup">Regole (' + rr.length + ')</div>' + rr.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
    var vv = D.vocab.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.en + ' ' + x.d.it).toLowerCase().indexOf(t) >= 0; });
    if (vv.length) out += '<div class="hgroup">Vocaboli (' + vv.length + ')</div>' + vv.map(function (x) { return vocRow(x.d, x.i); }).join('');
    var ii = D.idiomi.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.en + ' ' + x.d.it).toLowerCase().indexOf(t) >= 0; });
    if (ii.length) out += '<div class="hgroup">Modi di dire (' + ii.length + ')</div>' + ii.map(function (x) { return idiRow(x.d, x.i); }).join('');
    var pp = (D.phrasal || []).map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.pv + ' ' + x.d.it + ' ' + x.d.eq).toLowerCase().indexOf(t) >= 0; });
    if (pp.length) out += '<div class="hgroup">Phrasal verbs (' + pp.length + ')</div>' + pp.map(function (x) { return phrRow(x.d, x.i); }).join('');
    var cc = D.racconti.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.blocks.filter(function (b) { return b.s; }).map(function (b) { return b.s; }).join(' ').toLowerCase().indexOf(t) >= 0; });
    if (cc.length) out += '<div class="hgroup">Racconti (' + cc.length + ')</div>' + cc.map(function (x) { var m = x.s.title.match(/^(.*?)\s*\(/); return '<div class="card" data-act="go2" data-arg="racc:' + x.i + '"><div class="head"><span class="ctitle">' + esc(m ? m[1].trim() : x.s.title) + '</span><span class="chev">›</span></div></div>'; }).join('');
    return out || '<div class="empty">Nessun risultato per “' + esc(t) + '”.</div>';
  }

  /* ---------- preferiti ---------- */
  function preferitiScreen() {
    var out = '';
    var rr = D.rules.filter(function (r) { return fav.has('r' + r.n); });
    if (rr.length) out += '<div class="hgroup">Regole</div>' + rr.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
    var vv = []; D.vocab.forEach(function (d, i) { if (fav.has('v' + i)) vv.push(vocRow(d, i)); });
    if (vv.length) out += '<div class="hgroup">Vocaboli</div>' + vv.join('');
    var ii = []; D.idiomi.forEach(function (d, i) { if (fav.has('i' + i)) ii.push(idiRow(d, i)); });
    if (ii.length) out += '<div class="hgroup">Modi di dire</div>' + ii.join('');
    var pp = []; (D.phrasal || []).forEach(function (d, i) { if (fav.has('p' + i)) pp.push(phrRow(d, i)); });
    if (pp.length) out += '<div class="hgroup">Phrasal verbs</div>' + pp.join('');
    if (!out) out = '<div class="empty">Nessun preferito ancora.<br>Tocca il cuore accanto a una regola o parola per salvarla qui.</div>';
    return topBar('Preferiti', 'home') + '<main class="fade">' + out + '</main>';
  }

  /* ---------- render + events ---------- */
  function render() { document.getElementById('screen').innerHTML = screenHtml(); renderTabs(); }
  function go(name, arg) { route = { name: name, arg: arg }; window.scrollTo(0, 0); render(); }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]'); if (!el) return;
    var act = el.getAttribute('data-act'), arg = el.getAttribute('data-arg');
    if (act === 'go') go(arg);
    else if (act === 'go2') {
      if (arg.indexOf('racc:') === 0) { var i = +arg.slice(5); var t = (D.racconti[i].title.match(/^(.*?)\s*\(/) || [, D.racconti[i].title])[1].trim(); pushRecent({ id: arg, label: 'Racconto: ' + t }); go('racc', i); }
      else if (arg.indexOf('rule:') === 0) { var rn = +arg.slice(5); openRules.add(rn); go('regole'); setTimeout(function () { var rc = document.querySelector('.card[data-rule="' + rn + '"]'); if (rc) rc.scrollIntoView({ block: 'center' }); }, 50); }
    }
    else if (act === 'rule') {
      // apri/chiudi la card SUL POSTO, senza ricostruire la schermata (niente salto di scroll)
      var n = +arg, cardEl = el.closest('.card');
      if (openRules.has(n)) { openRules.delete(n); if (cardEl) cardEl.classList.remove('open'); }
      else {
        openRules.add(n); if (cardEl) cardEl.classList.add('open');
        var r = D.rules.find(function (x) { return x.n === n; });
        if (r) pushRecent({ id: 'rule:' + n, label: 'Regola ' + n + ': ' + r.title });
      }
    }
    else if (act === 'regcat') { regCat = arg; var qc = document.getElementById('q'); var bc = document.getElementById('body'); if (bc) bc.innerHTML = regoleBody(qc ? qc.value : ''); window.scrollTo(0, 0); }
    else if (act === 'fav') { if (fav.has(arg)) fav.delete(arg); else fav.add(arg); saveFav(); render(); e.stopPropagation(); }
    else if (act === 'speak') { speak(arg); e.stopPropagation(); }
    else if (act === 'reveal') { revealed = true; render(); }
    else if (act === 'know') { review.delete(card.id); saveReview(); pickCard(); render(); }
    else if (act === 'again') { review.add(card.id); saveReview(); pickCard(); render(); }
    else if (act === 'compose-check') {
      var cv = (document.getElementById('compose') || {}).value || '', box = document.getElementById('hints');
      if (!box) return;
      if (!cv.trim()) { box.innerHTML = '<div class="hint2">Scrivi prima una frase.</div>'; return; }
      var hs = checkSentence(cv);
      box.innerHTML = hs.length
        ? '<div class="hint2 warn"><b>Da controllare:</b>' + hs.map(function (h) { return '<div class="hi">' + esc(h) + '</div>'; }).join('') + '</div>'
        : '<div class="hint2 ok">Nessun errore tipico rilevato. Rileggi comunque, o incolla su LanguageTool per sicurezza.</div>';
    }
    else if (act === 'compose-save') {
      var sv = (document.getElementById('compose') || {}).value || '';
      if (!sv.trim()) return;
      var arr = load('composed', []); arr.unshift({ p: composePrompt.en, s: sv, d: new Date().toLocaleDateString('it-IT') }); save('composed', arr);
      var b = document.getElementById('hints'); if (b) b.innerHTML = '<div class="hint2 ok">Frase salvata. La ritrovi in “Le tue frasi salvate”.</div>';
    }
    else if (act === 'deck') { flashDeck = arg; save('flashDeck', flashDeck); card = null; pickCard(); render(); }
    else if (act === 'compose-next') { pickCompose(); go('componi'); }
    else if (act === 'compose-del') { var a3 = load('composed', []); a3.splice(+arg, 1); save('composed', a3); render(); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    var b = document.getElementById('body'); if (!b) return;
    var term = e.target.value;
    if (route.name === 'home') b.innerHTML = homeBody(term);
    else if (route.name === 'regole') b.innerHTML = regoleBody(term);
    else if (route.name === 'vocab') b.innerHTML = vocabBody(term);
    else if (route.name === 'frasi') b.innerHTML = frasiBody(term);
    else if (route.name === 'phrasal') b.innerHTML = phrasalBody(term);
    else if (route.name === 'canzoni') b.innerHTML = canzoniBody(term);
  });

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }

  var route = { name: 'home' };
  var openRules = new Set();
  render();
})();
