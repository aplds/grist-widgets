/* Widget Grist — rendez-vous (générique, public universel).
 * Calendrier FullCalendar (même moteur que le widget Calendar de Grist) :
 * vue semaine, plage proposée en validRange, ouvertures en fond vert,
 * occupations en gris, candidatures en attente en ambre.
 * L'utilisateur sélectionne une zone libre à la souris et pose sa
 * CANDIDATURE : la ligne est écrite « En attente » ; l'organisateur
 * confirme dans Grist. Hors Grist : mode démonstration. Statique, sans build.
 */
(function () {
'use strict';

/* ---------- utilitaires ---------- */
var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
var DOW_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
var DEFAULT_OPTS = {
  title: 'Rendez-vous',
  openTable: 'Ouvertures',
  bookTable: 'Reservations',
  step: 30,          /* granularité (min) des créneaux */
  startDate: '',     /* plage forcée (facultatif) : '' = plage des ouvertures */
  endDate: '',
  horizonDays: 365   /* bornage maximal */
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
function fullDate(dateIso, min) {
  var d = fromIso(dateIso);
  if (!d) return null;
  d.setHours(Math.floor(min / 60), min % 60, 0, 0);
  return d;
}
function minutesOfDate(d) { return d.getHours() * 60 + d.getMinutes(); }
function minutesOf(v) {
  if (typeof v === 'number') return v > 8 ? v : v * 60;
  if (typeof v !== 'string') return null;
  var m = /^(\d{1,2})[:h](\d{2})/.exec(v.trim().toLowerCase());
  if (m) return (+m[1]) * 60 + (+m[2]);
  m = /^(\d{1,2})$/.exec(v.trim());
  if (m) return (+m[1]) * 60;
  return null;
}
function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function fmtDay(d) { return DOW_FR[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_FR[d.getMonth()]; }
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
  inGrist: false, demo: false, cal: null,
  opts: JSON.parse(JSON.stringify(DEFAULT_OPTS)),
  openings: [], busy: [], pending: [],
  sel: null /* { date, start, end } */
};
var CANCEL_TERMS = ['annule', 'refuse', 'cancel'];
var CONFIRM_TERMS = ['confirme', 'valide', 'accepte', 'reserve', 'ok'];
var PENDING_TERMS = ['attente', 'candidature', 'propose', 'pending'];

function status(msg, err) {
  var el = document.getElementById('statusLine');
  if (!msg) { el.hidden = true; return; }
  el.hidden = false; el.textContent = msg;
  el.className = 'status' + (err ? ' err' : '');
}

/* ---------- démo (23-25 du mois prochain, fausses données) ---------- */
function demoData() {
  var t = new Date();
  var base = new Date(t.getFullYear(), t.getMonth() + 1, 23);
  var ops = [], busy = [], pend = [];
  for (var i = 0; i <= 2; i++) {
    var day = addDays(base, i), dIso = iso(day);
    ops.push({ date: dIso, start: 9 * 60, end: 12 * 60, closed: false });
    ops.push({ date: dIso, start: 14 * 60, end: 17 * 60, closed: false });
  }
  busy.push({ date: iso(base), start: 10 * 60, end: 11 * 60 });
  busy.push({ date: iso(base), start: 15 * 60, end: 17 * 60 });
  busy.push({ date: iso(addDays(base, 1)), start: 9 * 60, end: 9 * 60 + 45 });
  pend.push({ date: iso(addDays(base, 2)), start: 14 * 60, end: 15 * 60 });
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
    if (s == null || e == null || e <= s) return;
    S.openings.push({ date: iso(d), start: s, end: e,
      closed: oClosed ? matches(r[oClosed], CANCEL_TERMS.concat(['ferme'])) : false });
  });
  bRows.forEach(function (r) {
    var d = fromIso(r[bDate]); if (!d) return;
    var s = minutesOf(r[bStart]); if (s == null) return;
    var e = bEnd && minutesOf(r[bEnd]) != null ? minutesOf(r[bEnd]) :
      (bDur && +r[bDur] ? s + (+r[bDur]) : s + 60);
    var st = bStat ? norm(r[bStat]) : '';
    if (matches(st, CANCEL_TERMS)) return;
    var isPending = st ? (!matches(st, CONFIRM_TERMS) && matches(st, PENDING_TERMS)) : false;
    (isPending ? S.pending : S.busy).push({ date: iso(d), start: s, end: e });
  });
  if (!S.openings.length) throw new Error(
    'Aucune ouverture dans « ' + S.opts.openTable + ' » — renseigner la plage proposée.');
}

/* ---------- tranches / conflits ---------- */
function dayOpen(dateIso) {
  return S.openings.filter(function (o) { return o.date === dateIso && !o.closed; })
    .sort(function (a, b) { return a.start - b.start; });
}
function overlaps(aS, aE, bS, bE) { return aS < bE && bS < aE; }
function taken(dateIso, s, e) {
  return S.busy.concat(S.pending).some(function (b) {
    return b.date === dateIso && overlaps(b.start, b.end, s, e);
  });
}
function isPending(dateIso, s, e) {
  return S.pending.some(function (b) { return b.date === dateIso && overlaps(b.start, b.end, s, e); });
}
function withinOpening(dateIso, s, e) {
  return dayOpen(dateIso).some(function (op) { return s >= op.start && e <= op.end; });
}

/* ---------- plage affichée ---------- */
function displayRange() {
  var forcedS = fromIso(S.opts.startDate), forcedE = fromIso(S.opts.endDate);
  var dates = S.openings.map(function (o) { return o.date; }).sort();
  var min = forcedS || (dates[0] ? fromIso(dates[0]) : null);
  var max = forcedE || (dates.length ? fromIso(dates[dates.length - 1]) : null);
  var horizon = addDays(new Date(), +S.opts.horizonDays || 365);
  if (!min || !max || max < min) return null;
  if (max > horizon) max = horizon;
  return { min: min, max: max };
}

/* ---------- rendu FullCalendar ---------- */
function buildEvents() {
  var evts = [];
  S.openings.forEach(function (o) {
    if (o.closed) return;
    var st = fullDate(o.date, o.start), en = fullDate(o.date, o.end);
    if (!st || !en) return;
    evts.push({ start: st, end: en, display: 'background' });
  });
  S.busy.forEach(function (b) {
    var st = fullDate(b.date, b.start), en = fullDate(b.date, b.end);
    if (!st || !en) return;
    evts.push({ start: st, end: en, title: 'Occupé' });
  });
  S.pending.forEach(function (p) {
    var st = fullDate(p.date, p.start), en = fullDate(p.date, p.end);
    if (!st || !en) return;
    evts.push({ start: st, end: en, title: 'En attente', className: 'pend' });
  });
  return evts;
}
function timeBounds() {
  var tMin = Infinity, tMax = -Infinity;
  S.openings.forEach(function (o) {
    if (o.closed) return;
    tMin = Math.min(tMin, o.start); tMax = Math.max(tMax, o.end);
  });
  if (tMin === Infinity) { tMin = 8 * 60; tMax = 18 * 60; }
  return { tMin: tMin, tMax: tMax };
}
function ensureCalendar(range, tb) {
  if (S.cal) { S.cal.destroy(); S.cal = null; }
  document.getElementById('timetable') /* compat éventuelle */;
  var holder = document.getElementById('wrap');
  var old = document.getElementById('calendar');
  if (old) old.remove();
  var cal = document.createElement('div');
  cal.id = 'calendar';
  holder.insertBefore(cal, holder.firstChild);
  var step = +S.opts.step || 30;
  var slot = '00:' + pad(step) + ':00';
  var now = new Date();
  S.cal = new FullCalendar.Calendar(cal, {
    locale: 'fr',
    initialView: 'timeGridWeek',
    initialDate: (range.min > now ? range.min : now),
    headerToolbar: { left: 'prev,next today', center: 'title', right: 'timeGridWeek,dayGridMonth' },
    height: 'auto',
    expandRows: true,
    allDaySlot: false,
    slotDuration: slot,
    snapDuration: slot,
    slotLabelInterval: '01:00:00',
    scrollTime: hhmm(tb.tMin),
    slotMinTime: hhmm(Math.floor(tb.tMin / 60) * 60),
    slotMaxTime: hhmm(Math.ceil(tb.tMax / 60) * 60),
    validRange: { start: range.min, end: addDays(range.max, 1) },
    selectable: true,
    selectMirror: false,
    unselectAuto: false,
    editable: false,
    eventStartEditable: false,
    eventDurationEditable: false,
    dayMaxEvents: true,
    events: buildEvents(),
    selectAllow: function (info) {
      if (iso(info.start) !== iso(info.end)) return false;   /* un seul jour */
      var dIso = iso(info.start);
      var s = minutesOfDate(info.start), e = minutesOfDate(info.end);
      if (e <= s) return false;
      var today = new Date();
      var today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      if (info.start < today0) return false;                  /* pas de passé */
      return withinOpening(dIso, s, e) && !taken(dIso, s, e);
    },
    select: function (info) {
      selectSlot(iso(info.start), minutesOfDate(info.start), minutesOfDate(info.end));
    }
  });
  S.cal.render();
}
function render() {
  document.getElementById('mainTitle').textContent = S.opts.title || DEFAULT_OPTS.title;
  var el = document.getElementById('wrap');
  var range = displayRange();
  if (!range) {
    if (S.cal) { S.cal.destroy(); S.cal = null; }
    el.insertAdjacentHTML('beforeend', '<p class="no-days" id="nod">Aucune plage proposée pour le moment.</p>');
    document.getElementById('rangeLabel').textContent = '';
    return;
  }
  document.getElementById('rangeLabel').textContent =
    'Du ' + fmtDay(range.min) + ' au ' + fmtDay(range.max);
  var nod = document.getElementById('nod'); if (nod) nod.remove();
  ensureCalendar(range, timeBounds());
}

/* ---------- sélection et candidature ---------- */
function clearSelection() {
  S.sel = null;
  if (S.cal) S.cal.unselect();
  var f = document.getElementById('bookForm');
  f.hidden = true; f.reset();
  document.getElementById('bookError').hidden = true;
}
function selectSlot(dateIso, startMin, endMin) {
  S.sel = { date: dateIso, start: startMin, end: endMin };
  var d = fromIso(dateIso);
  var f = document.getElementById('bookForm');
  f.hidden = false;
  f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('slotLine').textContent =
    fmtDay(d) + ', de ' + hhmm(startMin) + ' à ' + hhmm(endMin) + '.';
  document.getElementById('bookError').hidden = true;
}

async function submitCandidacy(ev) {
  ev.preventDefault();
  var name = document.getElementById('bookName').value.trim();
  var email = document.getElementById('bookEmail').value.trim();
  if (!name || !email || !S.sel) return;
  if (S.demo) {
    S.pending.push({ date: S.sel.date, start: S.sel.start, end: S.sel.end });
    status('Démo : candidature simulée (' + name + ', ' + hhmm(S.sel.start) + ').');
    clearSelection(); refresh(); return;
  }
  try {
    await loadGrist(); /* relecture anti-conflit */
    if (taken(S.sel.date, S.sel.start, S.sel.end)) {
      throw new Error("Ce créneau vient d'être pris. Merci d'en choisir un autre.");
    }
    var rows = await grist.docApi.getTable(S.opts.bookTable);
    var cols = rows.length ? Object.keys(rows[0]) : [];
    var f = {};
    var cD = pickCol(cols, ['date', 'jour']); if (cD) f[cD] = S.sel.date;
    var cS = pickCol(cols, ['debut', 'heure', 'start', 'time']); if (cS) f[cS] = hhmm(S.sel.start);
    var cE = pickCol(cols, ['fin', 'end']);
    var cDur = pickCol(cols, ['duree', 'duration']);
    if (cE) f[cE] = hhmm(S.sel.end);
    else if (cDur) f[cDur] = S.sel.end - S.sel.start;
    var cN = pickCol(cols, ['nom', 'name']); if (cN) f[cN] = name;
    var cM = pickCol(cols, ['email', 'courriel']); if (cM) f[cM] = email;
    var cO = pickCol(cols, ['motif', 'objet', 'sujet', 'subject']);
    if (cO) f[cO] = document.getElementById('bookSubject').value.trim();
    var cSt = pickCol(cols, ['statut', 'etat', 'status']);
    if (cSt) f[cSt] = 'En attente';
    await grist.addRecords(S.opts.bookTable, [{ fields: f, toc: false }]);
    status('Demande envoyée — vous serez confirmé par courriel.');
    clearSelection();
    await refresh();
  } catch (e) {
    var err = document.getElementById('bookError');
    err.hidden = false; err.textContent = e.message;
  }
}

/* ---------- rafraîchissement ---------- */
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

/* ---------- démarrage ---------- */
function boot(inGrist, savedOpts) {
  S.inGrist = inGrist; S.demo = !inGrist;
  if (savedOpts) Object.keys(DEFAULT_OPTS).forEach(function (k) {
    if (savedOpts[k] !== undefined) S.opts[k] = savedOpts[k];
  });
  document.getElementById('bookCancel').addEventListener('click', clearSelection);
  document.getElementById('bookForm').addEventListener('submit', submitCandidacy);
  refresh();
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
