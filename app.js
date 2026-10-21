/* Il mio inglese — logica app (vanilla JS, nessun framework) */
(function () {
  'use strict';
  var D = window.DATA;

  /* ---------- storage ---------- */
  function load(k, def) { try { return JSON.parse(localStorage.getItem(k)) || def; } catch (e) { return def; } }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  var fav = new Set(load('fav', []));
  var review = new Set(load('review', []));
  var recent = load('recent', []); if (recent.length > 3) { recent = recent.slice(0, 3); save('recent', recent); }
  var ruleTag = load('ruleTag', {}); // { '12': 'use', '47': 'learn', ... } — marcatori sulle regole
  function saveFav() { save('fav', Array.from(fav)); }
  function saveReview() { save('review', Array.from(review)); }
  function saveRecent() { save('recent', recent); }
  function saveRuleTag() { save('ruleTag', ruleTag); }
  // marcatori disponibili per le regole (indipendenti dai Preferiti ❤️)
  var RULE_TAGS = {
    use: { label: 'In uso / ripasso', icon: '📌', color: '#0a84ff' },
    want: { label: 'Da usare', icon: '🎯', color: '#ff9500' },
    learn: { label: 'Da capire', icon: '❓', color: '#ff3b30' }
  };
  var RULE_TAG_ORDER = ['use', 'want', 'learn'];

  /* ---------- helpers ---------- */
  function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function posm(s) { return s.replace(/\[\[(.+?)\]\]/g, '<mark class="pos">$1</mark>'); }
  function bold(s) { return posm(esc(s).split('**').map(function (x, i) { return i % 2 ? '<strong>' + x + '</strong>' : x; }).join('')); }
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
      unlockVoice();
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
  // iOS: "sblocca" la sintesi vocale la prima volta che serve (dentro il tocco sul pulsante),
  // non al primo tocco in assoluto: inizializzare l'audio subito bloccava i primi tap sulle card.
  var voiceReady = false;
  function unlockVoice() {
    if (voiceReady || !('speechSynthesis' in window)) return;
    voiceReady = true;
    try { var w = new SpeechSynthesisUtterance(' '); w.volume = 0; speechSynthesis.speak(w); } catch (e) {}
  }
  function keyOf(en) {
    var s = en.toLowerCase(), prev;
    do { prev = s; s = s.replace(/^(to be |to have |to |your |my |his |her |their |our |a |an |the )/, ''); } while (s !== prev);
    return s;
  }
  // Ordina sempre alfabeticamente (indipendentemente dall'ordine in cui sono state scritte nel file sorgente)
  function sortByKey(arr, getEn) { arr.sort(function (a, b) { var ka = keyOf(getEn(a)), kb = keyOf(getEn(b)); return ka < kb ? -1 : ka > kb ? 1 : 0; }); }
  if (D.vocab) sortByKey(D.vocab, function (x) { return x.en; });
  if (D.idiomi) sortByKey(D.idiomi, function (x) { return x.en; });
  if (D.phrasal) sortByKey(D.phrasal, function (x) { return x.pv; });
  if (D.irregolari) sortByKey(D.irregolari, function (x) { return x.en; });

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
    recent.unshift(item); if (recent.length > 3) recent = recent.slice(0, 3); saveRecent();
  }

  /* ---------- rendering pieces ---------- */
  function ruleCard(r, open) {
    var vis = r.items.filter(function (i) { return i.t !== 'audio' && i.t !== 'audioit'; });
    var desc = (vis[0] && vis[0].s ? vis[0].s.replace(/\*\*|\[\[|\]\]/g, '') : '');
    var chars = vis.map(function (i) { return i.s || ''; }).join(' ').length;
    var lunga = chars > 500 ? '<span class="lunga">LUNGA</span>' : '';
    var tag = ruleTag[r.n];
    var dot = tag ? '<span class="tagdot" style="background:' + RULE_TAGS[tag].color + '" title="' + esc(RULE_TAGS[tag].label) + '"></span>' : '';
    var body = vis.map(function (it) {
      if (it.t === 'exp') return '<p class="exp">' + bold(it.s) + '</p>';
      return '<div class="exline ' + it.t + '"><b>' + (it.t === 'wrong' ? '✗' : '✓') + '</b><span>' + posm(esc(it.s)) + '</span></div>';
    }).join('');
    var tagbar = '<div class="tagbar">' + RULE_TAG_ORDER.map(function (k) {
      var on = tag === k, tg = RULE_TAGS[k];
      return '<button class="tagbtn' + (on ? ' on' : '') + '" style="' + (on ? 'background:' + tg.color + ';color:#fff' : '') + '" data-act="ruletag" data-arg="' + r.n + ':' + k + '">' + tg.icon + ' ' + tg.label + '</button>';
    }).join('') + '</div>';
    return '<div class="card ' + (open ? 'open' : '') + '" data-rule="' + r.n + '">' +
      '<div class="head" data-act="rule" data-arg="' + r.n + '"><span class="num">' + r.n + '</span>' +
      '<span class="ctitle">' + esc(r.title) + lunga + (open ? '' : '<span class="cdesc">' + esc(desc.slice(0, 70)) + (desc.length > 70 ? '…' : '') + '</span>') + '</span>' +
      dot + favBtn('r' + r.n) + '<span class="chev">›</span></div>' +
      '<div class="body"><div class="body-in">' + tagbar + body + '</div></div></div>';
  }
  function vocRow(v, i) {
    return '<div class="row">' + speakBtn(v.en.replace(/\(.*?\)/g, '')) +
      '<div class="main"><div class="line"><span class="en">' + esc(v.en) + '</span>' +
      (v.extra ? '<span class="pr">/' + esc(v.extra) + '/</span>' : '') +
      '<span class="it">' + esc(v.it) + '</span></div></div>' + favBtn('v' + i) + '</div>';
  }
  function idiRow(d, i) {
    return '<div class="row"><div class="main"><div class="line"><span class="en">' + esc(d.en) + '</span>' +
      '<span class="it">' + esc(d.it) + '</span></div>' + (d.extra ? '<div class="exq">' + esc(d.extra) + '</div>' : '') + '</div>' +
      favBtn('i' + i) + '</div>';
  }
  function verbRow(d, i) {
    return '<div class="row">' + speakBtn(d.en.replace(/\s*\(.*?\)/g, '')) +
      '<div class="main"><div class="line"><span class="en">' + esc(d.en) + '</span>' +
      '<span class="it">' + esc(d.it) + '</span></div>' +
      '<div class="exq">' + esc(d.past) + '  →  ' + esc(d.pp) + '</div></div>' +
      favBtn('irr' + i) + '</div>';
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
    if (route.name === 'irregolari') return listScreen('Verbi irregolari', 'Cerca un verbo…', irregolariBody, true);
    if (route.name === 'flashcard') return flashScreen();
    if (route.name === 'canzoni') return listScreen('Canzoni', 'Cerca…', canzoniBody, true);
    if (route.name === 'racconti') return raccontiScreen();
    if (route.name === 'schemi') return schemiScreen();
    if (route.name === 'tempi') return tempiScreen();
    if (route.name === 'ascolto') return ascoltoScreen();
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
  var regTag = 'all'; // marcatore selezionato nel tab Regole (all/use/want/learn)
  function regoleBody(term) {
    var t = term.toLowerCase();
    var cats = D.catOrder || [];
    function match(r) { return !t || (r.title + ' ' + r.items.filter(function (i) { return i.t !== 'audio' && i.t !== 'audioit'; }).map(function (i) { return i.s; }).join(' ')).toLowerCase().indexOf(t) >= 0; }
    var matched = D.rules.filter(match);
    // barra dei chip (categorie), con conteggio in base alla ricerca
    var chips = '<button class="chip2 ' + (regCat === 'all' ? 'on' : '') + '" data-act="regcat" data-arg="all">Tutte (' + matched.length + ')</button>';
    cats.forEach(function (c) {
      var n = matched.filter(function (r) { return r.cat === c; }).length;
      if (!n) return;
      chips += '<button class="chip2 ' + (regCat === c ? 'on' : '') + '" data-act="regcat" data-arg="' + esc(c) + '">' + esc(c) + ' (' + n + ')</button>';
    });
    var chipbar = '<div class="chips">' + chips + '</div>';
    // barra dei marcatori (📌/🎯/❓), indipendente dalla categoria
    var tagChips = '<button class="chip2 ' + (regTag === 'all' ? 'on' : '') + '" data-act="regtag" data-arg="all">Tutte le regole</button>';
    RULE_TAG_ORDER.forEach(function (k) {
      var tg = RULE_TAGS[k], n = matched.filter(function (r) { return ruleTag[r.n] === k; }).length;
      var on = regTag === k;
      tagChips += '<button class="chip2 ' + (on ? 'on' : '') + '" style="' + (on ? 'background:' + tg.color + ';border-color:' + tg.color + ';color:#fff' : '') + '" data-act="regtag" data-arg="' + k + '">' + tg.icon + ' ' + tg.label + ' (' + n + ')</button>';
    });
    var tagChipbar = '<div class="chips">' + tagChips + '</div>';
    var shown = matched.filter(function (r) { return (regCat === 'all' || r.cat === regCat) && (regTag === 'all' || ruleTag[r.n] === regTag); });
    if (!shown.length) return chipbar + tagChipbar + '<div class="empty">Nessuna regola trovata.</div>';
    // raggruppa per categoria, nell'ordine definito
    var out = '';
    cats.forEach(function (c) {
      if (regCat !== 'all' && c !== regCat) return;
      var rs = shown.filter(function (r) { return r.cat === c; });
      if (!rs.length) return;
      out += '<div class="hgroup">' + esc(c) + '</div>' + rs.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
    });
    return chipbar + tagChipbar + out;
  }
  function vocabBody(term) {
    var t = term.toLowerCase();
    var arr = D.vocab.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return !t || (x.d.en + ' ' + x.d.it + ' ' + x.d.extra).toLowerCase().indexOf(t) >= 0; });
    return alphaList(arr, vocRow);
  }
  function frasiBody(term) {
    var t = term.toLowerCase();
    var arr = D.idiomi.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return !t || (x.d.en + ' ' + x.d.it + ' ' + x.d.extra).toLowerCase().indexOf(t) >= 0; });
    return alphaList(arr, idiRow);
  }
  function phrRow(d, i) {
    return '<div class="row">' + speakBtn(d.pv.replace(/^to /, '')) +
      '<div class="main"><div class="line"><span class="en">' + esc(d.pv) + '</span>' +
      '<span class="it">' + esc(d.it) + '</span></div>' +
      '<div class="exq">(= ' + esc(d.eq) + ') · ' + esc(d.sep) + '</div>' +
      (d.ex ? '<div class="exq">' + esc(d.ex) + '</div>' : '') + '</div>' + favBtn('p' + i) + '</div>';
  }
  function irregolariBody(term) {
    var t = term.toLowerCase();
    var arr = (D.irregolari || []).map(function (d, i) { return { d: d, i: i }; })
      .filter(function (x) { return !t || (x.d.en + ' ' + x.d.it + ' ' + x.d.past + ' ' + x.d.pp).toLowerCase().indexOf(t) >= 0; });
    var note = '<div class="schemenote" style="margin:0 4px 10px">Nota: <b>be</b> è irregolare anche al presente (I am · you/we/they are · he/she/it is), was/were al passato. <b>Read</b> si scrive uguale in tutte e tre le forme, ma al passato e al participio si pronuncia come "red".</div>';
    return note + alphaList(arr, verbRow);
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
  var openSchemi = new Set();
  var schemaHi = new Set(load('schemaHi', []));
  function saveSchemaHi() { save('schemaHi', Array.from(schemaHi)); }
  function blocksHtml(blocks) {
    return blocks.map(function (b) {
      var h = (b.h ? '<div class="vbh">' + esc(b.h) + '</div>' : '') + (b.sub ? '<div class="vbs">' + esc(b.sub) + '</div>' : '');
      var body = '';
      if (b.type === 'rows') {
        body = b.rows.map(function (r) {
          return '<div class="vrow c-' + (r.c || 'g') + '"><span class="vl">' + esc(r.label) + '</span><span class="vk">' + esc(r.key) + '</span><span class="vx">' + esc(r.ex || '') + (r.it ? '<br><i>' + esc(r.it) + '</i>' : '') + '</span></div>';
        }).join('');
      } else if (b.type === 'flow') {
        body = b.rows.map(function (r) {
          return '<div class="vflow c-' + (r.c || 'b') + '"><div class="vq">' + esc(r.q) + '</div><div class="va">→ ' + esc(r.a) + '</div>' + (r.ex ? '<div class="vex">' + esc(r.ex) + '</div>' : '') + (r.it ? '<div class="vit">' + esc(r.it) + '</div>' : '') + '</div>';
        }).join('');
      } else if (b.type === 'grid') {
        body = '<div class="vgrid" style="grid-template-columns:minmax(0,.8fr) repeat(' + b.cols.length + ',1fr)"><div></div>' +
          b.cols.map(function (c, ci) { return '<div class="vcell vhead g' + ci + '"><b>' + esc(c.t) + '</b><small>' + esc(c.s || '') + '</small></div>'; }).join('') +
          b.rows.map(function (r) {
            return '<div class="vlab">' + esc(r.label) + '</div>' + r.cells.map(function (c, ci) { return '<div class="vcell g' + ci + '"><b>' + esc(c.t) + '</b><small>' + esc(c.s || '') + '</small></div>'; }).join('');
          }).join('') + '</div>';
      }
      return '<div class="vblock">' + h + body + (b.note ? '<div class="vnote">' + esc(b.note) + '</div>' : '') + '</div>';
    }).join('');
  }
  function blocksText(blocks) { return JSON.stringify(blocks).replace(/[{}\[\]":,]|\b(type|rows|cols|cells|label|key|ex|sub|note|h|t|s|c)\b/g, ' ').toLowerCase(); }
  function schemiBody(term) {
    var t = (term || '').toLowerCase().trim();
    var list = (D.schemi || []).map(function (s, i) {
      if (s.blocks) {
        if (t && s.title.toLowerCase().indexOf(t) < 0 && blocksText(s.blocks).indexOf(t) < 0) return '';
        var op = t ? true : openSchemi.has(i);
        return '<div class="schemecard' + (op ? ' open' : '') + '" data-schema="' + i + '">' +
          '<div class="shead" data-act="schema" data-arg="' + i + '"><span class="schemetitle">' + esc(s.title) + '</span><span class="chev">›</span></div>' +
          '<div class="sbody"><div class="vwrap">' + blocksHtml(s.blocks) + '</div>' + (s.note ? '<div class="schemenote">' + esc(s.note) + '</div>' : '') + '</div></div>';
      }
      var titleHit = t && s.title.toLowerCase().indexOf(t) >= 0;
      var head = '<tr>' + s.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>';
      var shown = 0;
      var rows = s.rows.map(function (r, ri) {
        if (t && !titleHit && r.join(' ').toLowerCase().indexOf(t) < 0) return '';
        shown++;
        var key = i + ':' + ri, hi = schemaHi.has(key);
        return '<tr class="' + (hi ? 'hi' : '') + '" data-act="schemarow" data-arg="' + key + '">' + r.map(function (c) {
          var parts = String(c).split('\n');
          var ex = parts.length > 1 ? '<div class="cex">' + esc(parts.slice(1).join(' ')) + '</div>' : '';
          return '<td>' + esc(parts[0]) + ex + '</td>';
        }).join('') + '</tr>';
      }).join('');
      if (t && !shown && !(s.note && s.note.toLowerCase().indexOf(t) >= 0)) return '';
      var open = t ? true : openSchemi.has(i); // durante la ricerca le card trovate si aprono da sole
      return '<div class="schemecard' + (open ? ' open' : '') + '" data-schema="' + i + '">' +
        '<div class="shead" data-act="schema" data-arg="' + i + '"><span class="schemetitle">' + esc(s.title) + '</span><span class="chev">›</span></div>' +
        '<div class="sbody"><div class="tablewrap"><table class="scheme"><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
        (s.note ? '<div class="schemenote">' + esc(s.note) + '</div>' : '') +
        '</div></div>';
    }).join('');
    return list || '<div class="empty">' + (t ? 'Nessun risultato.' : 'Nessuno schema ancora.') + '</div>';
  }
  function schemiScreen() {
    return listScreen('Schemi', 'Cerca una frase o un argomento…', schemiBody, true);
  }

  /* ---------- tempi verbali (schema di costruzione, attivo/passivo) ---------- */
  var openTempi = new Set();
  function tempoBlock(label, costr, en, it) {
    if (!en) return '';
    return '<div class="tempoblock"><div class="tempolabel">' + label + '</div>' +
      (costr ? '<div class="schemenote" style="margin:2px 0 6px">' + esc(costr) + '</div>' : '') +
      '<div class="tempoex"><span class="en">' + esc(en) + '</span><span class="it">' + esc(it) + '</span></div></div>';
  }
  function tempiScreen() {
    var list = (D.tempi || []).map(function (t, i) {
      var open = openTempi.has(i);
      var body = (t.quando ? '<div class="schemenote" style="margin:0 2px 12px">' + esc(t.quando) + '</div>' : '') +
        tempoBlock('Attivo', t.costrAttiva, t.attivoEn, t.attivoIt) +
        tempoBlock('Attivo — negativo', t.costrNegAtt, t.negAttEn, t.negAttIt) +
        (t.passivoEn ? tempoBlock('Passivo', t.costrPassiva, t.passivoEn, t.passivoIt) +
          tempoBlock('Passivo — negativo', t.costrNegPas, t.negPasEn, t.negPasIt) :
          '<div class="tempoblock"><div class="tempolabel">Passivo</div><div class="schemenote" style="margin:2px 0 0">' + esc(t.notaPassiva || 'Forma passiva non comune per questo tempo.') + '</div></div>');
      return '<div class="schemecard' + (open ? ' open' : '') + '" data-tempo="' + i + '">' +
        '<div class="shead" data-act="tempo" data-arg="' + i + '"><span class="schemetitle">' + esc(t.tense) + '</span><span class="chev">›</span></div>' +
        '<div class="sbody">' + body + '</div></div>';
    }).join('') || '<div class="empty">Nessun tempo verbale ancora.</div>';
    return topBar('Tempi verbali', 'home') + '<main class="fade">' + list + '</main>';
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
    // --- controlli aggiunti dal Promemoria (i tuoi errori ricorrenti) ---
    var ADJ_AFTER_DO = 'happy|sad|ready|hungry|tired|confident|sure|afraid|angry|nervous|okay|fine|well|late|early|busy|free|available|worried|excited|bored|scared|proud|ashamed|jealous|lonely|calm|comfortable';
    if (new RegExp('\\b(doesn\'t|don\'t)\\s+(very\\s+)?(' + ADJ_AFTER_DO + ')\\b').test(s)) h.push('Con un aggettivo dopo, serve il verbo essere (isn’t/aren’t), non doesn’t/don’t: she isn’t happy, non she doesn’t happy.');
    if (/\bwhen\s+(only\s+)?\w+\s+(minutes?|hours?|days?|weeks?|seconds?)\s+left\b/.test(s)) h.push('“When” vuole soggetto + verbo (when only five minutes are left); per ambientare una situazione senza verbo usa “with” (with only five minutes left).');
    if (/\bconfident\s+to\s+[a-z]+/.test(s)) h.push('Dopo “confident” si usa about/in + -ing (confident about speaking), non “confident to” + verbo.');
    var VERB_S = 'speaks|goes|does|says|comes|gives|takes|makes|sees|knows|wants|needs|tries|helps|thinks|works|starts|stops|decides|leaves|writes|reads|plays|watches|listens|studies|stays|talks|walks|runs|sits|eats|drinks';
    if (new RegExp('\\blet\\s+(him|her|them|someone|somebody|me|us)\\s+(else\\s+)?(' + VERB_S + ')\\b').test(s)) h.push('Dopo “let” + persona il verbo va alla forma base, senza -s: let her speak, non let her speaks.');
    if (/\b(listen to|watch|hear)\s+(him|her|them|someone|somebody|me|us|it)\s+to\s+[a-z]+/.test(s)) h.push('Dopo i verbi di percezione (listen to, watch, hear) + persona, il verbo va alla forma base, senza “to”: listen to her talk, non listen to her to talk.');
    if (/\bso that\b(\s+\w+){0,2}\s+to\s+[a-z]+/.test(s)) h.push('Per un risultato non voluto/ironico (“per poi…”) usa “only to” + infinito, non “so that” (che indica uno scopo voluto): I study, only to forget everything.');
    // --- controlli aggiunti dai Phrasal verbs: preposizione "to" ridondante dopo un phrasal verb non separabile già completo ---
    // esclusi i phrasal verb dove "…out to", "…on to", "…up to", "…off to" ecc. hanno anche un uso legittimo (rischio falsi positivi)
    var SKIP_EXTRA_TO = ['to work out', 'to carry on', 'to hang out', 'to back down', 'to get up', 'to be off'];
    function verbForms(v) {
      var irr = (D.irregolari || []).find(function (x) { return x.en.replace(/\s*\(.*?\)/, '').trim() === v; });
      var forms = [v];
      if (irr) {
        irr.past.split('/').forEach(function (p) { forms.push(p.replace(/\(.*?\)/, '').trim()); });
        irr.pp.split('/').forEach(function (p) { forms.push(p.replace(/\(.*?\)/, '').trim()); });
      } else if (/[^aeiou]y$/.test(v)) forms.push(v.slice(0, -1) + 'ied');
      else if (/e$/.test(v)) forms.push(v + 'd');
      else forms.push(v + 'ed');
      if (/[^aeiou]y$/.test(v)) forms.push(v.slice(0, -1) + 'ies');
      else if (/(s|sh|ch|x|z|o)$/.test(v)) forms.push(v + 'es');
      else forms.push(v + 's');
      if (/e$/.test(v) && v !== 'be') forms.push(v.slice(0, -1) + 'ing');
      else forms.push(v + 'ing');
      var seen = {}, out = [];
      forms.forEach(function (f) { f = f.trim(); if (f && !seen[f]) { seen[f] = 1; out.push(f); } });
      return out;
    }
    (D.phrasal || []).forEach(function (d) {
      if (d.sep !== 'non separabile' || SKIP_EXTRA_TO.indexOf(d.pv) !== -1) return;
      var base = d.pv.replace(/^to\s+/i, '');
      var parts = base.split(' '), verb = parts[0], rest = parts.slice(1).join(' ');
      var alt = '(' + verbForms(verb).join('|') + ')' + (rest ? '\\s+' + rest : '');
      if (new RegExp('\\b' + alt + '\\s+to\\b').test(s)) h.push('“' + d.pv + '” è già completo così: non serve “to” dopo (' + d.it.split(/[,·]/)[0].trim() + ').');
    });
    // --- controlli aggiunti dallo schema "avere freddo/fame/paura… → to be, non to have" ---
    if (/\b(i|you|we|they)\s+have\s+(cold|hot)\b(?!\s+\w)/.test(s) || /\b(he|she|it)\s+has\s+(cold|hot)\b(?!\s+\w)/.test(s)) h.push('“Avere freddo/caldo” si dice con to be, non to have: I’m cold / I’m hot, non I have cold/hot.');
    if (/\bhave\s+(hungry|thirsty|afraid|sleepy)\b/.test(s) || /\bhas\s+(hungry|thirsty|afraid|sleepy)\b/.test(s)) h.push('“Avere fame/sete/paura/sonno” si dice con to be, non to have: I’m hungry, non I have hungry.');
    if (/\b(i|you|we|they)\s+have\s+\d+\s+years?\b/.test(s) || /\b(he|she|it)\s+has\s+\d+\s+years?\b/.test(s)) h.push('Per l’età si usa to be + numero, non to have: I’m 30 (years old), non I have 30 years.');
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
    return '<div class="top"><span class="title">Il mio inglese</span><span class="spacer"></span><span style="color:#b0b0b6;font-size:12px;font-weight:600">v87</span></div>' +
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
      tile('ascolto', '🎧', 'Ascolto', 'playlist, timer, audio') +
      tile('tempi', '⏳', 'Tempi verbali', (D.tempi ? D.tempi.length : 0) + ' tempi, attivo e passivo') +
      tile('vocab', '🔤', 'Vocabolario', D.vocab.length + ' parole') +
      tile('frasi', '💬', 'Modi di dire', D.idiomi.length + ' frasi') +
      tile('phrasal', '🔗', 'Phrasal verbs', (D.phrasal ? D.phrasal.length : 0) + ' verbi') +
      tile('irregolari', '🔁', 'Verbi irregolari', (D.irregolari ? D.irregolari.length : 0) + ' verbi') +
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
    var rr = D.rules.filter(function (r) { return (r.title + ' ' + r.items.filter(function (i) { return i.t !== 'audio' && i.t !== 'audioit'; }).map(function (i) { return i.s; }).join(' ')).toLowerCase().indexOf(t) >= 0; });
    if (rr.length) out += '<div class="hgroup">Regole (' + rr.length + ')</div>' + rr.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
    var vv = D.vocab.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.en + ' ' + x.d.it).toLowerCase().indexOf(t) >= 0; });
    if (vv.length) out += '<div class="hgroup">Vocaboli (' + vv.length + ')</div>' + vv.map(function (x) { return vocRow(x.d, x.i); }).join('');
    var ii = D.idiomi.map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.en + ' ' + x.d.it).toLowerCase().indexOf(t) >= 0; });
    if (ii.length) out += '<div class="hgroup">Modi di dire (' + ii.length + ')</div>' + ii.map(function (x) { return idiRow(x.d, x.i); }).join('');
    var pp = (D.phrasal || []).map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.pv + ' ' + x.d.it + ' ' + x.d.eq).toLowerCase().indexOf(t) >= 0; });
    if (pp.length) out += '<div class="hgroup">Phrasal verbs (' + pp.length + ')</div>' + pp.map(function (x) { return phrRow(x.d, x.i); }).join('');
    var ww = (D.irregolari || []).map(function (d, i) { return { d: d, i: i }; }).filter(function (x) { return (x.d.en + ' ' + x.d.it + ' ' + x.d.past + ' ' + x.d.pp).toLowerCase().indexOf(t) >= 0; });
    if (ww.length) out += '<div class="hgroup">Verbi irregolari (' + ww.length + ')</div>' + ww.map(function (x) { return verbRow(x.d, x.i); }).join('');
    var cc = D.racconti.map(function (s, i) { return { s: s, i: i }; }).filter(function (x) { return x.s.blocks.filter(function (b) { return b.s; }).map(function (b) { return b.s; }).join(' ').toLowerCase().indexOf(t) >= 0; });
    if (cc.length) out += '<div class="hgroup">Racconti (' + cc.length + ')</div>' + cc.map(function (x) { var m = x.s.title.match(/^(.*?)\s*\(/); return '<div class="card" data-act="go2" data-arg="racc:' + x.i + '"><div class="head"><span class="ctitle">' + esc(m ? m[1].trim() : x.s.title) + '</span><span class="chev">›</span></div></div>'; }).join('');
    var sb = schemiBody(t);
    if (sb.indexOf('class="empty"') < 0) out += '<div class="hgroup">Schemi (' + (sb.match(/class="schemecard/g) || []).length + ')</div>' + sb;
    var tm = (D.tempi || []).filter(function (x) { return JSON.stringify(x).toLowerCase().indexOf(t) >= 0; });
    if (tm.length) out += '<div class="hgroup">Tempi verbali (' + tm.length + ')</div><div class="card" data-act="go" data-arg="tempi"><div class="head"><span class="ctitle">' + esc(tm.map(function (x) { return x.tense; }).join(' · ')) + '<span class="cdesc">Apri la sezione Tempi verbali</span></span><span class="chev">›</span></div></div>';
    var cz = (D.canzoni || []).filter(function (x) { return JSON.stringify(x).toLowerCase().indexOf(t) >= 0; });
    if (cz.length) out += '<div class="hgroup">Canzoni (' + cz.length + ')</div><div class="card" data-act="go" data-arg="canzoni"><div class="head"><span class="ctitle">' + esc(cz.map(function (x) { return x.song; }).join(' · ')) + '<span class="cdesc">Apri la sezione Canzoni</span></span><span class="chev">›</span></div></div>';
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
    var ww = []; (D.irregolari || []).forEach(function (d, i) { if (fav.has('irr' + i)) ww.push(verbRow(d, i)); });
    if (ww.length) out += '<div class="hgroup">Verbi irregolari</div>' + ww.join('');
    if (!out) out = '<div class="empty">Nessun preferito ancora.<br>Tocca il cuore accanto a una regola o parola per salvarla qui.</div>';
    return topBar('Preferiti', 'home') + '<main class="fade">' + out + '</main>';
  }

  /* ---------- render + events ---------- */
  function render() { document.getElementById('screen').innerHTML = screenHtml(); renderTabs(); if (route.name === 'ascolto') lpStatus(); }
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
    else if (act.charAt(0) === 'l' && /^(lopt|lpause|lstop|lgrp|lall|lnone|lsel|lexport|lex|lrestore|lrestoreall|lexcur)$/.test(act)) { lclick(act, arg, el); }
    else if (act === 'schema') {
      // apri/chiudi la card dello schema SUL POSTO, senza ricostruire la schermata
      var si = +arg, schemaEl = el.closest('.schemecard');
      if (openSchemi.has(si)) { openSchemi.delete(si); if (schemaEl) schemaEl.classList.remove('open'); }
      else { openSchemi.add(si); if (schemaEl) schemaEl.classList.add('open'); }
    }
    else if (act === 'tempo') {
      // apri/chiudi la card del tempo verbale SUL POSTO, senza ricostruire la schermata
      var ti = +arg, tempoEl = el.closest('.schemecard');
      if (openTempi.has(ti)) { openTempi.delete(ti); if (tempoEl) tempoEl.classList.remove('open'); }
      else { openTempi.add(ti); if (tempoEl) tempoEl.classList.add('open'); }
    }
    else if (act === 'schemarow') {
      // evidenzia/rimuovi evidenziazione dalla riga SUL POSTO, senza ricostruire la schermata
      if (schemaHi.has(arg)) schemaHi.delete(arg); else schemaHi.add(arg);
      saveSchemaHi();
      if (el.tagName === 'TR') el.classList.toggle('hi');
    }
    else if (act === 'regcat') { regCat = arg; var qc = document.getElementById('q'); var bc = document.getElementById('body'); if (bc) bc.innerHTML = regoleBody(qc ? qc.value : ''); window.scrollTo(0, 0); }
    else if (act === 'regtag') { regTag = arg; var qc3 = document.getElementById('q'); var bc3 = document.getElementById('body'); if (bc3) bc3.innerHTML = regoleBody(qc3 ? qc3.value : ''); window.scrollTo(0, 0); }
    else if (act === 'ruletag') {
      var rtParts = arg.split(':'), rn = rtParts[0], k = rtParts[1];
      if (ruleTag[rn] === k) delete ruleTag[rn]; else ruleTag[rn] = k;
      saveRuleTag();
      // aggiorna SOLO la card interessata, senza ricostruire la schermata (niente salto di scroll)
      var cardEl3 = el.closest('.card');
      if (cardEl3) {
        var newTag = ruleTag[rn];
        cardEl3.querySelectorAll('.tagbtn').forEach(function (btn) {
          var bk = btn.getAttribute('data-arg').split(':')[1], on = newTag === bk;
          btn.classList.toggle('on', on);
          btn.style.background = on ? RULE_TAGS[bk].color : '';
          btn.style.color = on ? '#fff' : '';
        });
        var headEl = cardEl3.querySelector('.head');
        var oldDot = headEl.querySelector('.tagdot');
        if (oldDot) oldDot.remove();
        if (newTag) {
          var dotEl = document.createElement('span');
          dotEl.className = 'tagdot';
          dotEl.style.background = RULE_TAGS[newTag].color;
          dotEl.title = RULE_TAGS[newTag].label;
          headEl.insertBefore(dotEl, headEl.querySelector('.iconbtn.fav'));
        }
      }
      e.stopPropagation();
    }
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
    if (e.target.id === 'lq') { lexq = e.target.value; var rs = document.getElementById('lqres'); if (rs) rs.innerHTML = lqResults(); return; }
    if (e.target.id !== 'q') return;
    var b = document.getElementById('body'); if (!b) return;
    var term = e.target.value;
    if (route.name === 'home') b.innerHTML = homeBody(term);
    else if (route.name === 'regole') b.innerHTML = regoleBody(term);
    else if (route.name === 'vocab') b.innerHTML = vocabBody(term);
    else if (route.name === 'frasi') b.innerHTML = frasiBody(term);
    else if (route.name === 'phrasal') b.innerHTML = phrasalBody(term);
    else if (route.name === 'irregolari') b.innerHTML = irregolariBody(term);
    else if (route.name === 'schemi') b.innerHTML = schemiBody(term);
    else if (route.name === 'canzoni') b.innerHTML = canzoniBody(term);
    highlight(b, term);
    if (term.trim() && b.querySelector('.empty')) {
      var q = 'Come si dice in inglese (o cosa significa): ' + term.trim() + '? Rispondi in modo breve, con un esempio.';
      b.insertAdjacentHTML('beforeend', '<a class="askclaude" href="https://claude.ai/new?q=' + encodeURIComponent(q) + '" target="_blank" rel="noopener">✨ Chiedi a Claude: “' + esc(term.trim()) + '”</a>');
    }
  });
  /* evidenzia il termine cercato nei risultati */
  function highlight(root, term) {
    term = (term || '').trim().toLowerCase();
    if (term.length < 2) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false), nodes = [], n;
    while ((n = walker.nextNode())) { if (n.nodeValue.toLowerCase().indexOf(term) >= 0) nodes.push(n); }
    nodes.forEach(function (node) {
      var txt = node.nodeValue, low = txt.toLowerCase(), i = 0, p, frag = document.createDocumentFragment();
      while ((p = low.indexOf(term, i)) >= 0) {
        if (p > i) frag.appendChild(document.createTextNode(txt.slice(i, p)));
        var m = document.createElement('mark'); m.textContent = txt.slice(p, p + term.length); frag.appendChild(m);
        i = p + term.length;
      }
      if (i < txt.length) frag.appendChild(document.createTextNode(txt.slice(i)));
      node.parentNode.replaceChild(frag, node);
    });
  }

  /* ---------- ASCOLTO (lettura continua, timer, ripetizione, esporta) ---------- */
  var LG = [
    { id: 'regole', label: 'Regole', n: function () { return D.rules.length; }, name: function (i) { return D.rules[i].n + '. ' + D.rules[i].title; } },
    { id: 'schemi', label: 'Schemi', n: function () { return (D.schemi || []).length; }, name: function (i) { return D.schemi[i].title; } },
    { id: 'tempi', label: 'Tempi verbali', n: function () { return (D.tempi || []).length; }, name: function (i) { return D.tempi[i].tense; } },
    { id: 'vocab', label: 'Vocabolario', n: function () { return D.vocab.length; }, name: function (i) { return D.vocab[i].en + ' — ' + D.vocab[i].it; } },
    { id: 'frasi', label: 'Modi di dire', n: function () { return D.idiomi.length; }, name: function (i) { return D.idiomi[i].en; } },
    { id: 'phrasal', label: 'Phrasal verbs', n: function () { return (D.phrasal || []).length; }, name: function (i) { return D.phrasal[i].pv; } }
  ];
  var lsel = {}, lopen = {}, lexcl = load('listenExcl', {}), lexq = '';
  function saveLexcl() { save('listenExcl', lexcl); }
  (function () { var s = load('listenSel', {}); LG.forEach(function (g) { lsel[g.id] = new Set(s[g.id] || []); }); })();
  function saveLsel() { var o = {}; LG.forEach(function (g) { o[g.id] = Array.from(lsel[g.id]); }); save('listenSel', o); }
  var lopts = load('listenOpts', { min: 30, loop: true, rate: 0.9, mode: 'lezione' });
  var lp = { gen: 0, playing: false, paused: false, queue: [], idx: 0, endAt: 0, timer: null, wake: null };
  var IT_WORDS = /\b(che|il|lo|la|le|gli|di|del|della|dei|per|non|è|con|un|una|si|mai|sempre|quando|dopo|prima|come|sono|ho|hai|ha|ci|mi|ti|al|nel|più|anche|se|ma|da|in|su|o|e)\b/gi;
  function langOf(s) { var m = s.match(IT_WORDS); var w = s.split(/\s+/).length; return (/[àèéìòù]/.test(s) || (m && m.length / w > 0.25)) ? 'it' : 'en'; }
  function clean(s) { return (s || '').replace(/\*\*|\[\[|\]\]/g, '').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim(); }
  var EN_FN = new Set('the a an is are was were be been being am i you he she it we they me him her us them my your his its our their this that these those and or but if so to of in on at for from with without by as not no do does did done doing have has had having can could will would shall should may might must there here what who which whose when where why how all any some many much more most very too also just only still even ever never always usually often yes please thanks thank hello hi okay ok one two three four five six seven eight nine ten like love want need get got go goes went going make made take took come came say said tell told know knew think see saw look give gave find found work live eat ate drink drank play speak spoke talk read write wrote buy bought ask learn study try use help call feel put keep let leave left about after before again ago because between during into over under up down out off than then now today yesterday tomorrow week month year day night morning time people friend friends man men woman women child children home house city name good bad big small old new young long short nice great happy sad tired ready right wrong sorry well really maybe something anything nothing someone anyone everyone each every both either neither own same other another next last first second present perfect simple continuous past future conditional passive'.split(' '));
  var IT_FN = new Set('il lo la le gli i un uno una di del dello della dei degli delle da dal dalla dai nel nella nei nelle sul sulla al alla ai alle con per tra fra su in a e o ma se che chi cui non è sono sei siamo siete era erano ho hai ha abbiamo hanno essere avere fare fatto fa si mi ti ci vi lo ne come quando dove perché quindi anche più meno molto poco tanto sempre mai già ancora solo prima dopo mentre durante questo questa questi queste quello quella quelle suo sua suoi sue mio mia miei mie tuo tua nostro nostra loro ogni tutto tutti tutte altro altra altri stesso stessa dentro fuori sopra sotto davanti dietro insieme senza verso circa oppure invece quindi dunque quale quali quanto quanti parola parole frase frasi verbo verbi nome nomi regola uso usa usare si usa vuole vogliono serve vanno va vengono viene può possono deve devono significa vuol dire esempio esempi errore errori giusto sbagliato attenzione nota sempre mai spesso presente passato futuro persone cose luogo luoghi tempo tempi azione azioni abitudine abitudini'.split(' '));
  var LEX = null;
  function tok(s) { return (s || '').toLowerCase().replace(/[^a-zàèéìòùçñ'’\- ]/g, ' ').split(/\s+/).filter(Boolean); }
  function buildLex() {
    var en = {}, it = {};
    function add(m, s) { tok(s).forEach(function (w) { m[w] = (m[w] || 0) + 1; }); }
    D.vocab.forEach(function (v) { add(en, v.en); add(it, v.it); });
    D.idiomi.forEach(function (v) { add(en, v.en + ' ' + v.extra); add(it, v.it); });
    (D.phrasal || []).forEach(function (v) { add(en, v.pv + ' ' + v.ex + ' ' + v.eq); add(it, v.it); });
    (D.tempi || []).forEach(function (x) { add(en, [x.attivoEn, x.passivoEn, x.negAttEn, x.negPasEn].join(' ')); add(it, [x.attivoIt, x.passivoIt, x.negAttIt, x.negPasIt, x.quando].join(' ')); });
    D.rules.forEach(function (r) { r.items.forEach(function (i) { if (i.t === 'right') add(en, i.s); }); });
    LEX = { en: en, it: it };
  }
  function wlang(w) {
    var c = w.toLowerCase().replace(/^[^a-zàèéìòù']+|[^a-zàèéìòù']+$/g, '');
    if (!c) return null;
    if (/[àèéìòù]/.test(c)) return 'it';
    if (/'|’/.test(c) && /^(i|you|he|she|it|we|they|that|there|what|who|don|doesn|didn|isn|aren|wasn|weren|haven|hasn|hadn|won|can|couldn|wouldn|shouldn)[’']/.test(c)) return 'en';
    if (/[’']s$/.test(c) || /n[’']t$/.test(c)) return 'en';
    if (EN_FN.has(c) && IT_FN.has(c)) return null;
    if (IT_FN.has(c)) return 'it';
    if (EN_FN.has(c)) return 'en';
    if (!LEX) buildLex();
    var e = LEX.en[c] || 0, i = LEX.it[c] || 0;
    if (e > i) return 'en'; if (i > e) return 'it';
    if (c.length > 3 && /[aeiouàèéìòù]$/.test(c) && !/^[A-Z]/.test(w)) return 'it';
    if (/[bcdfghklmnpqrstvwxyz]$/.test(c) && c.length > 2) return 'en';
    return null;
  }
  function splitLang(text, base) {
    var toks = text.replace(/\s*[→=]\s*/g, ' , ').split(/\s+/).filter(Boolean);
    var labs = toks.map(function (w) { return wlang(w); }), orig = labs.slice();
    // parole neutre: ereditano dalla vicina più prossima
    var last = null;
    for (var i = 0; i < labs.length; i++) { if (labs[i]) last = labs[i]; else labs[i] = last; }
    last = null;
    for (var j = labs.length - 1; j >= 0; j--) { if (labs[j]) last = labs[j]; else labs[j] = last || base; }
    for (var m = 1; m < labs.length - 1; m++) {
      if (orig[m] === null && labs[m - 1] === labs[m + 1] && labs[m] !== labs[m - 1] && !EN_FN.has(toks[m].toLowerCase().replace(/[^a-z']/g, '')) && !IT_FN.has(toks[m].toLowerCase())) labs[m] = labs[m - 1];
    }
    // una lingua diversa da quella di base, se dura meno di 3 parole, si legge con la voce di base (meno cambi di voce = più comprensibile)
    var runs = [], r0 = null;
    labs.forEach(function (l, k) { if (r0 && r0.l === l) r0.e = k; else { r0 = { l: l, s: k, e: k }; runs.push(r0); } });
    runs.forEach(function (r) { if (r.l !== base && (r.e - r.s + 1) < 3) for (var q = r.s; q <= r.e; q++) labs[q] = base; });
    var out = [], cur = null;
    toks.forEach(function (w, k) {
      if (cur && cur.l === labs[k]) cur.t += ' ' + w; else { cur = { l: labs[k], t: w }; out.push(cur); }
    });
    return out;
  }
  var segGroup = 0, curKey = '';
  function pushL(a, l, t) {
    t = clean(t); if (!t) return;
    segGroup++;
    splitLang(t, l).forEach(function (s) { var x = s.t.replace(/^[,\s]+|[,\s]+$/g, ''); if (/[a-zA-Zàèéìòù]/.test(x)) a.push({ l: s.l, t: x, g: segGroup, k: curKey }); });
  }
  function buildSegs(g, i) {
    var a = []; curKey = g + ':' + i;
    if (g === 'regole') {
      var r = D.rules[i]; pushL(a, 'it', 'Regola ' + r.n + '. ' + r.title);
      var au = r.items.some(function (it) { return it.t === 'audio'; });
      if (au) { r.items.forEach(function (it) { if (it.t === 'audioit') pushL(a, 'it', it.s); else if (it.t === 'audio') a.push({ l: 'en', t: clean(it.s), g: ++segGroup, k: curKey }); }); return a; }
      r.items.forEach(function (it, ii) { curKey = 'regole:' + i + ':' + ii; if (it.t === 'exp') pushL(a, 'it', it.s); else if (it.t === 'right') it.s.split(/\s{2,}\/\s{2,}|\s·\s/).forEach(function (x) { pushL(a, 'en', x); }); });
    } else if (g === 'schemi') {
      var s = D.schemi[i]; pushL(a, 'it', s.title);
      if (s.blocks) {
        s.blocks.forEach(function (b, bi) {
          if (b.h) pushL(a, 'it', b.h);
          (b.rows || []).forEach(function (r, ri) {
            curKey = 'schemi:' + i + ':b' + bi + ':' + ri;
            if (b.type === 'flow') { pushL(a, 'it', r.q); pushL(a, 'en', r.ex); pushL(a, 'it', r.it); }
            else if (b.type === 'rows') { pushL(a, 'en', r.key); pushL(a, 'en', r.ex); pushL(a, 'it', r.it); }
            else if (b.type === 'grid') { r.cells.forEach(function (c) { pushL(a, 'en', c.t); }); }
          });
        });
      } else {
        var skipFirst = /^sbagliato|^il mio tentativo/i.test(s.cols[0] || '');
        s.rows.forEach(function (r, ri) {
          curKey = 'schemi:' + i + ':' + ri;
          r.forEach(function (c, ci) {
            if (skipFirst && ci === 0) return;
            var first = String(c).split('\n')[0];
            first.split(/\s·\s/).forEach(function (x) { pushL(a, langOf(x), x); });
          });
        });
      }
      curKey = 'schemi:' + i + ':note'; if (s.note) pushL(a, 'it', s.note);
    } else if (g === 'tempi') {
      var t = D.tempi[i]; pushL(a, 'en', t.tense); pushL(a, 'it', t.quando);
      [['costrAttiva', 'attivoEn', 'attivoIt', 'Attivo'], ['costrNegAtt', 'negAttEn', 'negAttIt', 'Negativo'], ['costrPassiva', 'passivoEn', 'passivoIt', 'Passivo']].forEach(function (k) {
        if (t[k[1]]) { curKey = 'tempi:' + i + ':' + k[3]; pushL(a, 'it', k[3] + '. ' + (t[k[0]] || '')); pushL(a, 'en', t[k[1]]); pushL(a, 'it', t[k[2]]); }
      });
    } else if (g === 'vocab') { var v = D.vocab[i]; pushL(a, 'en', v.en.replace(/\(.*?\)/g, '')); pushL(a, 'it', v.it.replace(/\(.*?\)/g, '')); }
    else if (g === 'frasi') { var d = D.idiomi[i]; pushL(a, 'en', d.en); pushL(a, 'it', d.it.replace(/\(.*?\)/g, '')); pushL(a, 'en', d.extra); }
    else if (g === 'phrasal') { var p = D.phrasal[i]; pushL(a, 'en', p.pv); pushL(a, 'it', p.it); pushL(a, 'en', p.ex); }
    return a;
  }
  function buildQueue(raw) {
    var q = [];
    LG.forEach(function (g) { Array.from(lsel[g.id]).sort(function (x, y) { return x - y; }).forEach(function (i) { if (i < g.n()) buildSegs(g.id, i).forEach(function (s) { s.src = g.id; if (!lexcl[s.k]) q.push(s); }); }); });
    if (lopts.mode !== 'sonno') return q;
    // modalità sonno: solo frasi inglesi (niente parole singole tranne dal Vocabolario), senza doppioni, ognuna ripetuta 2 volte, lenta, con pause lunghe
    var seen = {}, out = [], gid = 0;
    q.forEach(function (s) {
      if (s.l !== 'en') return;
      var nw = s.t.split(/\s+/).length;
      if (nw < 2 && s.src !== 'vocab') return;
      if (nw > 28) return;
      var k = s.t.toLowerCase(); if (seen[k]) return; seen[k] = 1;
      gid++;
      out.push({ l: 'en', t: s.t, g: gid, pause: 2500, wpm: 125, sleep: true });
      out.push({ l: 'en', t: s.t, g: gid, pause: 5000, wpm: 125, sleep: true });
    });
    return out;
  }
  function pickVoice(l) {
    var vs = speechSynthesis.getVoices();
    var re = l === 'it' ? /^it(-|_)?/i : /^en(-|_)?(GB|US|AU)?/i;
    return vs.filter(function (x) { return re.test(x.lang); })[0];
  }
  function lpStatus(msg) {
    var el = document.getElementById('lpstat'); if (!el) return;
    var left = lp.endAt ? Math.max(0, Math.round((lp.endAt - Date.now()) / 60000)) : 0;
    el.innerHTML = msg || (lp.playing ? (lp.paused ? '⏸ In pausa' : '▶︎ In ascolto') + ' · frase ' + (lp.idx + 1) + '/' + lp.queue.length + (lp.endAt ? ' · si spegne tra ' + left + ' min' : '') + '<div class="lcur">' + esc((lp.queue[lp.idx] || {}).t || '') + '</div><button class="lmini" data-act="lexcur">🚫 Togli questa frase dall\'ascolto</button>' : 'Pronta.');
    var pb = document.getElementById('lpbtn'); if (pb) pb.textContent = lp.playing ? (lp.paused ? '▶︎ Riprendi' : '⏸ Pausa') : '▶︎ Avvia ascolto';
    var sb = document.getElementById('lsbtn'); if (sb) sb.style.display = lp.playing ? '' : 'none';
  }
  function lpStep() {
    if (!lp.playing || lp.paused) return;
    if (lp.endAt && Date.now() >= lp.endAt) { lpStop('⏹ Spento automaticamente.'); return; }
    if (lp.idx >= lp.queue.length) { if (lopts.loop) lp.idx = 0; else { lpStop('✓ Finito.'); return; } }
    var s = lp.queue[lp.idx], myGen = ++lp.gen;
    var u = new SpeechSynthesisUtterance(s.t); u.lang = s.l === 'it' ? 'it-IT' : 'en-GB'; u.rate = s.sleep ? 0.72 : (s.l === 'it' ? Math.min(1, lopts.rate + 0.05) : lopts.rate);
    var v = pickVoice(s.l); if (v) u.voice = v;
    var nx = lp.queue[lp.idx + 1], gap = s.pause || ((nx && nx.g === s.g) ? 120 : 600);
    var done = false, next = function () { if (done || myGen !== lp.gen) return; done = true; lp.idx++; setTimeout(lpStep, gap); };
    u.onend = next; u.onerror = next;
    lpStatus();
    speechSynthesis.speak(u);
  }
  function lpWake() { try { if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (w) { lp.wake = w; }).catch(function () {}); } catch (e) {} }
  function lpStart() {
    if (!('speechSynthesis' in window)) { lpStatus('Questo dispositivo non supporta la lettura vocale.'); return; }
    lp.queue = buildQueue();
    if (!lp.queue.length) { lpStatus('Seleziona almeno un contenuto.'); return; }
    unlockVoice();
    speechSynthesis.cancel();
    lp.playing = true; lp.paused = false; lp.idx = 0;
    lp.endAt = lopts.min ? Date.now() + lopts.min * 60000 : 0;
    lpWake(); lpStep();
  }
  function lpStop(msg) {
    lp.playing = false; lp.paused = false;
    try { speechSynthesis.cancel(); } catch (e) {}
    try { if (lp.wake) lp.wake.release(); } catch (e) {} lp.wake = null;
    lpStatus(msg || 'Fermato.');
  }
  function lpPause() {
    if (!lp.playing) { lpStart(); return; }
    if (lp.paused) { lp.paused = false; lpWake(); lpStep(); } else { lp.paused = true; try { speechSynthesis.cancel(); } catch (e) {} }
    lpStatus();
  }
  setInterval(function () { if (lp.playing && !lp.paused) lpStatus(); }, 5000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden && lp.playing && !lp.paused) lpWake(); });
  function lopt(label, key, vals, fmt) {
    return '<div class="lrow"><div class="llab">' + label + '</div><div class="tagbar">' + vals.map(function (v) {
      return '<button class="tagbtn lchip' + (lopts[key] === v ? ' on' : '') + '" data-act="lopt" data-arg="' + key + ':' + v + '">' + fmt(v) + '</button>';
    }).join('') + '</div></div>';
  }
  function lqResults() {
    var s = (lexq || '').toLowerCase().trim(); if (s.length < 2) return '';
    var seen = {}, out = '';
    buildQueue(true).forEach(function (x) {
      if (seen[x.k]) return;
      if (x.t.toLowerCase().indexOf(s) < 0) return;
      seen[x.k] = 1;
      if (Object.keys(seen).length > 15) return;
      out += '<div class="lxrow"><span>' + esc(x.t) + '</span>' + (lexcl[x.k] ? '<em>tolta</em>' : '<button class="lmini" data-act="lex" data-arg="' + esc(x.k) + '" data-txt="' + esc(x.t) + '">🚫 Togli</button>') + '</div>';
    });
    return out || '<div class="lnote">Nessuna frase trovata.</div>';
  }
  function ascoltoScreen() {
    var tot = 0, nseg = 0; LG.forEach(function (g) { tot += lsel[g.id].size; });
    var out = topBar('Ascolto', 'home') + '<main class="fade" id="body">' +
      '<div class="lnote">Scegli cosa ascoltare, imposta durata e ripetizione, poi premi Avvia. <b>Per ascoltare di notte:</b> tieni lo schermo acceso (Impostazioni › Schermo › Blocco automatico › Mai, e in carica) oppure usa i file audio qui sotto: la voce dell\'app si ferma se lo schermo si blocca.</div>' +
      '<div class="card lplayer"><div id="lpstat" class="lstat"></div>' +
      '<button class="bigbtn" id="lpbtn" data-act="lpause">▶︎ Avvia ascolto</button>' +
      '<button class="bigbtn alt" id="lsbtn" data-act="lstop" style="display:none">⏹ Ferma</button></div>' +
      lopt('Modalità', 'mode', ['lezione', 'sonno'], function (v) { return v === 'sonno' ? '🌙 Sonno: solo inglese, lento, in loop' : '📖 Lezione: italiano + inglese'; }) +
      lopt('Durata (poi si spegne)', 'min', [15, 30, 60, 90, 120, 0], function (v) { return v ? v + ' min' : '∞'; }) +
      lopt('Quando finisce la lista', 'loop', [false, true], function (v) { return v ? '🔁 Ripeti' : 'Ferma'; }) +
      lopt('Velocità', 'rate', [0.7, 0.8, 0.9, 1], function (v) { return '×' + v; }) +
      '<div class="hgroup">Contenuti (' + tot + ' selezionati)</div>';
    LG.forEach(function (g) {
      var n = g.n(), c = lsel[g.id].size, open = lopen[g.id];
      out += '<div class="card lgrp"><div class="head" data-act="lgrp" data-arg="' + g.id + '"><span class="ctitle">' + g.label + '<span class="cdesc">' + c + ' / ' + n + ' selezionati</span></span><span class="chev" style="transform:rotate(' + (open ? 90 : 0) + 'deg)">›</span></div>' +
        '<div class="lacts"><button class="lmini" data-act="lall" data-arg="' + g.id + '">Tutti</button><button class="lmini" data-act="lnone" data-arg="' + g.id + '">Nessuno</button><button class="lmini" data-act="lgrp" data-arg="' + g.id + '">' + (open ? 'Chiudi elenco' : 'Scegli…') + '</button></div>';
      if (open) {
        out += '<div class="llist">';
        for (var i = 0; i < n; i++) out += '<label class="litem"><input type="checkbox" data-act="lsel" data-arg="' + g.id + ':' + i + '"' + (lsel[g.id].has(i) ? ' checked' : '') + '><span>' + esc(g.name(i)) + '</span></label>';
        out += '</div>';
      }
      out += '</div>';
    });
    out += '<div class="hgroup">Togli frasi dall\'ascolto</div><div class="lnote">Cerca una frase o una parola tra i contenuti selezionati e premi 🚫 per toglierla (insieme alla sua traduzione). Durante l\'ascolto puoi anche premere «Togli questa frase».</div>' +
      '<div class="search"><input id="lq" type="search" placeholder="es. chestnuts" autocomplete="off" value="' + esc(lexq) + '"></div><div id="lqres">' + lqResults() + '</div>';
    var ek = Object.keys(lexcl);
    if (ek.length) out += '<div class="hgroup">Frasi tolte (' + ek.length + ')</div>' + ek.map(function (k) { return '<div class="lxrow"><span>' + esc(lexcl[k]) + '</span><button class="lmini" data-act="lrestore" data-arg="' + esc(k) + '">Rimetti</button></div>'; }).join('') + '<button class="bigbtn alt" data-act="lrestoreall">Rimetti tutte</button>';
    out += '<div class="hgroup">File audio (per iPod, iPhone, Musica)</div><div class="lnote">Esporta la selezione come testo, poi sul Mac lancia lo script <b>Crea_audio.py</b> (nella cartella Inglese) per ottenere un file audio da copiare sul dispositivo: va avanti anche a schermo bloccato.</div>' +
      '<button class="bigbtn alt" data-act="lexport">⬇︎ Esporta selezione per audio</button><div id="lexp" class="lnote"></div></main>';
    return out;
  }
  function lclick(act, arg, el) {
    if (act === 'lopt') { var k = arg.split(':'); var val = k[1] === 'true' ? true : k[1] === 'false' ? false : (isNaN(+k[1]) ? k[1] : +k[1]); lopts[k[0]] = val; save('listenOpts', lopts); el.parentNode.querySelectorAll('.lchip').forEach(function (b) { b.classList.remove('on'); }); el.classList.add('on'); }
    else if (act === 'lpause') lpPause();
    else if (act === 'lstop') lpStop();
    else if (act === 'lgrp') { lopen[arg] = !lopen[arg]; render(); }
    else if (act === 'lall') { var g = LG.filter(function (x) { return x.id === arg; })[0]; for (var i = 0; i < g.n(); i++) lsel[arg].add(i); saveLsel(); render(); }
    else if (act === 'lnone') { lsel[arg].clear(); saveLsel(); render(); }
    else if (act === 'lsel') { var p = arg.split(':'); if (lsel[p[0]].has(+p[1])) lsel[p[0]].delete(+p[1]); else lsel[p[0]].add(+p[1]); saveLsel(); }
    else if (act === 'lex') { lexcl[arg] = el.getAttribute('data-txt') || arg; saveLexcl(); render(); }
    else if (act === 'lrestore') { delete lexcl[arg]; saveLexcl(); render(); }
    else if (act === 'lrestoreall') { lexcl = {}; saveLexcl(); render(); }
    else if (act === 'lexcur') {
      var cs = lp.queue[lp.idx]; if (!cs || !cs.k) return;
      lexcl[cs.k] = cs.t; saveLexcl();
      var before = lp.queue.slice(0, lp.idx).filter(function (x) { return x.k !== cs.k; }).length;
      lp.queue = lp.queue.filter(function (x) { return x.k !== cs.k; });
      lp.gen++; try { speechSynthesis.cancel(); } catch (e) {}
      lp.idx = before; if (lp.idx >= lp.queue.length && !lopts.loop) { lpStop('✓ Finito.'); return; }
      setTimeout(lpStep, 200);
    }
    else if (act === 'lexport') {
      var q = buildQueue(), e = document.getElementById('lexp');
      if (!q.length) { if (e) e.textContent = 'Seleziona almeno un contenuto.'; return; }
      var txt = q.map(function (s) { return s.l + '\t' + s.t + '\t' + s.g + '\t' + (s.pause ? s.pause / 1000 : '') + '\t' + (s.wpm || ''); }).join('\n');
      try { var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/plain' })); a.download = 'ascolto.txt'; document.body.appendChild(a); a.click(); a.remove(); } catch (er) {}
      if (e) e.textContent = q.length + ' frasi esportate in ascolto.txt (cartella Download). Sul Mac: python3 Crea_audio.py ascolto.txt';
    }
  }

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }

  var route = { name: 'home' };
  var openRules = new Set();
  render();
})();
