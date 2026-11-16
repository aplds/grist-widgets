/* Widget Grist — rendez-vous (générique, volontairement minimal).
 * Affiche la plage de dates qui a des ouvertures dans Grist (ou la plage
 * forcée dans les options). Chaque jour montre ses tranches : occupées en
 * rouge, candidatures en attente en jaune, libres en vert. L'utilisateur
 * sélectionne une tranche libre et pose sa CANDIDATURE : la ligne est
 * écrite « En attente » ; l'organisateur confirme dans Grist.
 * Hors Grist : mode démonstration. Statique, sans étape de build.
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
  step: 30,          /* granularité (min) des tranches */
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
  inGrist: false, demo: false,
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

/* ---------- tranches ---------- */
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
function daySlices(dateIso) {
  var step = +S.opts.step || 30, out = [];
  dayOpen(dateIso).forEach(function (op) {
    for (var t = op.start; t < op.end; t += step) {
      var e = Math.min(t + step, op.end);
      out.push({ start: t, end: e, free: !taken(dateIso, t, e) });
    }
  });
  return out;
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

/* ---------- rendu : emploi du temps (style calendrier Grist) ---------- */
var PXH = 44; /* pixels par heure */
function render() {
  document.getElementById('mainTitle').textContent = S.opts.title || DEFAULT_OPTS.title;
  var el = document.getElementById('timetable');
  el.innerHTML = '';
  var range = displayRange();
  if (!range) {
    el.innerHTML = '<p class="no-days">Aucune plage proposée pour le moment.</p>';
    document.getElementById('rangeLabel').textContent = '';
    return;
  }
  document.getElementById('rangeLabel').textContent =
    'Du ' + fmtDay(range.min) + ' au ' + fmtDay(range.max);

  /* jours à afficher + bornes horaires globales */
  var days = [], tMin = Infinity, tMax = -Infinity;
  var today = new Date();
  var past0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  for (var d = new Date(range.min); d <= range.max; d = addDays(d, 1)) {
    var ops = dayOpen(iso(d));
    if (!ops.length) continue;
    days.push(d);
    ops.forEach(function (op) {
      tMin = Math.min(tMin, op.start); tMax = Math.max(tMax, op.end);
    });
  }
  if (!days.length) {
    el.innerHTML = '<p class="no-days">Aucun créneau disponible dans la plage proposée.</p>';
    return;
  }
  tMin = Math.floor(tMin / 60) * 60;
  tMax = Math.ceil(tMax / 60) * 60;
  var hours = (tMax - tMin) / 60;
  var px = function (min) { return ((min - tMin) / 60) * PXH; };

  /* grille explicite : ligne 1 = en-têtes, lignes 2.. = heures */
  var grid = document.createElement('div');
  grid.className = 'tt-grid';
  grid.style.gridTemplateColumns = '56px repeat(' + days.length + ', minmax(110px, 1fr))';
  grid.style.gridTemplateRows = '30px repeat(' + hours + ', ' + PXH + 'px)';

  var corner = document.createElement('div'); corner.className = 'tt-corner';
  grid.appendChild(corner);
  days.forEach(function (d, i) {
    var head = document.createElement('div'); head.className = 'tt-head';
    head.style.gridColumn = (i + 2) + '';
    head.style.gridRow = '1';
    var dow = document.createElement('span'); dow.className = 'dow';
    dow.textContent = DOW_FR[d.getDay()].charAt(0).toUpperCase() + DOW_FR[d.getDay()].slice(1);
    var dnum = document.createElement('span'); dnum.className = 'dnum';
    dnum.textContent = d.getDate() + ' ' + MONTHS_FR[d.getMonth()];
    if (iso(d) === iso(today)) head.classList.add('today');
    head.appendChild(dow); head.appendChild(dnum);
    grid.appendChild(head);
  });
  for (var h = 0; h < hours; h++) {
    var hh = document.createElement('div'); hh.className = 'tt-hh';
    hh.style.gridColumn = '1'; hh.style.gridRow = (h + 2) + '';
    hh.textContent = pad((tMin / 60 + h) % 24) + ':00';
    grid.appendChild(hh);
  }

  /* colonnes de jours : une par jour, fusionnant toutes les lignes horaires */
  days.forEach(function (d, i) {
    var col = document.createElement('div'); col.className = 'tt-day';
    col.style.gridColumn = (i + 2) + '';
    col.style.gridRow = '2 / span ' + hours;
    var dIso = iso(d);
    var past = d < past0;
    dayOpen(dIso).forEach(function (op) {
      var step = +S.opts.step || 30;
      for (var t = op.start; t < op.end; t += step) {
        var e = Math.min(t + step, op.end);
        var blk = document.createElement('div');
        blk.className = 'blk';
        var free = !taken(dIso, t, e) && !past;
        var wait = !free && isPending(dIso, t, e);
        blk.classList.add(past && !taken(dIso, t, e) ? 'off' : (free ? 'free' : (wait ? 'wait' : 'busy')));
        blk.style.top = px(t) + 'px';
        blk.style.height = (px(e) - px(t) - 3) + 'px';
        if (px(e) - px(t) >= PXH / 2) blk.textContent = hhmm(t);
        if (free) {
          blk.title = 'Sélectionner ' + hhmm(t) + ' → ' + hhmm(e);
          (function (dd, slice, node) {
            node.addEventListener('click', function () { selectSlot(dd, slice, node); });
          })(dIso, { start: t, end: e }, blk);
        } else {
          blk.title = past ? 'Passé' : (wait ? 'Candidature en attente' : 'Occupé');
        }
        col.appendChild(blk);
      }
    });
    grid.appendChild(col);
  });
  el.appendChild(grid);
}

/* ---------- sélection et candidature ---------- */
function clearSelection() {
  S.sel = null;
  document.querySelectorAll('.slot.sel').forEach(function (b) { b.classList.remove('sel'); });
  var f = document.getElementById('bookForm');
  f.hidden = true; f.reset();
  document.getElementById('bookError').hidden = true;
}
function selectSlot(dateIso, slice, btn) {
  S.sel = { date: dateIso, start: slice.start, end: slice.end };
  document.querySelectorAll('.slot.sel').forEach(function (b) { b.classList.remove('sel'); });
  btn.classList.add('sel');
  var d = fromIso(dateIso);
  var f = document.getElementById('bookForm');
  f.hidden = false;
  f.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  document.getElementById('slotLine').textContent =
    fmtDay(d) + ', de ' + hhmm(slice.start) + ' à ' + hhmm(slice.end) + '.';
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
    clearSelection(); render(); return;
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
