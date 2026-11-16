/* Widget Grist — prise de rendez-vous (générique).
 * - Dans Grist (Custom widget, accès complet) : lit la table des ouvertures et
 *   celle des réservations, calcule les créneaux libres, inscrit les nouvelles
 *   réservations (grist.addRecords), configuration via les options du widget.
 * - Hors Grist (GitHub Pages seul) : mode DEMO avec fausses données.
 * - 100 % statique : déployable tel quel, aucune étape de build.
 */
(function () {
'use strict';

/* ---------- utilitaires ---------- */
var DEFAULT_OPTS = {
  title: 'Prise de rendez-vous',
  subtitle: '',
  openTable: 'Ouvertures',
  bookTable: 'Reservations',
  durations: [15, 30, 45, 60],
  horizonDays: 60,
  map: {} /* surcharges de correspondances de colonnes */
};
var DOW_FR = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];
var MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];

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
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return null;
  var m = /^(\d{1,2})[:h](\d{2})/.exec(v.trim().toLowerCase());
  if (m) return (+m[1]) * 60 + (+m[2]);
  m = /^(\d{1,2})$/.exec(v.trim());
  if (m) return (+m[1]) * 60; /* "14" = 14h00 */
  return null;
}
function hhmm(min) { return pad(Math.floor(min / 60)) + ':' + pad(min % 60); }
function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
function sameDay(a, b) { return iso(a) === iso(b); }
function fmtLong(d) { var w = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  return w[d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS_FR[d.getMonth()] + ' ' + d.getFullYear(); }

/* Détection de colonne par alias insensible à la casse/accents. */
function norm(s) { return (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function pickCol(cols, aliases) {
  for (var i = 0; i < aliases.length; i++) {
    for (var j = 0; j < cols.length; j++) if (norm(cols[j]) === aliases[i]) return cols[j];
  }
  for (var k = 0; k < aliases.length; k++) {
    for (var l = 0; l < cols.length; l++) if (norm(cols[l]).indexOf(aliases[k]) !== -1) return cols[l];
  }
  return null;
}

/* ---------- état ---------- */
var S = {
  inGrist: false,
  opts: JSON.parse(JSON.stringify(DEFAULT_OPTS)),
  view: 'month',
  cursor: new Date(),
  openings: [],   /* {date, start, end, step, cap, closed} */
  bookings: [],   /* {date, start, dur, cancelled} */
  demo: false
};

function status(msg, err) {
  var el = document.getElementById('statusLine');
  if (!msg) { el.hidden = true; return; }
  el.hidden = false; el.textContent = msg;
  el.className = 'status' + (err ? ' err' : '');
}

/* ---------- démo ---------- */
function demoData() {
  var t = new Date(); var ops = []; var day;
  for (var i = 1; i <= 21; i++) {
    day = addDays(t, i);
    var dow = day.getDay();
    if (dow === 0 || dow === 6) continue;
    ops.push({ date: iso(day), start: 9 * 60, end: 12 * 60, step: 30, cap: 1, closed: false });
    ops.push({ date: iso(day), start: 14 * 60, end: 17 * 60, step: 30, cap: 1, closed: false });
  }
  var b1 = addDays(t, 2), b2 = addDays(t, 2), b3 = addDays(t, 5);
  var books = [
    { date: iso(b1), start: 10 * 60, dur: 30, cancelled: false },
    { date: iso(b2), start: 15 * 60, dur: 60, cancelled: false },
    { date: iso(b3), start: 9 * 60, dur: 30, cancelled: false }
  ];
  return { openings: ops, bookings: books };
}

/* ---------- correspondances ---------- */
function resolveMap(rows, table, overrides) {
  var cols = rows.length ? Object.keys(rows[0]).filter(function (c) { return c !== 'id'; }) : [];
  var get = function (key, aliases) {
    return (overrides && overrides[table + '.' + key]) || pickCol(cols, aliases);
  };
  if (table === 'open') return {
    date: get('date', ['date', 'jour', 'day']),
    start: get('start', ['heuredebut', 'debut', 'de', 'start', 'from', 'hstart']),
    end: get('end', ['heurefin', 'fin', 'a', 'au', 'jusqua', 'end', 'to', 'hend']),
    step: get('step', ['pas', 'creneau', 'dureecreneau', 'step', 'interval', 'grille']),
    cap: get('cap', ['capacite', 'places', 'capacity', 'cap']),
    closed: get('closed', ['ferme', 'statut', 'etat', 'closed', 'status', 'annule', 'dispo'])
  };
  return {
    date: get('date', ['date', 'jour', 'day']),
    start: get('start', ['heure', 'heuredebut', 'debut', 'creneau', 'time', 'start']),
    dur: get('dur', ['duree', 'duration', 'minutes']),
    closed: get('cancelled', ['statut', 'etat', 'annule', 'status', 'state', 'cancelled'])
  };
}
function isOpeningClosed(row, col, cfgClosedTerms) {
  if (!col) return false;
  var v = norm(row[col]);
  if (!v) return false;
  var terms = (cfgClosedTerms || 'ferme,annule,closed,cancelled,no').split(',').map(norm);
  return terms.indexOf(v) !== -1;
}

/* ---------- chargement ---------- */
async function loadGrist() {
  var docs = {};
  var oTable = S.opts.openTable, bTable = S.opts.bookTable;
  docs[oTable] = await grist.docApi.getTable(oTable);
  if (bTable && bTable !== oTable) docs[bTable] = await grist.docApi.getTable(bTable);
  else docs[bTable] = docs[oTable];

  var oMap = resolveMap(docs[oTable], 'open', S.opts.map);
  var bMap = resolveMap(docs[bTable], 'book', S.opts.map);
  if (!oMap.date || !oMap.start || !oMap.end) {
    throw new Error('Colonnes des ouvertures introuvables (date / début / fin attendus).');
  }
  var closedTerms = (S.opts.map['open.closedTerms'] || S.opts.map && S.opts.map['open.closedTerms']) || '';
  var closedTerms2 = (S.opts.map['book.cancelledTerms'] || '');
  S.openings = docs[oTable].filter(function (r) {
    return fromIso(r[oMap.date]) && minutesOf(r[oMap.start]) != null && minutesOf(r[oMap.end]) != null;
  }).map(function (r) {
    return {
      date: iso(fromIso(r[oMap.date])),
      start: minutesOf(r[oMap.start]),
      end: minutesOf(r[oMap.end]),
      step: (oMap.step && +r[oMap.step]) || 30,
      cap: (oMap.cap && +r[oMap.cap]) || 1,
      closed: isOpeningClosed(r, oMap.closed, closedTerms)
    };
  });
  S.bookings = docs[bTable].filter(function (r) {
    return fromIso(r[bMap.date]) && minutesOf(r[bMap.start]) != null;
  }).map(function (r) {
    return {
      id: r.id,
      date: iso(fromIso(r[bMap.date])),
      start: minutesOf(r[bMap.start]),
      dur: (bMap.dur && +r[bMap.dur]) || 30,
      cancelled: isOpeningClosed(r, bMap.closed, closedTerms2)
    };
  });
}

async function refresh() {
  try {
    if (S.inGrist) { await loadGrist(); status(null); }
    else { var d = demoData(); S.openings = d.openings; S.bookings = d.bookings; }
    render();
  } catch (e) {
    status('Erreur de chargement : ' + e.message, true);
  }
}

/* ---------- créneaux ---------- */
function openingsFor(dateIso) {
  return S.openings.filter(function (o) { return o.date === dateIso && !o.closed; })
    .sort(function (a, b) { return a.start - b.start; });
}
function bookingsFor(dateIso) {
  return S.bookings.filter(function (b) { return b.date === dateIso && !b.cancelled; });
}
/* Occupe un intervalle [s, s+dur) et indique si l'insertion est possible. */
function overlaps(aS, aE, bS, bE) { return aS < bE && bS < aE; }
function slotFree(dateIso, start, dur) {
  var bs = bookingsFor(dateIso);
  for (var i = 0; i < bs.length; i++) {
    if (overlaps(start, start + dur, bs[i].start, bs[i].start + bs[i].dur)) {
      var occ = 1; /* capacité gérée via comptage ci-dessous */
    }
  }
  return countBookings(dateIso, start, dur) === 0;
}
function countBookings(dateIso, start, dur) {
  return bookingsFor(dateIso).filter(function (b) {
    return overlaps(start, start + dur, b.start, b.start + b.dur);
  }).length;
}
/* Génère les blocs d'une journée pour la timeline : ouvertures + résa + trous. */
function dayBlocks(dateIso) {
  var ops = openingsFor(dateIso); var out = [];
  ops.forEach(function (op) {
    var start = op.start;
    var bs = bookingsFor(dateIso).filter(function (b) {
      return overlaps(b.start, b.start + b.dur, op.start, op.end);
    }).sort(function (a, b) { return a.start - b.start; });
    bs.forEach(function (b) {
      if (b.start > start) out.push({ kind: 'free', start: start, end: b.start, step: op.step, cap: op.cap });
      out.push({ kind: 'busy', start: Math.max(b.start, op.start),
        end: Math.min(b.start + b.dur, op.end) });
      start = Math.min(b.start + b.dur, op.end);
    });
    if (start < op.end) out.push({ kind: 'free', start: start, end: op.end, step: op.step, cap: op.cap });
  });
  return out;
}
function freeSlots(dateIso, dur) {
  var out = [];
  dayBlocks(dateIso).forEach(function (b) {
    if (b.kind !== 'free') return;
    for (var t = b.start; t + dur <= b.end; t += (b.step || 30)) out.push(t);
  });
  return out;
}
function dayStats(dateIso) {
  var ops = openingsFor(dateIso);
  if (!ops.length) return { state: 'closed' };
  var free = 0, total = 0;
  ops.forEach(function (op) {
    dayBlocks(dateIso).forEach(function (b) {
      if (b.kind === 'free' && b.start >= op.start && b.end <= op.end) free += b.end - b.start;
    });
    total += op.end - op.start;
  });
  return { state: free > 0 ? 'free' : 'busy', freeMin: free, totalMin: total };
}

/* ---------- rendu ---------- */
function render() {
  document.getElementById('mainTitle').textContent = S.opts.title || DEFAULT_OPTS.title;
  document.getElementById('subTitle').textContent =
    S.opts.subtitle || (S.demo ? 'Mode démonstration' :
      (S.opts.openTable + ' / ' + S.opts.bookTable));
  var mg = document.getElementById('monthGrid');
  var wg = document.getElementById('weekGrid');
  var dg = document.getElementById('dayGrid');
  mg.hidden = S.view !== 'month'; wg.hidden = S.view !== 'week'; dg.hidden = S.view !== 'day';
  if (S.view === 'month') renderMonth(mg);
  else if (S.view === 'week') renderWeek(wg);
  else renderDay(dg);
}

function renderMonth(el) {
  el.innerHTML = '';
  DOW_FR.forEach(function (d) {
    var h = document.createElement('div'); h.className = 'dow'; h.textContent = d; el.appendChild(h);
  });
  var first = new Date(S.cursor.getFullYear(), S.cursor.getMonth(), 1);
  var offset = (first.getDay() + 6) % 7;
  var days = new Date(S.cursor.getFullYear(), S.cursor.getMonth() + 1, 0).getDate();
  var today = new Date(); var horizon = addDays(today, S.opts.horizonDays || 60);
  for (var i = 0; i < offset; i++) {
    var e = document.createElement('div'); e.className = 'day-cell empty'; el.appendChild(e);
  }
  for (var d = 1; d <= days; d++) {
    var date = new Date(S.cursor.getFullYear(), S.cursor.getMonth(), d);
    var cell = document.createElement('div');
    var st = dayStats(iso(date));
    var past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var beyond = date > horizon;
    cell.className = 'day-cell' + (sameDay(date, today) ? ' today' : '');
    var bar = document.createElement('div'); bar.className = 'bar';
    var label = '';
    if (past) { cell.classList.add('empty'); bar.classList.add('closed-bar'); label = '—'; }
    else if (beyond) { bar.classList.add('closed-bar'); label = 'hors délai'; }
    else if (st.state === 'closed') { bar.classList.add('closed-bar'); label = 'fermé'; }
    else if (st.state === 'busy') { bar.classList.add('busy-bar'); label = 'complet'; }
    else { label = Math.floor(st.freeMin / 60) + ' h ' + (st.freeMin % 60) + ' min libres'; }
    var num = document.createElement('div'); num.className = 'dnum'; num.textContent = d;
    var info = document.createElement('div'); info.className = 'slots-mini'; info.textContent = label;
    cell.appendChild(num); cell.appendChild(info); cell.appendChild(bar);
    (function (dd) {
      if (!past && st.state === 'free') {
        cell.addEventListener('click', function () { S.cursor = dd; S.view = 'day'; syncTabs(); render(); });
      }
    })(date);
    el.appendChild(cell);
  }
}

function renderWeek(el) {
  el.innerHTML = '';
  var monday = addDays(S.cursor, -((S.cursor.getDay() + 6) % 7));
  var today = new Date(); var horizon = addDays(today, S.opts.horizonDays || 60);
  for (var i = 0; i < 7; i++) {
    var date = addDays(monday, i);
    var col = document.createElement('div'); col.className = 'day-col';
    var h = document.createElement('h3');
    h.textContent = DOW_FR[i] + ' ' + date.getDate();
    if (sameDay(date, today)) h.style.color = 'var(--accent)';
    col.appendChild(h);
    var list = document.createElement('div'); list.className = 'slot-list';
    var slots = freeSlots(iso(date), Math.min.apply(null, S.opts.durations.length ? S.opts.durations : [30]));
    var past = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (past || date > horizon) {
      var c0 = document.createElement('div'); c0.className = 'slot closed-slot';
      c0.textContent = date > horizon ? 'hors délai' : 'passé'; list.appendChild(c0);
    } else if (!slots.length) {
      var c1 = document.createElement('div'); c1.className = 'slot closed-slot';
      c1.textContent = openingsFor(iso(date)).length ? 'complet' : 'fermé';
      list.appendChild(c1);
    } else {
      slots.slice(0, 8).forEach(function (t) {
        var s = document.createElement('div'); s.className = 'slot'; s.textContent = hhmm(t);
        s.addEventListener('click', function () { openBooking(iso(date), t); });
        list.appendChild(s);
      });
      if (slots.length > 8) {
        var m = document.createElement('div'); m.className = 'week-more';
        m.textContent = '+' + (slots.length - 8) + ' autres';
        m.style.cursor = 'pointer';
        m.addEventListener('click', function () { S.cursor = date; S.view = 'day'; syncTabs(); render(); });
        list.appendChild(m);
      }
    }
    col.appendChild(list); el.appendChild(col);
  }
}

function renderDay(el) {
  el.innerHTML = '';
  var dateIso = iso(S.cursor);
  var head = document.createElement('div'); head.className = 'day-head';
  var h2 = document.createElement('h2'); h2.textContent = fmtLong(S.cursor);
  head.appendChild(h2); el.appendChild(head);
  var blocks = dayBlocks(dateIso);
  if (!blocks.length) {
    var p = document.createElement('p'); p.className = 'week-more';
    p.textContent = 'Aucune ouverture ce jour-là.'; el.appendChild(p); return;
  }
  var min = Infinity, max = -Infinity;
  blocks.forEach(function (b) { min = Math.min(min, b.start); max = Math.max(max, b.end); });
  var tl = document.createElement('div'); tl.className = 'timeline';
  tl.style.height = '420px';
  var px = function (m) { return ((m - min) / (max - min)) * 400 + 10; };
  for (var h = Math.ceil(min / 60) * 60; h <= max; h += 60) {
    var hr = document.createElement('div'); hr.className = 'tl-hour';
    hr.style.top = px(h) + 'px'; hr.textContent = hhmm(h); tl.appendChild(hr);
  }
  var today = new Date(); var horizon = addDays(today, S.opts.horizonDays || 60);
  var past = S.cursor < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var beyond = S.cursor > horizon;
  blocks.forEach(function (b) {
    var d = document.createElement('div');
    d.className = 'tl-block ' + (b.kind === 'busy' ? 'busy' : 'free');
    d.style.top = px(b.start) + 'px';
    d.style.height = Math.max(px(b.end) - px(b.start) - 2, 16) + 'px';
    d.textContent = b.kind === 'busy' ? 'Réservé' : ('Libre — ' + hhmm(b.start) + ' → ' + hhmm(b.end));
    if (b.kind === 'free' && !past && !beyond) {
      d.title = 'Cliquer pour réserver';
      d.addEventListener('click', function () { openBooking(dateIso, b.start); });
    } else if (b.kind === 'free') {
      d.className = 'tl-block gap';
      d.title = past ? 'Date passée' : 'Hors délai de réservation';
    }
    tl.appendChild(d);
  });
  el.appendChild(tl);
}

/* ---------- réservation ---------- */
function openBooking(dateIso, start) {
  var dlg = document.getElementById('bookDialog');
  var durSel = document.getElementById('bookDuration');
  var fit = (S.opts.durations || [30]).filter(function (d) {
    return freeSlots(dateIso, d).indexOf(start) !== -1;
  });
  if (!fit.length) { status('Ce créneau ne permet aucune durée proposée.', true); return; }
  durSel.innerHTML = '';
  fit.forEach(function (d) {
    var o = document.createElement('option'); o.value = d;
    o.textContent = d + ' minutes'; durSel.appendChild(o);
  });
  document.getElementById('bookError').hidden = true;
  document.getElementById('bookTitle').textContent = 'Réserver le ' + fmtLong(fromIso(dateIso));
  document.getElementById('bookSlot').textContent = 'à partir de ' + hhmm(start);
  document.getElementById('bookForm').dataset.date = dateIso;
  document.getElementById('bookForm').dataset.start = start;
  dlg.showModal();
}

async function submitBooking(ev) {
  ev.preventDefault();
  var f = ev.target;
  var dateIso = f.dataset.date, start = +f.dataset.start;
  var dur = +document.getElementById('bookDuration').value;
  var rec = {
    date: dateIso, start: hhmm(start), dur: dur,
    name: document.getElementById('bookName').value.trim(),
    email: document.getElementById('bookEmail').value.trim(),
    phone: document.getElementById('bookPhone').value.trim(),
    subject: document.getElementById('bookSubject').value.trim(),
    notes: document.getElementById('bookNotes').value.trim()
  };
  if (!rec.name || !rec.email) return;
  if (S.demo) {
    S.bookings.push({ date: dateIso, start: start, dur: dur, cancelled: false });
    document.getElementById('bookDialog').close();
    status('Démo : réservation simulée pour ' + rec.name + ' (' + hhmm(start) + ', ' + dur + ' min).');
    render(); return;
  }
  /* Réserve la course avant écriture : re-chargement puis contrôle de conflit. */
  var bMap = null;
  try {
    await loadGrist();
    if (!slotFree(dateIso, start, dur)) {
      throw new Error('Ce créneau vient d’être pris. Merci d’en choisir un autre.');
    }
    var rows = await grist.docApi.getTable(S.opts.bookTable);
    var cols = rows.length ? Object.keys(rows[0]) : [];
    bMap = resolveMap(rows, 'book', S.opts.map);
    var payload = {};
    if (bMap.date) payload[bMap.date] = rec.date;
    if (bMap.start) payload[bMap.start] = rec.start;
    if (bMap.dur) payload[bMap.dur] = rec.dur;
    var extra = {
      nom: rec.name, name: rec.name, email: rec.email, courriel: rec.email,
      tel: rec.phone, telephone: rec.phone, motif: rec.subject, objet: rec.subject,
      notes: rec.notes
    };
    Object.keys(extra).forEach(function (k) {
      if (!extra[k]) return;
      var col = pickCol(cols, [norm(k)]);
      if (col && !(col in payload)) payload[col] = extra[k];
    });
    await grist.addRecords(S.opts.bookTable, [{ fields: payload, toc: false }]);
    document.getElementById('bookDialog').close();
    status('Réservation enregistrée : ' + rec.name + ', le ' + rec.date + ' à ' + rec.start + ' (' + rec.dur + ' min).');
    await refresh();
  } catch (e) {
    var err = document.getElementById('bookError');
    err.hidden = false; err.textContent = e.message;
  }
}

/* ---------- configuration ---------- */
function fillCfg() {
  var o = S.opts;
  document.getElementById('cfgTitle').value = o.title || '';
  document.getElementById('cfgSubtitle').value = o.subtitle || '';
  document.getElementById('cfgOpenTable').value = o.openTable || '';
  document.getElementById('cfgBookTable').value = o.bookTable || '';
  document.getElementById('cfgDurations').value = (o.durations || []).join(', ');
  document.getElementById('cfgHorizon').value = o.horizonDays || 60;
  var m = o.map || {};
  document.getElementById('cfgODate').value = m['open.date'] || '';
  document.getElementById('cfgOStart').value = m['open.start'] || '';
  document.getElementById('cfgOEnd').value = m['open.end'] || '';
  document.getElementById('cfgOStep').value = m['open.step'] || '';
  document.getElementById('cfgOCap').value = m['open.cap'] || '';
  document.getElementById('cfgOClosed').value = m['open.closedTerms'] || '';
  document.getElementById('cfgBDate').value = m['book.date'] || '';
  document.getElementById('cfgBTime').value = m['book.start'] || '';
  document.getElementById('cfgBDur').value = m['book.dur'] || '';
  document.getElementById('cfgBCancel').value = m['book.cancelledTerms'] || '';
}
function saveCfg(ev) {
  if (ev.target.value !== 'save') return;
  var o = S.opts;
  o.title = document.getElementById('cfgTitle').value || DEFAULT_OPTS.title;
  o.subtitle = document.getElementById('cfgSubtitle').value;
  o.openTable = document.getElementById('cfgOpenTable').value.trim() || DEFAULT_OPTS.openTable;
  o.bookTable = document.getElementById('cfgBookTable').value.trim() || DEFAULT_OPTS.bookTable;
  o.durations = document.getElementById('cfgDurations').value.split(',')
    .map(function (s) { return parseInt(s.trim(), 10); })
    .filter(function (n) { return n > 0; });
  o.horizonDays = Math.max(1, +document.getElementById('cfgHorizon').value || 60);
  var val = function (id) { return document.getElementById(id).value.trim() || undefined; };
  o.map = {
    'open.date': val('cfgODate'), 'open.start': val('cfgOStart'), 'open.end': val('cfgOEnd'),
    'open.step': val('cfgOStep'), 'open.cap': val('cfgOCap'),
    'open.closedTerms': val('cfgOClosed'),
    'book.date': val('cfgBDate'), 'book.start': val('cfgBTime'),
    'book.dur': val('cfgBDur'), 'book.cancelledTerms': val('cfgBCancel')
  };
  Object.keys(o.map).forEach(function (k) { if (!o.map[k]) delete o.map[k]; });
  if (S.inGrist) grist.setOptions(JSON.parse(JSON.stringify(o)));
  refresh();
}

/* ---------- navigation ---------- */
function syncTabs() {
  document.querySelectorAll('#tabBar button').forEach(function (b) {
    b.setAttribute('aria-selected', b.dataset.view === S.view ? 'true' : 'false');
  });
}
function shift(dir) {
  if (S.view === 'day') S.cursor = addDays(S.cursor, dir);
  else if (S.view === 'week') S.cursor = addDays(S.cursor, 7 * dir);
  else S.cursor = new Date(S.cursor.getFullYear(), S.cursor.getMonth() + dir, 1);
  render();
}

/* ---------- démarrage ---------- */
function boot(hasGrist, savedOpts) {
  S.inGrist = hasGrist; S.demo = !hasGrist;
  if (savedOpts) {
    Object.keys(DEFAULT_OPTS).forEach(function (k) {
      if (savedOpts[k] !== undefined) S.opts[k] = savedOpts[k];
    });
  }
  document.getElementById('prevBtn').addEventListener('click', function () { shift(-1); });
  document.getElementById('nextBtn').addEventListener('click', function () { shift(1); });
  document.getElementById('todayBtn').addEventListener('click', function () {
    S.cursor = new Date(); render();
  });
  document.getElementById('refreshBtn').addEventListener('click', refresh);
  document.getElementById('cfgBtn').addEventListener('click', function () {
    fillCfg(); document.getElementById('cfgDialog').showModal();
  });
  document.querySelectorAll('#tabBar button').forEach(function (b) {
    b.addEventListener('click', function () { S.view = b.dataset.view; syncTabs(); render(); });
  });
  document.getElementById('cfgDialog').addEventListener('close', saveCfg);
  document.getElementById('bookForm').addEventListener('submit', submitBooking);
  document.getElementById('bookCancel').addEventListener('click', function () {
    document.getElementById('bookDialog').close();
  });
  /* Ancre d'URL : #month, #week, #day ou #day=2026-11-24 (lien partageable). */
  var hm = /^(month|week|day)(?:=(\d{4}-\d{2}-\d{2}))?$/.exec(location.hash.slice(1));
  if (hm) {
    S.view = hm[1];
    if (hm[2]) { var d = fromIso(hm[2]); if (d) S.cursor = d; }
    else if (hm[1] !== 'month') S.cursor = new Date();
  }
  syncTabs();
  refresh();
}

/* Détection d'hébergement : le script de l'API Grist existe même hors de
 * Grist (RPC sans réponse). On teste donc l'iframe : intégré dans Grist si
 * la page n'est pas la racine de navigation ; sinon mode démo (Pages). */
function embeddedInHost() {
  try { return window.parent !== window; } catch (e) { return true; }
}
var booted = false;
function bootOnce(inGrist, savedOpts) {
  if (booted) return;
  booted = true;
  boot(inGrist, savedOpts || null);
  if (inGrist) {
    status('En attente des données Grist — vérifier que l’accès complet au ' +
      'document est accordé au widget et que les tables indiquées existent.');
  }
}
if (embeddedInHost() && typeof grist !== 'undefined' && grist && grist.docApi) {
  grist.ready({ requiredAccess: 'full', options: JSON.parse(JSON.stringify(DEFAULT_OPTS)) });
  grist.onOptions(function (o) {
    if (!booted) bootOnce(true, o);
    else if (o) {
      Object.keys(DEFAULT_OPTS).forEach(function (k) {
        if (o[k] !== undefined) S.opts[k] = o[k];
      });
      refresh();
    }
  });
  /* Accès accordé : Grist notifie via le message "message". */
  grist.on('message', function () {
    if (booted && S.inGrist) refresh();
    else bootOnce(true, null);
  });
  /* Garde-fou : si rien ne survient (accès non accordé...), démarrer quand même. */
  setTimeout(function () { bootOnce(true, null); }, 2000);
} else {
  bootOnce(false, null);
}
})();
