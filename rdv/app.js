/* Widget Grist — rendez-vous (générique, volontairement simple).
 * Un calendrier. L'utilisateur voit occupé / libre, choisit une période
 * libre et pose une CANDIDATURE (réservation "En attente" dans Grist ;
 * c'est l'organisateur qui confirme dans Grist).
 * Hors Grist : mode démonstration. Statique, aucune étape de build.
 */
(function () {
'use strict';

/* ---------- utilitaires ---------- */
var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
var DEFAULT_OPTS = {
  title: 'Rendez-vous',
  openTable: 'Ouvertures',
  bookTable: 'Reservations',
  step: 30,            /* granularité (min) des périodes proposées */
  horizonDays: 90      /* au-delà : non réservable */
};
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function fromIso(s) {
  if (s instanceof Date && !isNaN(s)) return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  if (typeof s === 'string') {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
    if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  }
  return null;
}
function minutesOf(v) {
  if (typeof v === 'number') return v * (v > 8 ? 1 : 60); /* 9 → 9 h ; 0.5 h non géré */
  if (typeof v !== 'string') return null;
  var m = /^(\d{1,2})[:h](\d{2})/.exec(v.trim().toLowerCase());
  if (m) return (+m[1]) * 60 + (+m[2]);
  m = /^(\d{1,2})$/.exec(v.trim());
  if (m) return (+m[1]) * 60;
  return null;
}
function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function norm(s) { return (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function pickCol(cols, aliases) {
  for (var i = 0; i < aliases.length; i++)
    for (var j = 0; j < cols.length; j++) if (norm(cols[j]) === aliases[i]) return cols[j];
  for (var k = 0; k < aliases.length; k++)
    for (var l = 0; l < cols.length; l++) if (norm(cols[l]).indexOf(aliases[k]) !== -1) return cols[l];
  return null;
}
function matches(v, terms) {
  var n = norm(v); if (!n) return false;
  return terms.some(function (t) { return t && n.indexOf(t) !== -1; });
}

/* ---------- état ---------- */
var S = {
  inGrist: false, demo: false,
  opts: JSON.parse(JSON.stringify(DEFAULT_OPTS)),
  cursor: new Date(),
  openings: [],   /* {date, start, end, closed} */
  busy: [],      /* confirmées {date, start, end} */
  pending: [],   /* candidatures {date, start, end} */
  pickedDay: null, pickedStart: null, pickedEnd: null
};
var CANCEL_TERMS = ['annule', 'refuse', 'cancel'];
var CONFIRM_TERMS = ['confirme', 'ok', 'valide', 'accepte', 'reserve'];
var PENDING_TERMS = ['attente', 'candidature', 'propose', 'pending', 'todo'];

function status(msg, err) {
  var el = document.getElementById('statusLine');
  if (!msg) { el.hidden = true; return; }
  el.hidden = false; el.textContent = msg;
  el.className = 'status' + (err ? ' err' : '');
}

/* ---------- démo ---------- */
function demoData() {
  var t = new Date(), ops = [], busy = [], pend = [];
  for (var i = 1; i <= 60; i++) {
    var day = addDays(t, i), dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    ops.push({ date: iso(day), start: 9 * 60, end: 12 * 60, closed: false });
    ops.push({ date: iso(day), start: 14 * 60, end: 17 * 60, closed: false });
  }
  busy.push({ date: iso(addDays(t, 3)), start: 10 * 60, end: 11 * 60 });
  busy.push({ date: iso(addDays(t, 3)), start: 15 * 60, end: 17 * 60 });
  busy.push({ date: iso(addDays(t, 4)), start: 9 * 60, end: 9 * 60 + 45 });
  pend.push({ date: iso(addDays(t, 6)), start: 14 * 60, end: 15 * 60 });
  return { ops: ops, busy: busy, pend: pend };
}

/* ---------- chargement Grist ---------- */
async function loadGrist() {
  var oRows = await grist.docApi.getTable(S.opts.openTable);
  var bRows = await grist.docApi.getTable(S.opts.bookTable);
  var oCols = oRows.length ? Object.keys(oRows[0]) : [];
  var bCols = bRows.length ? Object.keys(bRows[0]) : [];
  var oDate = pickCol(oCols, ['date', 'jour']), oStart = pickCol(oCols, ['debut', 'start', 'de', 'from']),
      oEnd = pickCol(oCols, ['fin', 'end', 'au', 'a', 'to']),
      oClosed = pickCol(oCols, ['ferme', 'statut', 'etat', 'closed', 'status']);
  var bDate = pickCol(bCols, ['date', 'jour']), bStart = pickCol(bCols, ['debut', 'heure', 'start', 'time']),
      bEnd = pickCol(bCols, ['fin', 'end']), bDur = pickCol(bCols, ['duree', 'duration']),
      bStat = pickCol(bCols, ['statut', 'etat', 'status']);
  if (!oDate || !oStart || !oEnd) throw new Error(
    'Table « ' + S.opts.openTable + ' » : colonnes date / début / fin introuvables.');
  if (!bDate || !bStart) throw new Error(
    'Table « ' + S.opts.bookTable + ' » : colonnes date / début introuvables.');

  S.openings = []; S.busy = []; S.pending = [];
  oRows.forEach(function (r) {
    var d = fromIso(r[oDate]); if (!d) return;
    var s = minutesOf(r[oStart]), e = minutesOf(r[oEnd]);
    if (s == null || e == null) return;
    S.openings.push({ date: iso(d), start: s, end: e,
      closed: oClosed ? matches(r[oClosed], CANCEL_TERMS.concat(['ferme'])) : false });
  });
  bRows.forEach(function (r) {
    var d = fromIso(r[bDate]); if (!d) return;
    var s = minutesOf(r[bStart]); if (s == null) return;
    var e = bEnd && minutesOf(r[bEnd]) != null ? minutesOf(r[bEnd]) :
      (bDur && +r[bDur] ? s + (+r[bDur]) * (String(r[bDur]).indexOf('h') !== -1 ? 60 : 1) : s + 60);
    var st = bStat ? norm(r[bStat]) : '';
    if (matches(st, CANCEL_TERMS)) return;             /* annulée : ignorée */
    var isPending = st ? (!matches(st, CONFIRM_TERMS) && matches(st, PENDING_TERMS)) : false;
    (isPending ? S.pending : S.busy).push({ date: iso(d), start: s, end: e });
  });
  if (!S.openings.length) throw new Error(
    'Aucune ouverture lisible dans « ' + S.opts.openTable + ' ».');
}

async function refresh() {
  try {
    if (S.inGrist) { await loadGrist(); status(null); }
    else {
      var d = demoData(); S.openings = d.ops; S.busy = d.busy; S.pending = d.pend;
      status('Mode démonstration — données fictives.');
    }
    render();
  } catch (e) {
    status('Erreur : ' + e.message, true);
  }
}

/* ---------- calcul de disponibilité ---------- */
function dayOpen(dateIso) {
  return S.openings.filter(function (o) { return o.date === dateIso && !o.closed; });
}
function overlaps(aS, aE, bS, bE) { return aS < bE && bS < aE; }
function taken(dateIso, s, e) {
  return S.busy.concat(S.pending).some(function (b) {
    return b.date === dateIso && overlaps(b.start, b.end, s, e);
  });
}
/* Découpe une journée en tranches de « step » minutes, classées libre / occupé. */
function daySlices(dateIso) {
  var step = +S.opts.step || 30, out = [];
  dayOpen(dateIso).forEach(function (op) {
    for (var t = op.start; t < op.end; t += step) {
      out.push({ start: t, end: Math.min(t + step, op.end), free: !taken(dateIso, t, Math.min(t + step, op.end)) });
    }
  });
  return out;
}
function dayState(dateIso) {
  var ops = dayOpen(dateIso);
  if (!ops.length) return 'off';
  var slices = daySlices(dateIso);
  if (!slices.length) return 'off';
  var free = slices.filter(function (x) { return x.free; }).length;
  if (free === 0) return 'full';
  if (free === slices.length) return 'free';
  return 'partial';
}

/* ---------- rendu du calendrier ---------- */
function render() {
  document.getElementById('mainTitle').textContent = S.opts.title || DEFAULT_OPTS.title;
  document.getElementById('monthLabel').textContent =
    MONTHS_FR[S.cursor.getMonth()] + ' ' + S.cursor.getFullYear();
  var el = document.getElementById('monthGrid');
  el.innerHTML = '';
  ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].forEach(function (d) {
    var h = document.createElement('div'); h.className = 'dow'; h.textContent = d; el.appendChild(h);
  });
  var first = new Date(S.cursor.getFullYear(), S.cursor.getMonth(), 1);
  var offset = (first.getDay() + 6) % 7;
  var days = new Date(S.cursor.getFullYear(), S.cursor.getMonth() + 1, 0).getDate();
  var today = new Date();
  var horizon = addDays(today, +S.opts.horizonDays || 90);
  for (var i = 0; i < offset; i++) {
    var e = document.createElement('div'); e.className = 'day off'; el.appendChild(e);
  }
  for (var d = 1; d <= days; d++) {
    var date = new Date(S.cursor.getFullYear(), S.cursor.getMonth(), d);
    var cell = document.createElement('div');
    var past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var state = (past || date > horizon) ? 'out' : dayState(iso(date));
    cell.className = 'day ' + state + (sameIso(date, today) ? ' today' : '');
    var num = document.createElement('div'); num.className = 'num'; num.textContent = d;
    var tag = document.createElement('div'); tag.className = 'tag';
    tag.textContent = { off: '', out: '—', full: 'complet', free: 'libre', partial: 'libre en partie' }[state] || '';
    if (state === 'free' || state === 'partial') tag.textContent += ' — réserver';
    cell.appendChild(num); cell.appendChild(tag);
    (function (dd, st) {
      if (st === 'free' || st === 'partial') {
        cell.addEventListener('click', function () { openDay(dd); });
      }
    })(date, state);
    el.appendChild(cell);
  }
}
function sameIso(a, b) { return iso(a) === iso(b); }

/* ---------- panneau du jour ---------- */
function openDay(date) {
  S.pickedDay = date;
  var dlg = document.getElementById('dayDialog');
  document.getElementById('dayTitle').textContent =
    date.getDate() + ' ' + MONTHS_FR[date.getMonth()];
  var strip = document.getElementById('daySlots');
  var form = document.getElementById('bookForm');
  strip.innerHTML = ''; form.hidden = true;
  var step = +S.opts.step || 30;
  var slices = daySlices(iso(date));
  if (!slices.length) {
    var p = document.createElement('p'); p.className = 'no-slots';
    p.textContent = 'Aucun créneau ce jour-là.'; strip.appendChild(p);
  }
  slices.forEach(function (sl) {
    var s = document.createElement('div');
    s.className = 'slot' + (sl.free ? '' : (S.pending.some(function (b) {
      return b.date === iso(date) && overlaps(b.start, b.end, sl.start, sl.end);
    }) ? ' wait' : ' taken'));
    s.textContent = hhmm(sl.start);
    s.title = sl.free ? 'Sélectionner' : (s.classList.contains('wait') ? 'Candidature en attente' : 'Occupé');
    if (sl.free) {
      s.addEventListener('click', function () {
        pickSlot(sl.start, sl.end);
        strip.querySelectorAll('.slot').forEach(function (x) { x.style.outline = ''; });
        s.style.outline = '2px solid var(--free-ink)';
      });
    }
    strip.appendChild(s);
  });
  dlg.showModal();
}
function pickSlot(start, end) {
  S.pickedStart = start; S.pickedEnd = end;
  document.getElementById('bookForm').hidden = false;
  document.getElementById('slotLine').textContent =
    'Le ' + S.pickedDay.getDate() + ' ' + MONTHS_FR[S.pickedDay.getMonth()] +
    ', de ' + hhmm(start) + ' à ' + hhmm(end) + '.';
  document.getElementById('bookError').hidden = true;
}

async function submitCandidacy(ev) {
  ev.preventDefault();
  var name = document.getElementById('bookName').value.trim();
  var email = document.getElementById('bookEmail').value.trim();
  if (!name || !email) return;
  var dateIso = iso(S.pickedDay);
  if (S.demo) {
    S.pending.push({ date: dateIso, start: S.pickedStart, end: S.pickedEnd });
    document.getElementById('dayDialog').close();
    status('Démo : candidature simulée (' + name + ', ' + hhmm(S.pickedStart) + ').');
    render(); return;
  }
  try {
    /* anti-conflit : relire puis vérifier avant l'écriture */
    await loadGrist();
    if (taken(dateIso, S.pickedStart, S.pickedEnd)) {
      throw new Error("Ce créneau vient d'être pris. Merci d'en choisir un autre.");
    }
    var rows = await grist.docApi.getTable(S.opts.bookTable);
    var cols = rows.length ? Object.keys(rows[0]) : [];
    var f = {};
    var cD = pickCol(cols, ['date', 'jour']); if (cD) f[cD] = dateIso;
    var cS = pickCol(cols, ['debut', 'heure', 'start', 'time']); if (cS) f[cS] = hhmm(S.pickedStart);
    var cE = pickCol(cols, ['fin', 'end']);
    var cDur = pickCol(cols, ['duree', 'duration']);
    if (cE) f[cE] = hhmm(S.pickedEnd);
    else if (cDur) f[cDur] = S.pickedEnd - S.pickedStart;
    var cN = pickCol(cols, ['nom', 'name']); if (cN) f[cN] = name;
    var cM = pickCol(cols, ['email', 'courriel']); if (cM) f[cM] = email;
    var cO = pickCol(cols, ['motif', 'objet', 'sujet', 'subject']);
    if (cO) f[cO] = document.getElementById('bookSubject').value.trim();
    var cSt = pickCol(cols, ['statut', 'etat', 'status']);
    if (cSt) f[cSt] = 'En attente';
    await grist.addRecords(S.opts.bookTable, [{ fields: f, toc: false }]);
    document.getElementById('dayDialog').close();
    status('Demande envoyée. Vous serez confirmé par courriel.');
    await refresh();
  } catch (e) {
    var err = document.getElementById('bookError');
    err.hidden = false; err.textContent = e.message;
  }
}

/* ---------- démarrage ---------- */
function boot(inGrist, savedOpts) {
  S.inGrist = inGrist; S.demo = !inGrist;
  if (savedOpts) Object.keys(DEFAULT_OPTS).forEach(function (k) {
    if (savedOpts[k] !== undefined) S.opts[k] = savedOpts[k];
  });
  document.getElementById('prevBtn').addEventListener('click', function () {
    S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth() - 1, 1); render();
  });
  document.getElementById('nextBtn').addEventListener('click', function () {
    S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth() + 1, 1); render();
  });
  document.getElementById('dayClose').addEventListener('click', function () {
    document.getElementById('dayDialog').close();
  });
  document.getElementById('bookCancel').addEventListener('click', function () {
    document.getElementById('bookForm').hidden = true;
  });
  document.getElementById('bookForm').addEventListener('submit', submitCandidacy);
  refresh().then(function () {
    var m = /^open=(\d{4}-\d{2}-\d{2})$/.exec(location.hash.slice(1));
    if (m) { var d = fromIso(m[1]); if (d && dayState(iso(d)) !== 'off' && dayState(iso(d)) !== 'out') openDay(d); }
  });
}
function embeddedInHost() { try { return window.parent !== window; } catch (e) { return true; } }
var booted = false;
function bootOnce(inG, o) { if (booted) return; booted = true; boot(inG, o); }

if (embeddedInHost() && typeof grist !== 'undefined' && grist && grist.docApi) {
  grist.ready({ requiredAccess: 'full', options: JSON.parse(JSON.stringify(DEFAULT_OPTS)) });
  grist.onOptions(function (o) { bootOnce(true, o); });
  grist.on('message', function () { bootOnce(true, null); });
  setTimeout(function () { bootOnce(true, null); }, 2000);
} else {
  bootOnce(false, null);
}
})();
