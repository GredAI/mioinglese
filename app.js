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
  function speak(text) {
    try {
      if (!('speechSynthesis' in window)) return;
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
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
    var body = r.items.map(function (it) {
      if (it.t === 'exp') return '<p class="exp">' + bold(it.s) + '</p>';
      return '<div class="exline ' + it.t + '"><b>' + (it.t === 'wrong' ? '✗' : '✓') + '</b>' + esc(it.s) + '</div>';
    }).join('');
    return '<div class="card ' + (open ? 'open' : '') + '" data-rule="' + r.n + '">' +
      '<div class="head" data-act="rule" data-arg="' + r.n + '"><span class="num">' + r.n + '</span>' +
      '<span class="ctitle">' + esc(r.title) + (open ? '' : '<span class="cdesc">' + esc(desc.slice(0, 70)) + (desc.length > 70 ? '…' : '') + '</span>') + '</span>' +
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
    if (route.name === 'flashcard') return flashScreen();
    if (route.name === 'canzoni') return listScreen('Canzoni', 'Cerca…', canzoniBody, true);
    if (route.name === 'racconti') return raccontiScreen();
    if (route.name === 'racc') return raccDetail(route.arg);
    if (route.name === 'preferiti') return preferitiScreen();
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
  function regoleBody(term) {
    var t = term.toLowerCase();
    var items = D.rules.filter(function (r) { return !t || (r.title + ' ' + r.items.map(function (i) { return i.s; }).join(' ')).toLowerCase().indexOf(t) >= 0; });
    if (!items.length) return '<div class="empty">Nessuna regola trovata.</div>';
    return items.map(function (r) { return ruleCard(r, openRules.has(r.n)); }).join('');
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

  /* ---------- flashcard ---------- */
  var card = null, revealed = false;
  // mazzo flashcard = TUTTO ciò che hai incontrato: vocaboli + modi di dire + espressioni delle canzoni
  function flashPool() {
    var a = [];
    D.vocab.forEach(function (d, i) { a.push({ id: 'v' + i, en: d.en, it: d.it, pr: d.extra }); });
    D.idiomi.forEach(function (d, i) { a.push({ id: 'i' + i, en: d.en, it: d.it, pr: '' }); });
    D.canzoni.forEach(function (s, si) { s.items.forEach(function (d, ii) { a.push({ id: 's' + si + '_' + ii, en: d.en, it: d.it, pr: '' }); }); });
    return a;
  }
  function pickCard() {
    var all = flashPool();
    var pool = review.size ? all.filter(function (x) { return review.has(x.id); }) : all;
    if (!pool.length) pool = all;
    card = pool[Math.floor(Math.random() * pool.length)];
    revealed = false;
  }
  function flashScreen() {
    if (!card) pickCard();
    var word = esc(card.en.replace(/\(.*?\)/g, ''));
    var body = '<div class="flashwrap"><div class="flash" data-act="reveal">' +
      '<div class="fw">' + esc(card.en) + '</div>' + (card.pr ? '<div class="fpr">/' + esc(card.pr) + '/</div>' : '') +
      (revealed ? '<div class="fa">' + esc(card.it) + '</div>' : '<div class="hint">tocca per vedere la traduzione</div>') + '</div>' +
      '<button class="fspk" data-act="speak" data-arg="' + word + '">' + IC.speaker + '<span>Ascolta</span></button>' +
      (revealed ? '<div class="fbtns"><button class="again" data-act="again">↺ Ripassa</button><button class="know" data-act="know">✓ Conosciuta</button></div>' : '') +
      '<div class="fcount">' + (review.size ? review.size + ' da ripassare' : flashPool().length + ' voci (vocaboli + modi di dire + canzoni)') + '</div></div>';
    return topBar('Flashcard') + '<main>' + body + '</main>';
  }

  /* ---------- home ---------- */
  function home() {
    return '<div class="top"><span class="title">Il mio inglese</span></div>' +
      '<div class="search"><input id="q" type="search" placeholder="Cerca ovunque (regole, parole, racconti…)" autocomplete="off"></div>' +
      '<main class="fade" id="body">' + homeBody('') + '</main>';
  }
  function homeBody(term) {
    if (term && term.trim()) return searchAll(term.trim().toLowerCase());
    var out = '<button class="bigbtn" data-act="go" data-arg="flashcard">▶︎  Riprendi studio (flashcard)</button>';
    if (recent.length) {
      out += '<div class="hgroup">Ultime aperte</div>';
      out += recent.map(function (r) { return '<div class="card" data-act="go2" data-arg="' + r.id + '"><div class="head"><span class="ctitle">' + esc(r.label) + '</span><span class="chev">›</span></div></div>'; }).join('');
    }
    out += '<div class="hgroup">Sezioni</div><div class="tiles">' +
      tile('regole', '📚', 'Regole', D.rules.length + ' regole') +
      tile('vocab', '🔤', 'Vocabolario', D.vocab.length + ' parole') +
      tile('frasi', '💬', 'Modi di dire', D.idiomi.length + ' frasi') +
      tile('flashcard', '🃏', 'Flashcard', 'Ripassa') +
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
    else if (act === 'fav') { if (fav.has(arg)) fav.delete(arg); else fav.add(arg); saveFav(); render(); e.stopPropagation(); }
    else if (act === 'speak') { speak(arg); e.stopPropagation(); }
    else if (act === 'reveal') { revealed = true; render(); }
    else if (act === 'know') { review.delete(card.id); saveReview(); pickCard(); render(); }
    else if (act === 'again') { review.add(card.id); saveReview(); pickCard(); render(); }
  });
  document.addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    var b = document.getElementById('body'); if (!b) return;
    var term = e.target.value;
    if (route.name === 'home') b.innerHTML = homeBody(term);
    else if (route.name === 'regole') b.innerHTML = regoleBody(term);
    else if (route.name === 'vocab') b.innerHTML = vocabBody(term);
    else if (route.name === 'frasi') b.innerHTML = frasiBody(term);
    else if (route.name === 'canzoni') b.innerHTML = canzoniBody(term);
  });

  /* ---------- service worker ---------- */
  if ('serviceWorker' in navigator) { navigator.serviceWorker.register('sw.js').catch(function () {}); }

  var route = { name: 'home' };
  var openRules = new Set();
  render();
})();
