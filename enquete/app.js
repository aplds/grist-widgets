/* Widget Grist — visualisation d'enquetes (generique).
 * - Sans API Grist : mode DEMO (fausses donnees Veille 2026).
 * - Dans Grist (Custom widget, acces "Read selected table") : lit la table liee,
 *   recupere les metadonnees _grist_Tables_column si acces complet, sinon infere.
 * - 100 % statique : deposable tel quel sur GitHub Pages.
 */
(function () {
'use strict';

/* ---------------- constantes ---------------- */
var PALETTE = ['#2f6fed', '#0e9f6e', '#e05d44', '#7c3aed', '#c27803',
  '#0694a2', '#6574cd', '#d61f69', '#5b8c5a', '#9aa5b1'];
var SYSTEM_COLS = { id: 1, manualSort: 1 };

/* Schéma du JEU DE DÉMO uniquement (enquête Veille 2026) : sert à générer des
 * fausses données et à habiller la démo. Les vraies données (Grist / CSV)
 * sont TOUJOURS analysées par inférence ou via les métadonnées Grist —
 * jamais via ce schéma. */
var DEMO_SCHEMA = [
  { colId: 'Q_1_1', kind: 'single', label: 'Q1 — Abonnement',
    question: "Êtes-vous abonné à la lettre d'information juridique ?",
    choices: ['Oui', 'Non'] },
  { colId: 'Q_1_2', kind: 'multi', label: 'Q1 — Motif de non-abonnement',
    question: 'Si non, pourquoi ?',
    choices: ["Manque d'intérêt pour les domaines abordés", 'Veille effectuée à mon niveau / mon entité',
      "Manque d'information sur l'existence de la lettre", 'Manque de temps', 'Autre'] },
  { colId: 'Q_1_3', kind: 'text', label: 'Q1 — Autre (préciser)', question: 'Autre :' },
  { colId: 'Q_2_1', kind: 'single', label: 'Q2 — Lecture',
    question: "Lisez-vous la lettre d'information juridique ?",
    choices: ['Oui, en intégralité', 'Oui, uniquement les thématiques qui m’intéressent',
      "Non, je n'ai pas le temps", 'Non, le format ne me convient pas', 'Non, le contenu ne me convient pas'] },
  { colId: 'Q_2_2', kind: 'text', label: 'Q2 — Commentaire', question: 'Commentaire (facultatif)' },
  { colId: 'Q_3_1', kind: 'multi', label: 'Q3 — Format',
    question: "Que pensez-vous du format de la lettre ?",
    choices: ["J'accède facilement à Docs", "Je n'accède pas facilement à Docs",
      'La présentation est claire', 'La lettre est trop courte', 'La lettre est trop longue',
      'Le format synthétique répond à mes attentes'] },
  { colId: 'Q_3_2', kind: 'text', label: 'Q3 — Commentaire', question: 'Commentaire (facultatif)' },
  { colId: 'Q_4_1', kind: 'multi', label: 'Q4 — Contenu',
    question: 'Que pensez-vous du contenu de la lettre ?',
    choices: ['Sujets conformes à mes attentes', 'Sujets peu intéressants',
      'Présentation trop longue', 'Présentation trop courte',
      'Analyse des impacts pertinente', 'Analyse peu utile',
      'A permis des échanges avec collègues / direction', 'Contenu complexe, besoin d’échanger avec la DAJ'] },
  { colId: 'Q_4_2', kind: 'text', label: 'Q4 — Commentaire', question: 'Commentaire (facultatif)' },
  { colId: 'Q_5_1', kind: 'scale', label: 'Q5 — Satisfaction (1 à 5)',
    question: 'Niveau de satisfaction (1 = mauvais, 5 = excellent)',
    choices: ['1', '2', '3', '4', '5'] },
  { colId: 'Q_5_2', kind: 'text', label: 'Q5 — Commentaire', question: 'Commentaire (facultatif)' },
  { colId: 'Q_6', kind: 'single', label: 'Q6 — Rattachement',
    question: 'Vous êtes rattaché à ?',
    choices: ['Institut Agro Dijon', 'Institut Agro Rennes-Angers', 'Institut Agro Montpellier',
      'Institut Agro (direction générale)', 'Eduter', 'Fondation'] },
  { colId: 'Q_7', kind: 'multi', label: 'Q7 — Domaine d’activité',
    question: "Domaine d'activité (plusieurs réponses possibles)",
    choices: ['Enseignement', 'Enseignement et recherche', 'Scolarité et vie étudiante',
      'Appui à l’enseignement technique agricole', 'Support (RH, finances, patrimoine…)',
      'Appui à l’enseignement et à la recherche', 'Communication, partenariats, expertise'] },
  { colId: 'Q_8', kind: 'text', label: "Q8 — Suggestions", question: "Suggestions d'amélioration ?" },
  { colId: 'Q_9', kind: 'text', label: 'Q9 — Dernier mot', question: 'Un dernier mot ?' },
  { colId: 'Q_10_1', kind: 'single', label: 'Q10 — Fréquence',
    question: 'La fréquence de réception vous convient-elle ?', choices: ['Oui', 'Non'] },
  { colId: 'Q_10_2', kind: 'text', label: 'Q10 — Pourquoi ?', question: 'Si non, pourquoi ?' }
];
/* ---------------- etat ---------------- */
var state = {
  source: 'none',        // 'grist' | 'demo' | 'csv'
  records: [],           // lignes brutes (objets {colId: valeur})
  catalog: [],           // meta par colonne {colId,label,question,kind,choices,view}
  filters: {},           // colId -> valeur ('' = toutes)
  search: {},            // colId -> texte (verbatim)
  charts: {},            // colId -> instance Chart
  crossChart: null,      // instance Chart du croisement
  cross: { x: null, y: null, mode: 'rowpct' },  // croisement : regrouper par X, analyser Y
  synthTerms: null, synthBase: 0,
  tab: 'synthese',   // onglet actif : synthese | questions | croisement | verbatim
  qSel: null,        // question affichée dans l'onglet Questions
  vSel: null, vSearch: '',  // explorateur verbatim
  title: 'Enquête — résultats',
  gristSeen: false
};

/* ---------------- utilitaires ---------------- */
function $(id) { return document.getElementById(id); }
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function trunc(s, n) {
  s = String(s == null ? '' : s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
function fmtPct(x) { return (Math.round(x * 10) / 10).toString().replace('.', ',') + ' %'; }
function slug(s) {
  return String(s || 'export').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'export';
}
function download(blob, filename) {
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
}
function mulberry32(seed) {
  var t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    var z = Math.imul(t ^ (t >>> 15), t | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
function pickWeighted(rng, entries) {
  var total = 0, i;
  for (i = 0; i < entries.length; i++) total += entries[i][1];
  var r = rng() * total;
  for (i = 0; i < entries.length; i++) { r -= entries[i][1]; if (r <= 0) return entries[i][0]; }
  return entries[entries.length - 1][0];
}
function setStatus(msg, show) {
  var el = $('statusLine');
  if (!msg || show === false) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false; el.textContent = msg;
}

/* Normalisation des valeurs Grist : Choice -> string, ChoiceList -> array. */
function asList(v) {
  if (v === null || v === undefined) return [];
  if (Array.isArray(v)) {
    // Cas ref Grist ["L", ...] : on ne garde que les chaines utiles.
    var arr = (v.length && v[0] === 'L') ? v.slice(1) : v;
    return arr.map(function (x) {
      if (x && typeof x === 'object') return String(x.value != null ? x.value : '').trim();
      return String(x == null ? '' : x).trim();
    }).filter(function (x) { return x !== ''; });
  }
  if (typeof v === 'object') {
    if (v.value !== undefined) return asList(v.value);
    return [];
  }
  var s = String(v).trim();
  return s === '' ? [] : [s];
}
function isEmpty(v) { return asList(v).length === 0; }
function scalarOf(v) { var l = asList(v); return l.length ? l[0] : ''; }

/* ---------------- donnees DEMO ---------------- */
var DEMO_TEXTS = {
  info: ['Je ne savais pas que ça existait, merci pour le rappel.',
    'Trop de mails, je passe à côté.', 'Je la lis via une collègue qui me la transfère.',
    'Pas le temps en période de rentrée.', 'Sujets parfois éloignés de mon quotidien.'],
  format: ['Le format court me convient bien.', 'Dommage, je ne retrouve pas les anciens numéros.',
    'La mise en page est claire.', 'Un peu long sur mobile.', 'Docs pas toujours accessible depuis mon poste.'],
  contenu: ['Les recommandations pratiques sont très utiles.', 'J’aimerais plus de cas concrets.',
    'L’analyse d’impact m’a aidée à ajuster nos conventions.', 'Certains sujets sont trop juridiques pour moi.',
    'Bon équilibre entre actualité et conseils.'],
  sat: ['Bonne lettre dans l’ensemble.', 'RAS.', 'Continuez comme ça.', 'Peut mieux faire sur la longueur.'],
  sugg: ['Un index des anciens numéros serait utile.', 'Proposer une version 2 minutes / 10 minutes.',
    'Ajouter un rappel des échéances du mois.', 'Une rubrique questions-réponses avec la DAJ.',
    'Rien à signaler, format adapté.'],
  last: ['Merci pour ce travail de veille !', 'Bonne continuation.', 'Hâte de lire le prochain numéro.', ''],
  freq: ['Une fois par mois suffirait.', ' Trop fréquent en période chargée.', 'Je préfèrerais tous les deux mois.']
};
function genDemoRecords(n, seed) {
  var rng = mulberry32(seed || 20260206);
  var out = [];
  function maybeText(pool, p) {
    if (rng() > p) return '';
    return pool[Math.floor(rng() * pool.length)];
  }
  function multiSample(choices, probs, max) {
    var res = [];
    for (var i = 0; i < choices.length; i++) {
      if (rng() < probs[i]) res.push(choices[i]);
    }
    if (!res.length && rng() < 0.85) res.push(choices[Math.floor(rng() * choices.length)]);
    return res.slice(0, max || 3);
  }
  for (var k = 0; k < (n || 140); k++) {
    var abo = pickWeighted(rng, [['Oui', 0.62], ['Non', 0.38]]);
    var motif = [];
    if (abo === 'Non') {
      motif = multiSample(DEMO_SCHEMA[1].choices, [0.3, 0.35, 0.3, 0.4, 0.15], 2);
    }
    var autre = (motif.indexOf('Autre') >= 0 && rng() < 0.7) ? 'Précision : je suis à temps partiel.' : '';
    var lecture = abo === 'Oui'
      ? pickWeighted(rng, [['Oui, en intégralité', 0.34], ['Oui, uniquement les thématiques qui m’intéressent', 0.4],
        ["Non, je n'ai pas le temps", 0.12], ['Non, le format ne me convient pas', 0.06], ['Non, le contenu ne me convient pas', 0.08]])
      : pickWeighted(rng, [['Oui, en intégralité', 0.05], ['Oui, uniquement les thématiques qui m’intéressent', 0.2],
        ["Non, je n'ai pas le temps", 0.35], ['Non, le format ne me convient pas', 0.15], ['Non, le contenu ne me convient pas', 0.25]]);
    var fmt = multiSample(DEMO_SCHEMA[5].choices, [0.55, 0.12, 0.5, 0.08, 0.22, 0.45], 3);
    var cont = multiSample(DEMO_SCHEMA[7].choices, [0.5, 0.12, 0.18, 0.14, 0.42, 0.1, 0.25, 0.12], 3);
    var sat = pickWeighted(rng, [['1', 0.05], ['2', 0.1], ['3', 0.28], ['4', 0.37], ['5', 0.2]]);
    var ent = pickWeighted(rng, [['Institut Agro Dijon', 0.3], ['Institut Agro Rennes-Angers', 0.24],
      ['Institut Agro Montpellier', 0.2], ['Institut Agro (direction générale)', 0.1], ['Eduter', 0.1], ['Fondation', 0.06]]);
    var dom = multiSample(DEMO_SCHEMA[12].choices, [0.25, 0.3, 0.18, 0.15, 0.3, 0.2, 0.18], 2);
    var freq = pickWeighted(rng, [['Oui', 0.72], ['Non', 0.28]]);
    out.push({
      id: k + 1,
      Q_1_1: abo, Q_1_2: motif, Q_1_3: autre,
      Q_2_1: lecture, Q_2_2: maybeText(DEMO_TEXTS.info, 0.3),
      Q_3_1: fmt, Q_3_2: maybeText(DEMO_TEXTS.format, 0.3),
      Q_4_1: cont, Q_4_2: maybeText(DEMO_TEXTS.contenu, 0.32),
      Q_5_1: sat, Q_5_2: maybeText(DEMO_TEXTS.sat, 0.28),
      Q_6: ent, Q_7: dom,
      Q_8: maybeText(DEMO_TEXTS.sugg, 0.55),
      Q_9: maybeText(DEMO_TEXTS.last, 0.4),
      Q_10_1: freq, Q_10_2: freq === 'Non' ? maybeText(DEMO_TEXTS.freq, 0.8) : ''
    });
  }
  return out;
}

/* Inférence du type d'analyse d'une colonne — aucune connaissance métier :
 * - métadonnées Grist (Choice/ChoiceList/Text) si disponibles ;
 * - sinon : tableaux -> multi ; entiers 0..10 (au moins 3 modalités) -> échelle ;
 *   peu de valeurs distinctes et courtes -> choix unique ; sinon texte libre. */
function isSmallIntScale(strs) {
  var ints = [], seen = {};
  for (var i = 0; i < strs.length; i++) {
    var s = String(strs[i]).trim().replace(',', '.');
    if (!/^\d{1,2}$/.test(s)) return null;
    var v = parseInt(s, 10);
    if (v < 0 || v > 10) return null;
    ints.push(v); seen[v] = 1;
  }
  var distinct = Object.keys(seen).length;
  if (distinct < 3 || distinct > 11) return null;
  return true;
}
function detectKind(values, meta) {
  if (meta && meta.type === 'ChoiceList') return 'multi';
  if (meta && meta.type === 'Choice') {
    var ch = meta.choices || [];
    if (ch.length >= 3 && isSmallIntScale(ch)) return 'scale';
    return 'single';
  }
  if (meta && meta.type === 'Text') return 'text';
  var nonEmpty = values.filter(function (v) { return !isEmpty(v); });
  if (!nonEmpty.length) return 'ignore';
  var anyList = nonEmpty.some(function (v) { return Array.isArray(v) && asList(v).length > 1; });
  if (anyList) return 'multi';
  var distinct = {};
  var totalLen = 0, nTxt = 0;
  var scalars = [];
  nonEmpty.forEach(function (v) {
    var s = scalarOf(v);
    distinct[s] = 1; totalLen += s.length; nTxt++;
    scalars.push(s);
  });
  var nd = Object.keys(distinct).length;
  if (isSmallIntScale(scalars)) return 'scale';
  if (nd <= 15 && (totalLen / Math.max(1, nTxt)) < 60) return 'single';
  return 'text';
}

function buildCatalog(records, metaMap, colOrder) {
  var colIds = [];
  var seen = {};
  records.forEach(function (r) {
    Object.keys(r).forEach(function (k) {
      if (SYSTEM_COLS[k] || k.indexOf('gristHelper_') === 0) return;
      if (!seen[k]) { seen[k] = 1; colIds.push(k); }
    });
  });
  // Ordre stable : ordre fourni (démo) ou alphabétique (données réelles).
  var order = null;
  if (colOrder && colOrder.length) {
    order = {};
    colOrder.forEach(function (id, i) { order[id] = i; });
  }
  colIds.sort(function (a, b) {
    if (order) {
      var ia = order[a] !== undefined ? order[a] : 1e9;
      var ib = order[b] !== undefined ? order[b] : 1e9;
      if (ia !== ib) return ia - ib;
    }
    return a < b ? -1 : (a > b ? 1 : 0);
  });
  function numericSort(list) {
    if (list.every(function (c) { return /^-?\d+$/.test(String(c).trim()); })) {
      return list.slice().sort(function (x, y) { return parseInt(x, 10) - parseInt(y, 10); });
    }
    return list;
  }
  return colIds.map(function (colId) {
    var values = records.map(function (r) { return r[colId]; });
    var meta = (metaMap && metaMap[colId]) || null;
    var kind = detectKind(values, meta);
    var label = (meta && meta.label) || colId;
    var question = (meta && meta.question) || '';
    var choices = null;
    if (meta && meta.choices && meta.choices.length) choices = meta.choices.slice();
    if (!choices && (kind === 'single' || kind === 'multi' || kind === 'scale')) {
      var counts = {};
      values.forEach(function (v) {
        asList(v).forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
      });
      choices = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 20);
    }
    if (kind === 'scale' && choices) choices = numericSort(choices);
    return { colId: colId, label: label, question: question, kind: kind, choices: choices || [], view: 'auto' };
  });
}

/* ---------------- filtrage ---------------- */
function filterableCols() {
  return state.catalog.filter(function (c) {
    return (c.kind === 'single' || c.kind === 'scale' || c.kind === 'multi') && c.choices.length <= 15;
  });
}
function getFiltered() {
  var active = Object.keys(state.filters).filter(function (k) { return state.filters[k]; });
  if (!active.length) return state.records.slice();
  var byId = {};
  state.catalog.forEach(function (c) { byId[c.colId] = c; });
  return state.records.filter(function (r) {
    for (var i = 0; i < active.length; i++) {
      var colId = active[i], want = state.filters[colId];
      var col = byId[colId];
      if (!col) continue;
      if (col.kind === 'multi') {
        if (asList(r[colId]).indexOf(want) < 0) return false;
      } else if (scalarOf(r[colId]) !== want) return false;
    }
    return true;
  });
}

/* ---------------- KPIs (génériques : aucune question nommée) ---------------- */
function computeKpis(rows) {
  var total = state.records.length;
  var n = rows.length;
  var analysables = state.catalog.filter(function (c) { return c.kind !== 'ignore'; });
  var filled = 0, cells = 0;
  rows.forEach(function (r) {
    analysables.forEach(function (c) { cells++; if (!isEmpty(r[c.colId])) filled++; });
  });
  var out = [
    { v: String(n), l: total === n ? 'réponses' : 'réponses affichées / ' + total },
    { v: cells ? fmtPct(100 * filled / cells) : '—', l: 'taux de complétion' }
  ];
  // Première échelle numérique -> moyenne (min–max observés dans les choix).
  var sc = null, i;
  for (i = 0; i < state.catalog.length; i++) {
    if (state.catalog[i].kind === 'scale') { sc = state.catalog[i]; break; }
  }
  if (sc) {
    var sum = 0, cnt = 0;
    rows.forEach(function (r) {
      var x = parseFloat(String(scalarOf(r[sc.colId])).replace(',', '.'));
      if (!isNaN(x)) { sum += x; cnt++; }
    });
    var nums = sc.choices.map(function (c) { return parseInt(c, 10); })
      .filter(function (x) { return !isNaN(x); });
    var mx = nums.length ? Math.max.apply(null, nums) : null;
    out.push({ v: cnt ? (Math.round((sum / cnt) * 10) / 10).toString().replace('.', ',') +
      (mx !== null ? ' / ' + mx : '') : '—',
      l: 'moyenne — ' + trunc(sc.question ? sc.label + ' — ' + sc.question : sc.label, 44) });
  }
  // Première question binaire -> part de la modalité majoritaire.
  var bin = null;
  for (i = 0; i < state.catalog.length; i++) {
    var c = state.catalog[i];
    if (c.kind === 'single' && c.choices.length === 2) { bin = c; break; }
  }
  if (bin) {
    var counts = {};
    rows.forEach(function (r) {
      var s = scalarOf(r[bin.colId]);
      if (s) counts[s] = (counts[s] || 0) + 1;
    });
    var best = null, bestN = 0, ans = 0;
    Object.keys(counts).forEach(function (k) {
      ans += counts[k];
      if (counts[k] > bestN) { bestN = counts[k]; best = k; }
    });
    out.push({ v: ans ? fmtPct(100 * bestN / ans) : '—',
      l: trunc(bin.label, 36) + (best ? ' : ' + trunc(best, 20) : '') });
  }
  return out;
}

/* ---------------- graphiques ---------------- */
function destroyCharts() {
  Object.keys(state.charts).forEach(function (k) {
    try { state.charts[k].destroy(); } catch (e) { /* noop */ }
  });
  state.charts = {};
}
function chartColor(i, alpha) {
  var hex = PALETTE[i % PALETTE.length];
  if (alpha == null) return hex;
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
function baseOptions() {
  return {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: {} } }
  };
}
function drawBarH(canvas, labels, counts, base) {
  if (!window.Chart) return;
  var data = {
    labels: labels.map(function (l) { return trunc(l, 30); }),
    datasets: [{ data: counts, backgroundColor: labels.map(function (_, i) { return chartColor(i, 0.85); }) }]
  };
  var opts = baseOptions();
  opts.indexAxis = 'y';
  opts.scales = { x: { beginAtZero: true, ticks: { precision: 0 } } };
  opts.plugins.tooltip.callbacks.label = function (ctx) {
    var i = ctx.dataIndex, p = base ? 100 * counts[i] / base : 0;
    return ' ' + counts[i] + '  (' + fmtPct(p) + ')';
  };
  state.charts[canvas.dataset.col] = new window.Chart(canvas, { type: 'bar', data: data, options: opts });
}
function drawDonut(canvas, labels, counts) {
  if (!window.Chart) return;
  var total = counts.reduce(function (a, b) { return a + b; }, 0) || 1;
  var opts = baseOptions();
  opts.plugins.legend = { display: true, position: 'bottom' };
  opts.plugins.tooltip.callbacks.label = function (ctx) {
    return ' ' + ctx.parsed + '  (' + fmtPct(100 * ctx.parsed / total) + ')';
  };
  state.charts[canvas.dataset.col] = new window.Chart(canvas, {
    type: 'doughnut',
    data: { labels: labels, datasets: [{ data: counts, backgroundColor: labels.map(function (_, i) { return chartColor(i, 0.9); }) }] },
    options: opts
  });
}
function drawScale(canvas, labels, counts) {
  if (!window.Chart) return;
  var opts = baseOptions();
  opts.scales = { y: { beginAtZero: true, ticks: { precision: 0 } } };
  var max = 0, mi = 0;
  counts.forEach(function (c, i) { if (c > max) { max = c; mi = i; } });
  state.charts[canvas.dataset.col] = new window.Chart(canvas, {
    type: 'bar',
    data: { labels: labels, datasets: [{ data: counts,
      backgroundColor: labels.map(function (_, i) { return chartColor(i, i === mi ? 1 : 0.55); }) }] },
    options: opts
  });
}

/* ---------------- croisements (tri croise X x Y, 100 % local) ---------------- */
function crossXCandidates() {
  return state.catalog.filter(function (c) {
    return (c.kind === 'single' || c.kind === 'scale') && c.choices.length >= 2 && c.choices.length <= 12;
  });
}
function crossYCandidates() {
  return state.catalog.filter(function (c) {
    return (c.kind === 'single' || c.kind === 'multi' || c.kind === 'scale') &&
      c.choices.length >= 2 && c.choices.length <= 12;
  });
}
function defaultCross() {
  var xs = crossXCandidates(), ys = crossYCandidates();
  if (!xs.length || !ys.length) return { x: null, y: null };
  function scoreX(c) {
    var t = ((c.label || '') + ' ' + (c.question || '')).toLowerCase();
    var s = 0;
    if (/rattach|entit|structure|site|service|direction|établissement|affiliat|team|department|region|segment|profile/.test(t)) s += 3;
    if (c.choices.length >= 3 && c.choices.length <= 8) s += 1;
    return s;
  }
  var bx = xs.slice().sort(function (a, b) { return scoreX(b) - scoreX(a); })[0];
  var by = ys.filter(function (c) { return c.colId !== bx.colId && c.kind === 'scale'; })[0] ||
    ys.filter(function (c) { return c.colId !== bx.colId; })[0] || null;
  return { x: bx.colId, y: by ? by.colId : null };
}

// gamma incomplète régularisée P(a,x) (Numerical Recipes) -> p-value du χ².
function gammaP(a, x) {
  if (a <= 0 || x < 0) return NaN;
  if (x === 0) return 0;
  var i, EPS = 1e-12, FPMIN = 1e-300;
  if (x < a + 1) {
    var ap = a, sum = 1 / a, del = sum;
    for (i = 0; i < 200; i++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * EPS) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  var b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
  for (i = 1; i <= 200; i++) {
    var an = -i * (i - a);
    b += 2; d = an * d + b;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = b + an / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    var del2 = d * c;
    h *= del2;
    if (Math.abs(del2 - 1) < EPS) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
}
function lgamma(x) {
  // Lanczos (g=7).
  var c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1;
  var a = c[0], i;
  for (i = 1; i < 9; i++) a += c[i] / (x + i);
  var t = x + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function computeCross(rows, cx, cy) {
  var xCats = cx.choices.slice(), yCats = cy.choices.slice();
  var mat = {}, baseX = {}, totY = {};
  xCats.forEach(function (x) { mat[x] = {}; baseX[x] = 0; });
  yCats.forEach(function (y) { totY[y] = 0; });
  var n = 0;
  rows.forEach(function (r) {
    var xv = scalarOf(r[cx.colId]);
    if (!xv || baseX[xv] === undefined) return;
    if (cy.kind === 'multi') {
      var l = asList(r[cy.colId]);
      if (!l.length) return;
      baseX[xv]++; n++;
      l.forEach(function (s) {
        if (mat[xv][s] === undefined) {
          mat[xv][s] = 0;
          if (yCats.indexOf(s) < 0) { yCats.push(s); totY[s] = 0; }
        }
        mat[xv][s]++; totY[s]++;
      });
    } else {
      var yv = scalarOf(r[cy.colId]);
      if (!yv) return;
      if (mat[xv][yv] === undefined) {
        mat[xv][yv] = 0;
        if (yCats.indexOf(yv) < 0) { yCats.push(yv); totY[yv] = 0; }
      }
      mat[xv][yv]++; baseX[xv]++; totY[yv]++; n++;
    }
  });
  // Normalisation : lignes X à base nulle evincees (filtres).
  xCats = xCats.filter(function (x) { return baseX[x] > 0; });
  var stat = null;
  if (cy.kind !== 'multi' && xCats.length >= 2 && yCats.length >= 2 && n > 0) {
    var chi2 = 0, small = 0, cells = 0;
    xCats.forEach(function (x) {
      yCats.forEach(function (y) {
        var o = mat[x][y] || 0;
        var e = baseX[x] * (totY[y] || 0) / n;
        cells++;
        if (e > 0) {
          chi2 += (o - e) * (o - e) / e;
          if (e < 5) small++;
        }
      });
    });
    var df = (xCats.length - 1) * (yCats.length - 1);
    var p = 1 - gammaP(df / 2, chi2 / 2);
    stat = { chi2: chi2, df: df, p: p, small: small, cells: cells };
  }
  return { xCats: xCats, yCats: yCats, mat: mat, baseX: baseX, totY: totY, n: n, stat: stat };
}

function renderCross(rows) {
  var xs = crossXCandidates(), ys = crossYCandidates();
  var selX = $('crossX'), selY = $('crossY'), selM = $('crossMode');
  var tableBox = $('crossTable'), note = $('crossNote'), statEl = $('crossStat');
  if (state.crossChart) { try { state.crossChart.destroy(); } catch (e) { /* noop */ } state.crossChart = null; }
  if (!xs.length || !ys.length) {
    $('crossSection').hidden = true;
    return;
  }
  $('crossSection').hidden = false;
  if (!state.cross.x || !xs.some(function (c) { return c.colId === state.cross.x; })) {
    var d = defaultCross();
    state.cross.x = d.x; state.cross.y = d.y;
  }
  if (!state.cross.y || !ys.some(function (c) { return c.colId === state.cross.y; })) {
    var d2 = defaultCross();
    if (!state.cross.x) state.cross.x = d2.x;
    state.cross.y = (d2.y && d2.y !== state.cross.x) ? d2.y :
      (ys.filter(function (c) { return c.colId !== state.cross.x; })[0] || {}).colId || null;
  }
  function fill(sel, list) {
    sel.innerHTML = '';
    list.forEach(function (c) {
      var o = document.createElement('option');
      o.value = c.colId;
      o.textContent = trunc(c.question ? c.label + ' — ' + c.question : c.label, 70);
      sel.appendChild(o);
    });
  }
  fill(selX, xs); fill(selY, ys);
  selX.value = state.cross.x; selY.value = state.cross.y || ''; selM.value = state.cross.mode;
  if (!state.cross.y) { tableBox.innerHTML = ''; note.textContent = ''; statEl.textContent = ''; return; }
  var cx = null, cy = null;
  state.catalog.forEach(function (c) {
    if (c.colId === state.cross.x) cx = c;
    if (c.colId === state.cross.y) cy = c;
  });
  if (!cx || !cy || cx.colId === cy.colId) {
    tableBox.innerHTML = '<p class="empty">Choisissez deux questions différentes.</p>';
    note.textContent = ''; statEl.textContent = '';
    return;
  }
  var res = computeCross(rows, cx, cy);
  state.crossCache = { cx: cx, cy: cy, res: res };
  var pctMode = state.cross.mode === 'rowpct';
  note.textContent = res.n + ' réponse(s) croisée(s)' +
    (cy.kind === 'multi' ? ' — % par modalité, plusieurs réponses possibles' : '');
  // Graphique : barres groupees (datasets = modalites Y).
  var cv = $('crossCanvas');
  if (window.Chart) {
    var horiz = res.xCats.length > 5;
    var datasets = res.yCats.map(function (y, i) {
      return {
        label: trunc(y, 30),
        data: res.xCats.map(function (x) {
          var v = (res.mat[x] && res.mat[x][y]) || 0;
          return pctMode ? (res.baseX[x] ? Math.round(1000 * v / res.baseX[x]) / 10 : 0) : v;
        }),
        backgroundColor: chartColor(i, 0.85)
      };
    });
    var opts = baseOptions();
    opts.plugins.legend = { display: true, position: 'bottom' };
    opts.plugins.tooltip.callbacks.label = function (ctx) {
      var val = horiz ? ctx.parsed.x : ctx.parsed.y;
      return ' ' + ctx.dataset.label + ' : ' + val + (pctMode ? ' %' : '');
    };
    if (horiz) {
      opts.indexAxis = 'y';
      opts.scales = { x: { beginAtZero: true, max: pctMode ? 100 : undefined, ticks: { callback: function (v) { return pctMode ? v + ' %' : v; } } } };
    } else {
      opts.scales = { y: { beginAtZero: true, max: pctMode ? 100 : undefined, ticks: { precision: 0, callback: function (v) { return pctMode ? v + ' %' : v; } } } };
    }
    cv.style.height = Math.max(240, res.xCats.length * (horiz ? 44 : 0) + (horiz ? 60 : 0)) + 'px';
    state.crossChart = new window.Chart(cv, { type: 'bar', data: { labels: res.xCats.map(function (x) { return trunc(x, 34); }), datasets: datasets }, options: opts });
  }
  // Tableau de contingence.
  var html = '<table class="data"><tr><th>' + esc(trunc(cx.label, 30)) + ' \\ ' +
    esc(trunc(cy.label, 30)) + '</th>';
  res.yCats.forEach(function (y) { html += '<th class="n">' + esc(trunc(y, 28)) + '</th>'; });
  html += '<th class="n">Base</th></tr>';
  res.xCats.forEach(function (x) {
    html += '<tr><td>' + esc(x) + '</td>';
    res.yCats.forEach(function (y) {
      var v = (res.mat[x] && res.mat[x][y]) || 0;
      var cell = pctMode
        ? fmtPct(res.baseX[x] ? 100 * v / res.baseX[x] : 0)
        : String(v);
      html += '<td class="n">' + (pctMode ? cell : cell) + '</td>';
    });
    html += '<td class="n">' + res.baseX[x] + '</td></tr>';
  });
  html += '<tr><td><strong>Total</strong></td>';
  res.yCats.forEach(function (y) { html += '<td class="n"><strong>' + (res.totY[y] || 0) + '</strong></td>'; });
  html += '<td class="n"><strong>' + res.n + '</strong></td></tr></table>';
  tableBox.innerHTML = html;
  // Statistique.
  if (res.stat) {
    var s = res.stat;
    var fr = function (v) { return String(Math.round(v * 100) / 100).replace('.', ','); };
    var fp = s.p < 0.001 ? '< 0,001'
      : String(Math.round(s.p * (s.p < 0.01 ? 1000 : 100)) / (s.p < 0.01 ? 1000 : 100)).replace('.', ',');
    var verdict = (s.p >= 0 && s.p < 0.05)
      ? 'liaison statistiquement significative au seuil de 5 %.'
      : 'pas de liaison significative au seuil de 5 %.';
    statEl.textContent = 'χ² = ' + fr(s.chi2) + ' (ddl = ' + s.df + ') · p = ' + fp + ' — ' + verdict +
      (s.small ? ' ⚠ ' + s.small + ' case(s) sur ' + s.cells + ' avec effectif théorique < 5 : test indicatif.' : '');
  } else if (cy.kind === 'multi') {
    statEl.textContent = 'Question à choix multiples : pas de test du χ² (les % par modalité peuvent dépasser 100 %).';
  } else {
    statEl.textContent = '';
  }
}

function exportCrossCsv() {
  var cc = state.crossCache;
  if (!cc) { alert('Aucun croisement à exporter.'); return; }
  var sep = ';';
  var pctMode = state.cross.mode === 'rowpct';
  var lines = [[cc.cx.label + ' \\ ' + cc.cy.label].concat(cc.res.yCats, ['Base']).map(function (x) { return csvEsc(x, sep); }).join(sep)];
  cc.res.xCats.forEach(function (x) {
    var row = [csvEsc(x, sep)];
    cc.res.yCats.forEach(function (y) {
      var v = (cc.res.mat[x] && cc.res.mat[x][y]) || 0;
      row.push(pctMode
        ? String(Math.round(1000 * v / Math.max(1, cc.res.baseX[x])) / 10).replace('.', ',')
        : String(v));
    });
    row.push(String(cc.res.baseX[x]));
    lines.push(row.join(sep));
  });
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    slug(state.title) + '-croisement.csv');
}

/* ---------------- analyse textuelle (sans IA, 100 % local) ---------------- */
var STOPLIST = 'avec,chez,entre,vers,pendant,contre,moins,ainsi,alors,aussi,autant,autre,autres,autrui,aucun,aucune,avez,avoir,beaucoup,bien,ceci,cela,celle,celles,celui,ceux,chacun,chacune,chaque,comme,comment,davantage,doit,doivent,donc,dont,elle,meme,mêmes,merci,mesdames,messieurs,moins,moyennant,notamment,nôtre,nôtres,nonobstant,oui,parce,parfois,parmi,plupart,pourquoi,puisque,quand,quant,quel,quelle,quelles,quels,rien,sauf,selon,sienne,siennes,siens,sienne,siennes,souvent,surtout,tandis,toujours,toute,toutes,tous,très,trop,voici,voilà,vôtre,vôtres,cela,ça,est,sont,était,étaient,être,été,être,faire,fait,font,fois,plus,peut,peuvent,pouvoir,faut,falloir,celui,ceux,quiconque,quoi,quelque,quelques,certains,certaines,plusieurs,aucuns,chaque,deux,trois,premier,première,grand,grande,petit,petite,jeune,jeunes,vieux,vieille,nouveau,nouvelle,bon,bonne,mauvais,mauvaise,long,longue,court,courte,petit,haut,haute,fort,forte,cher,chère,propre,propres,seul,seule,pareil,pareille,tel,telle,tels,telles,certain,certaine,divers,diverse,quelconque,différent,différente,prochain,prochaine,dernier,dernière,sein,lieu,façon,manière,part,parts,côté,point,points,titre,niveau,ordre,avis,sens,cadre,terme,termes,exemple,exemples,raison,raisons,mesure,mesures,endroit,fois,moment,instants';
var STOP = {};
STOPLIST.split(',').forEach(function (w) { STOP[w] = 1; });
// Mots-outils courts couverts par le filtre longueur < 3 + cas fréquents.
['ne', 'se', 'te', 'me', 'le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'ou', 'où', 'en', 'y', 'a', 'ai',
 'as', 'ont', 'suis', 'sommes', 'êtes', 'sont', 'étais', 'était', 'serai', 'sera', 'ai', 'as', 'avons', 'avez',
 'avais', 'avait', 'aurai', 'aura', 'eu', 'eue', 'ayant', 'étant', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
 'son', 'sa', 'ses', 'notre', 'votre', 'leur', 'leurs', 'ce', 'cet', 'cette', 'ces', 'mon', 'ton', 'son',
 'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'on', 'lui', 'eux', 'moi', 'toi', 'soi',
 'celui', 'celle', 'ceci', 'cela', 'ça', 'quoi', 'dont', 'où', 'que', 'qui', 'quoi', 'dont',
 'dans', 'par', 'pour', 'sur', 'sous', 'sans', 'avec', 'entre', 'vers', 'chez', 'contre', 'pendant',
 'comme', 'mais', 'donc', 'car', 'ni', 'si', 'aussi', 'plus', 'moins', 'très', 'trop', 'peu', 'assez',
 'bien', 'mal', 'mieux', 'pis', 'tant', 'tellement', 'ainsi', 'alors', 'après', 'avant', 'depuis',
 'déjà', 'encore', 'jamais', 'toujours', 'souvent', 'parfois', 'quelquefois', 'ici', 'là', 'ailleurs',
 'partout', 'dedans', 'dehors', 'dessus', 'dessous', 'devant', 'derrière', 'oui', 'non', 'merci', 'bonjour',
 'faire', 'fait', 'font', 'être', 'avoir', 'falloir', 'pouvoir', 'vouloir', 'devoir', 'aller', 'venir',
 'pas', 'tout', 'peut', 'peuvent', 'dois', 'doivent', 'fais', 'vais', 'dit', 'disent'
].forEach(function (w) { STOP[w] = 1; });

function tokenize(text) {
  var t = String(text || '').toLowerCase().replace(/[’‘]/g, "'");
  var parts = t.split(/[^a-zàâäéèêëîïôöùûüçœæ]+/);
  var out = [];
  for (var i = 0; i < parts.length; i++) {
    var w = parts[i];
    if (!w || w.length < 3 || /\d/.test(w)) continue;
    var key;
    try { key = w.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    catch (e) { key = w; }
    if (STOP[key]) continue;
    out.push({ key: key, disp: w });
  }
  return out;
}

// Compte les termes sur les lignes filtrees : occurrences + nb de reponses
// distinctes les contenant. Retour {terms, base} trie par nb de reponses.
function analyzeTerms(rows, textCols) {
  var freq = {}, dispVotes = {}, inResp = {};
  var base = 0;
  rows.forEach(function (r) {
    var seen = {}, any = false;
    textCols.forEach(function (c) {
      asList(r[c.colId]).forEach(function (s) {
        tokenize(s).forEach(function (tk) {
          any = true;
          freq[tk.key] = (freq[tk.key] || 0) + 1;
          var dk = tk.key + '' + tk.disp;
          dispVotes[dk] = (dispVotes[dk] || 0) + 1;
          seen[tk.key] = tk.disp;
        });
      });
    });
    if (any) base++;
    Object.keys(seen).forEach(function (k) { inResp[k] = (inResp[k] || 0) + 1; });
  });
  var best = {};
  Object.keys(dispVotes).forEach(function (dk) {
    var p = dk.indexOf('');
    var k = dk.slice(0, p), d = dk.slice(p + 1);
    if (!best[k] || dispVotes[dk] > best[k].n) best[k] = { d: d, n: dispVotes[dk] };
  });
  var terms = Object.keys(freq).map(function (k) {
    return { key: k, disp: best[k] ? best[k].d : k, count: freq[k], resp: inResp[k] || 0 };
  });
  terms.forEach(function (t) { t.pct = base ? 100 * t.resp / base : 0; });
  terms.sort(function (a, b) { return b.resp - a.resp || b.count - a.count; });
  return { terms: terms, base: base };
}

/* Nuage de mots maison (canvas, zero dependance) : spirale d'Archimede,
 * collisions par boites englobantes, tailles en racine des frequences. */
function drawCloud(canvas, terms) {
  var dpr = window.devicePixelRatio || 1;
  var W = canvas.clientWidth || canvas.parentNode.clientWidth || 600;
  var H = parseInt(canvas.style.height, 10) || 260;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  var ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  var list = terms.slice(0, 70);
  if (!list.length) return false;
  var max = Math.max.apply(null, list.map(function (t) { return t.resp; }).concat([1]));
  var cx = W / 2, cy = H / 2, pad = 3;
  var placed = [];
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  function collides(x, y, w, h) {
    if (x - w / 2 < pad || x + w / 2 > W - pad || y - h / 2 < pad || y + h / 2 > H - pad) return true;
    for (var i = 0; i < placed.length; i++) {
      var p = placed[i];
      if (Math.abs(x - p.x) * 2 < (w + p.w) && Math.abs(y - p.y) * 2 < (h + p.h)) return true;
    }
    return false;
  }
  var drawn = 0;
  list.forEach(function (t, i) {
    var size = 12 + Math.round(30 * Math.sqrt(t.resp / max));
    ctx.font = '700 ' + size + 'px -apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    var w = ctx.measureText(t.disp).width + 6;
    var vert = (i % 7 === 6);
    var bw = vert ? size + 4 : w, bh = vert ? w : size + 4;
    var ok = false, px = cx, py = cy;
    for (var s = 0; s < 500 && !ok; s++) {
      var a = 0.32 * s;
      var r = 4 + 0.16 * s * (3 + size / 12);
      px = cx + r * Math.cos(a);
      py = cy + r * Math.sin(a) * 0.62;
      if (!collides(px, py, bw, bh)) ok = true;
    }
    if (!ok) return;
    placed.push({ x: px, y: py, w: bw, h: bh });
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.45 * (t.resp / max);
    ctx.fillStyle = PALETTE[i % PALETTE.length];
    ctx.translate(px, py);
    if (vert) ctx.rotate(-Math.PI / 2);
    ctx.fillText(t.disp, 0, 0);
    ctx.restore();
    drawn++;
  });
  return drawn > 0;
}

function exportTermsCsv() {
  var terms = state.synthTerms || [];
  var sep = ';';
  var lines = ['Mot' + sep + 'Occurrences' + sep + 'Réponses' + sep + '% réponses'];
  terms.slice(0, 100).forEach(function (t) {
    lines.push(csvEsc(t.disp, sep) + sep + t.count + sep + t.resp + sep +
      String(Math.round(t.pct * 10) / 10).replace('.', ','));
  });
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    slug(state.title) + '-mots-cles.csv');
}

/* ---------------- rendu ---------------- */
function countsFor(col, rows, answeredOnly) {
  var map = {};
  col.choices.forEach(function (c) { map[c] = 0; });
  var ans = 0;
  rows.forEach(function (r) {
    var l = asList(r[col.colId]);
    if (!l.length) return;
    ans++;
    l.forEach(function (s) {
      if (map[s] === undefined) { map[s] = 0; if (col.choices.indexOf(s) < 0) col.choices.push(s); }
      map[s]++;
    });
  });
  return { map: map, answered: ans };
}

function renderKpis(rows) {
  var kpis = computeKpis(rows);
  $('kpiRow').innerHTML = kpis.map(function (k) {
    return '<div class="kpi"><div class="v">' + esc(k.v) + '</div><div class="l">' + esc(k.l) + '</div></div>';
  }).join('');
}

function renderFilters() {
  var cols = filterableCols();
  var box = $('filterRow');
  if (!cols.length) { box.innerHTML = '<span class="empty">Aucun filtre disponible.</span>'; return; }
  box.innerHTML = '';
  cols.slice(0, 8).forEach(function (c) {
    var wrap = document.createElement('div');
    wrap.className = 'filter';
    var lab = document.createElement('label');
    lab.textContent = trunc(c.label, 40);
    var sel = document.createElement('select');
    sel.dataset.col = c.colId;
    var opt0 = document.createElement('option');
    opt0.value = ''; opt0.textContent = 'Toutes';
    sel.appendChild(opt0);
    c.choices.forEach(function (ch) {
      var o = document.createElement('option');
      o.value = ch; o.textContent = trunc(ch, 60);
      if (state.filters[c.colId] === ch) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () {
      state.filters[c.colId] = sel.value;
      renderAll();
    });
    wrap.appendChild(lab); wrap.appendChild(sel);
    box.appendChild(wrap);
  });
  var n = getFiltered().length;
  $('filterCount').textContent = n + ' / ' + state.records.length + ' réponses';
}

function kindLabel(kind) {
  return { single: 'choix unique', multi: 'choix multiples', scale: 'échelle 1–5', text: 'texte libre', ignore: 'ignoré' }[kind] || kind;
}

function renderSynthCard(box, rows) {
  var textCols = state.catalog.filter(function (c) { return c.kind === 'text'; });
  if (!textCols.length) return;
  var res = analyzeTerms(rows, textCols);
  state.synthTerms = res.terms;
  state.synthBase = res.base;
  var card = document.createElement('div');
  card.className = 'card wide';
  card.id = 'card-__synth';
  var head = document.createElement('div');
  head.className = 'card-head';
  var h = document.createElement('h3');
  h.textContent = 'Synthèse des réponses libres';
  var chip = document.createElement('span');
  chip.className = 'chip';
  chip.textContent = 'nuage de mots · sans IA';
  head.appendChild(h); head.appendChild(chip);
  card.appendChild(head);

  var tools = document.createElement('div');
  tools.className = 'card-tools';
  var csvB = document.createElement('button');
  csvB.textContent = 'CSV des mots-clés';
  csvB.addEventListener('click', exportTermsCsv);
  tools.appendChild(csvB);
  var pngB = document.createElement('button');
  pngB.textContent = 'PNG';
  pngB.addEventListener('click', function () {
    var cv = document.getElementById('synthCloud');
    if (cv) cv.toBlob(function (b) { if (b) download(b, slug(state.title) + '-nuage-mots.png'); }, 'image/png');
  });
  tools.appendChild(pngB);
  card.appendChild(tools);

  var nbMsg = 0;
  rows.forEach(function (r) {
    textCols.forEach(function (c) { nbMsg += asList(r[c.colId]).length; });
  });
  var sub = document.createElement('p');
  sub.className = 'card-sub';
  sub.textContent = nbMsg + ' message(s) analysé(s) sur ' + textCols.length + ' question(s) ouverte(s)' +
    (res.base ? ' — % calculés sur ' + res.base + ' réponse(s) avec texte' : '');
  card.appendChild(sub);

  if (!res.terms.length) {
    var p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Aucun mot significatif avec les filtres actuels.';
    card.appendChild(p);
    box.appendChild(card);
    return;
  }
  var wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  var cv = document.createElement('canvas');
  cv.id = 'synthCloud';
  cv.style.height = '260px';
  cv.style.width = '100%';
  wrap.appendChild(cv);
  card.appendChild(wrap);
  drawCloud(cv, res.terms);

  var t = document.createElement('table');
  t.className = 'data';
  var html = '<tr><th>Mot-clé</th><th class="n">Réponses</th><th class="n">%</th><th></th></tr>';
  var max = res.terms[0].resp || 1;
  res.terms.slice(0, 20).forEach(function (term) {
    html += '<tr><td>' + esc(term.disp) + '</td><td class="n">' + term.resp + '</td><td class="n">' +
      fmtPct(term.pct) + '</td><td><div class="bar"><i style="width:' +
      Math.round(100 * term.resp / max) + '%"></i></div></td></tr>';
  });
  t.innerHTML = html;
  card.appendChild(t);
  box.appendChild(card);
}

function renderCards(rows) {
  destroyCharts();
  var box = $('cards');
  box.innerHTML = '';
  var usable = state.catalog.filter(function (c) { return c.kind !== 'ignore'; });
  if (!usable.length) {
    box.innerHTML = '<div class="card wide"><span class="empty">Aucune colonne analysable.</span></div>';
    return;
  }
  if (!state.qSel || !usable.some(function (c) { return c.colId === state.qSel; })) {
    state.qSel = usable[0].colId;
  }
  usable.forEach(function (col) {
    var card = document.createElement('div');
    card.className = 'card' + (col.kind === 'text' ? ' wide' : '');
    card.id = 'card-' + col.colId;

    var head = document.createElement('div');
    head.className = 'card-head';
    var h = document.createElement('h3');
    h.textContent = col.question ? col.label + ' — ' + col.question : col.label;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = kindLabel(col.kind);
    head.appendChild(h); head.appendChild(chip);
    card.appendChild(head);

    // outils : changement d'analyse + exports
    var tools = document.createElement('div');
    tools.className = 'card-tools';
    var sel = document.createElement('select');
    sel.title = "Type d'analyse (surchage manuelle — utile pour d'autres enquêtes)";
    [['auto', 'Auto (' + kindLabel(col.kind) + ')'], ['single', 'Choix unique'], ['multi', 'Choix multiples'],
     ['scale', 'Échelle'], ['text', 'Texte libre'], ['ignore', 'Ignorer']].forEach(function (o) {
      var op = document.createElement('option');
      op.value = o[0]; op.textContent = o[1];
      if ((col.view || 'auto') === o[0]) op.selected = true;
      sel.appendChild(op);
    });
    sel.addEventListener('change', function () {
      col.view = sel.value;
      col.kind = sel.value === 'auto' ? detectKind(
        state.records.map(function (r) { return r[col.colId]; }), null) : sel.value;
      if ((col.kind === 'single' || col.kind === 'multi' || col.kind === 'scale') && !col.choices.length) {
        var counts = {};
        state.records.forEach(function (r) {
          asList(r[col.colId]).forEach(function (s) { counts[s] = (counts[s] || 0) + 1; });
        });
        col.choices = Object.keys(counts);
      }
      renderAll();
    });
    tools.appendChild(sel);
    if (col.kind !== 'text') {
      var csvB = document.createElement('button');
      csvB.textContent = 'CSV';
      csvB.addEventListener('click', function () { exportQuestionCsv(col, rows); });
      tools.appendChild(csvB);
      var pngB = document.createElement('button');
      pngB.textContent = 'PNG';
      pngB.addEventListener('click', function () { exportQuestionPng(col); });
      tools.appendChild(pngB);
    } else {
      var csvB2 = document.createElement('button');
      csvB2.textContent = 'CSV';
      csvB2.addEventListener('click', function () { exportVerbatimCsv(col, rows); });
      tools.appendChild(csvB2);
    }
    card.appendChild(tools);

    if (col.kind === 'text') renderVerbatim(card, col, rows);
    else renderChoice(card, col, rows);

    card.hidden = (col.colId !== state.qSel);
    box.appendChild(card);
  });
  updateQPager();
}

/* ---------------- onglets ---------------- */
function usableCols() {
  return state.catalog.filter(function (c) { return c.kind !== 'ignore'; });
}
function showTab(id) {
  state.tab = id;
  var tabs = { synthese: 'panel-synthese', questions: 'panel-questions', croisement: 'panel-croisement', verbatim: 'panel-verbatim' };
  Object.keys(tabs).forEach(function (k) {
    document.getElementById(tabs[k]).hidden = (k !== id);
  });
  Array.prototype.forEach.call(document.querySelectorAll('#tabBar button'), function (b) {
    b.setAttribute('aria-selected', b.dataset.tab === id ? 'true' : 'false');
  });
  try {
    if (window.location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
  } catch (e) { /* noop */ }
  refreshVisibleCharts();
}
function selectQuestion(colId) {
  state.qSel = colId;
  var usable = usableCols();
  usable.forEach(function (c) {
    var card = document.getElementById('card-' + c.colId);
    if (card) card.hidden = (c.colId !== colId);
  });
  var chart = state.charts[colId];
  if (chart) { try { chart.resize(); } catch (e) { /* noop */ } }
  updateQPager();
  Array.prototype.forEach.call(document.querySelectorAll('#qNav button'), function (b) {
    b.classList.toggle('active', b.dataset.col === colId);
  });
}
function updateQPager() {
  var usable = usableCols();
  var idx = usable.findIndex(function (c) { return c.colId === state.qSel; });
  $('qCounter').textContent = usable.length ? (idx + 1) + ' / ' + usable.length : '';
  $('qPrevBtn').disabled = idx <= 0;
  $('qNextBtn').disabled = idx < 0 || idx >= usable.length - 1;
}
function stepQuestion(dir) {
  var usable = usableCols();
  var idx = usable.findIndex(function (c) { return c.colId === state.qSel; });
  var next = usable[idx + dir];
  if (next) selectQuestion(next.colId);
}
function renderQNav() {
  var nav = $('qNav');
  nav.innerHTML = '';
  usableCols().forEach(function (c) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.col = c.colId;
    if (c.colId === state.qSel) b.classList.add('active');
    var t = document.createElement('span');
    t.className = 't';
    t.textContent = c.label;
    t.title = c.question ? c.label + ' — ' + c.question : c.label;
    var chip = document.createElement('span');
    chip.className = 'chip';
    chip.textContent = kindLabel(c.kind);
    b.appendChild(t); b.appendChild(chip);
    b.addEventListener('click', function () { selectQuestion(c.colId); });
    nav.appendChild(b);
  });
}
function updateTabCounts() {
  var nQ = usableCols().length;
  var nV = state.catalog.filter(function (c) { return c.kind === 'text'; }).length;
  var btns = {};
  Array.prototype.forEach.call(document.querySelectorAll('#tabBar button'), function (b) { btns[b.dataset.tab] = b; });
  if (btns.questions) btns.questions.textContent = 'Questions (' + nQ + ')';
  if (btns.verbatim) btns.verbatim.textContent = 'Verbatim (' + nV + ')';
}
// Redessine ce qui est visible (les graphiques créés dans un onglet caché ont une taille nulle).
function refreshVisibleCharts() {
  Object.keys(state.charts).forEach(function (k) {
    var card = document.getElementById('card-' + k);
    if (card && !card.hidden && card.offsetParent !== null) {
      try { state.charts[k].resize(); } catch (e) { /* noop */ }
    }
  });
  if (state.crossChart && !$('panel-croisement').hidden) {
    try { state.crossChart.resize(); } catch (e) { /* noop */ }
  }
  var synthCv = $('synthCloud');
  if (synthCv && !$('panel-synthese').hidden && state.synthTerms && state.synthTerms.length) {
    drawCloud(synthCv, state.synthTerms);
  }
}
// Affiche tout temporairement (export PNG global, impression) puis restaure.
function withFullView(fn) {
  var prevTab = state.tab;
  document.body.classList.add('exporting');
  Array.prototype.forEach.call(document.querySelectorAll('#cards .card'), function (c) { c.hidden = false; });
  refreshVisibleCharts();
  if (state.crossChart) { try { state.crossChart.resize(); } catch (e) { /* noop */ } }
  var synthCv = $('synthCloud');
  if (synthCv && state.synthTerms && state.synthTerms.length) drawCloud(synthCv, state.synthTerms);
  function restore() {
    document.body.classList.remove('exporting');
    showTab(prevTab);
    selectQuestion(state.qSel);
  }
  return { restore: restore };
}

/* ---------------- explorateur verbatim ---------------- */
function textCols() {
  return state.catalog.filter(function (c) { return c.kind === 'text'; });
}
function renderVerbatimExplorer(rows) {
  var cols = textCols();
  var sel = $('verbSel');
  sel.innerHTML = '';
  if (!cols.length) {
    $('verbCount').textContent = 'Aucune question ouverte.';
    $('verbList').innerHTML = '';
    $('verbChips').innerHTML = '';
    return;
  }
  if (!state.vSel || !cols.some(function (c) { return c.colId === state.vSel; })) {
    // Par défaut : la question ouverte la plus fournie (lignes filtrées).
    var bestCol = cols[0], bestN = -1;
    cols.forEach(function (c) {
      var n = 0;
      rows.forEach(function (r) { n += asList(r[c.colId]).length; });
      if (n > bestN) { bestN = n; bestCol = c; }
    });
    state.vSel = bestCol.colId;
  }
  cols.forEach(function (c) {
    var o = document.createElement('option');
    o.value = c.colId;
    o.textContent = trunc(c.question ? c.label + ' — ' + c.question : c.label, 70);
    if (c.colId === state.vSel) o.selected = true;
    sel.appendChild(o);
  });
  var inp = $('verbSearch');
  if (inp.value !== state.vSearch) inp.value = state.vSearch;
  updateVerbList(rows);
}
function currentVerbCol() {
  var found = null;
  textCols().forEach(function (c) { if (c.colId === state.vSel) found = c; });
  return found;
}
function updateVerbList(rows) {
  rows = rows || getFiltered();
  var col = currentVerbCol();
  var ul = $('verbList'), chips = $('verbChips');
  ul.innerHTML = ''; chips.innerHTML = '';
  if (!col) return;
  var all = [];
  rows.forEach(function (r) {
    asList(r[col.colId]).forEach(function (s) { all.push(s); });
  });
  var mini = analyzeTerms(rows, [col]);
  mini.terms.slice(0, 8).forEach(function (t) {
    var s = document.createElement('span');
    s.textContent = t.disp + ' · ' + t.resp;
    chips.appendChild(s);
  });
  var q = (state.vSearch || '').trim().toLowerCase();
  var list = all.filter(function (t) { return !q || t.toLowerCase().indexOf(q) >= 0; });
  $('verbCount').textContent = list.length + ' message(s)' + (q ? ' (filtrés)' : '');
  if (!list.length) { ul.innerHTML = '<li class="empty">Aucune réponse.</li>'; return; }
  list.slice(0, 200).forEach(function (t) {
    var li = document.createElement('li');
    li.textContent = t;
    ul.appendChild(li);
  });
  if (list.length > 200) {
    var more = document.createElement('li');
    more.className = 'empty';
    more.textContent = '… +' + (list.length - 200) + ' autres (voir export CSV).';
    ul.appendChild(more);
  }
}

function renderChoice(card, col, rows) {
  var res = countsFor(col, rows);
  var sub = document.createElement('p');
  sub.className = 'card-sub';
  var extra = col.kind === 'multi' ? ' — plusieurs réponses possibles (% des répondants)' : '';
  sub.textContent = res.answered + ' réponse(s)' + extra;
  card.appendChild(sub);

  var labels = col.choices.slice();
  var counts = labels.map(function (l) { return res.map[l] || 0; });
  if (col.kind === 'single') {
    var order = labels.map(function (l, i) { return i; })
      .sort(function (a, b) { return counts[b] - counts[a]; });
    labels = order.map(function (i) { return labels[i]; });
    counts = order.map(function (i) { return counts[i]; });
  }

  var wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  var cv = document.createElement('canvas');
  cv.dataset.col = col.colId;
  var useDonut = (col.view === 'donut') || (col.view === 'auto' && labels.length === 2);
  if (col.kind === 'scale') { cv.style.height = '200px'; }
  else if (useDonut) { cv.style.height = '220px'; }
  else { cv.style.height = Math.max(130, labels.length * 34 + 20) + 'px'; }
  wrap.appendChild(cv);
  card.appendChild(wrap);

  if (window.Chart) {
    if (col.kind === 'scale') drawScale(cv, labels, counts);
    else if (useDonut) drawDonut(cv, labels, counts);
    else drawBarH(cv, labels, counts, res.answered);
  } else {
    var p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'Graphiques indisponibles hors-ligne (tableau ci-dessous).';
    card.appendChild(p);
  }

  var base = res.answered || 1;
  var t = document.createElement('table');
  t.className = 'data';
  var html = '<tr><th>Option</th><th class="n">N</th><th class="n">%</th><th></th></tr>';
  var max = Math.max.apply(null, counts.concat([1]));
  labels.forEach(function (l, i) {
    var pct = res.answered ? 100 * counts[i] / base : 0;
    html += '<tr><td>' + esc(l) + '</td><td class="n">' + counts[i] + '</td><td class="n">' +
      fmtPct(pct) + '</td><td><div class="bar"><i style="width:' +
      Math.round(100 * counts[i] / max) + '%"></i></div></td></tr>';
  });
  t.innerHTML = html;
  card.appendChild(t);
}

function renderVerbatim(card, col, rows) {
  var all = [];
  rows.forEach(function (r, i) {
    asList(r[col.colId]).forEach(function (s) { all.push({ i: i + 1, t: s }); });
  });
  var sub = document.createElement('p');
  sub.className = 'card-sub';
  sub.textContent = all.length + ' message(s)';
  card.appendChild(sub);

  // Mots-cles de la question (top 8) — resume d'un coup d'oeil.
  var mini = analyzeTerms(rows, [col]);
  if (mini.terms.length) {
    var chips = document.createElement('div');
    chips.className = 'chips';
    mini.terms.slice(0, 8).forEach(function (t) {
      var s = document.createElement('span');
      s.textContent = t.disp + ' · ' + t.resp;
      s.title = t.resp + ' réponse(s) contiennent « ' + t.disp + ' »';
      chips.appendChild(s);
    });
    card.appendChild(chips);
  }

  var box = document.createElement('div');
  box.className = 'verbatim';
  var inp = document.createElement('input');
  inp.placeholder = 'Rechercher dans les réponses…';
  inp.value = state.search[col.colId] || '';
  box.appendChild(inp);
  var ul = document.createElement('ul');
  box.appendChild(ul);
  function draw() {
    var q = inp.value.trim().toLowerCase();
    state.search[col.colId] = inp.value;
    var list = all.filter(function (x) { return !q || x.t.toLowerCase().indexOf(q) >= 0; });
    ul.innerHTML = '';
    if (!list.length) { ul.innerHTML = '<li class="empty">Aucune réponse.</li>'; return; }
    list.slice(0, 80).forEach(function (x) {
      var li = document.createElement('li');
      li.textContent = x.t;
      ul.appendChild(li);
    });
    if (list.length > 80) {
      var more = document.createElement('li');
      more.className = 'empty';
      more.textContent = '… +' + (list.length - 80) + ' autres (voir export CSV).';
      ul.appendChild(more);
    }
  }
  inp.addEventListener('input', draw);
  draw();
  card.appendChild(box);
}

function renderAll() {
  var rows = getFiltered();
  renderKpis(rows);
  renderFilters();
  renderCards(rows);
  renderQNav();
  renderSynthCard($('synthBox'), rows);
  renderCross(rows);
  renderVerbatimExplorer(rows);
  updateTabCounts();
  showTab(state.tab);
  var d = new Date();
  $('footNote').textContent = state.records.length + ' lignes (' +
    ({ grist: 'Grist', demo: 'données démo', csv: 'CSV importé' }[state.source] || '?') +
    ') — ' + rows.length + ' affichées — exporté le ' +
    d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

/* ---------------- exports ---------------- */
function csvEsc(v, sep) {
  var s = String(v == null ? '' : v);
  if (s.indexOf('"') >= 0 || s.indexOf('\n') >= 0 || s.indexOf(sep) >= 0) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
function cellText(col, v) {
  var l = asList(v);
  return l.join('; ');
}
function exportGlobalCsv() {
  var rows = getFiltered();
  var cols = state.catalog.filter(function (c) { return c.kind !== 'ignore'; });
  var sep = ';';
  var lines = [cols.map(function (c) { return csvEsc(c.question || c.label, sep); }).join(sep)];
  rows.forEach(function (r) {
    lines.push(cols.map(function (c) { return csvEsc(cellText(c, r[c.colId]), sep); }).join(sep));
  });
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    slug(state.title) + '-donnees.csv');
}
function exportQuestionCsv(col, rows) {
  var sep = ';';
  var res = countsFor(col, rows);
  var lines = ['Option' + sep + 'N' + sep + '%'];
  col.choices.forEach(function (l) {
    var n = res.map[l] || 0;
    var pct = res.answered ? (Math.round(1000 * n / res.answered) / 10) : 0;
    lines.push(csvEsc(l, sep) + sep + n + sep + String(pct).replace('.', ','));
  });
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    slug(col.label) + '.csv');
}
function exportVerbatimCsv(col, rows) {
  var sep = ';';
  var lines = ['N' + sep + 'Réponse'];
  var k = 0;
  rows.forEach(function (r) {
    asList(r[col.colId]).forEach(function (s) { k++; lines.push(k + sep + csvEsc(s, sep)); });
  });
  download(new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }),
    slug(col.label) + '-verbatim.csv');
}
function exportQuestionPng(col) {
  var card = $('card-' + CSS.escape(col.colId));
  var cv = card ? card.querySelector('canvas') : null;
  if (!cv) { alert('Pas de graphique pour cette question.'); return; }
  cv.toBlob(function (blob) {
    if (blob) download(blob, slug(col.label) + '.png');
    else alert("Export PNG impossible dans ce navigateur.");
  }, 'image/png');
}
function exportAllPng() {
  var view = withFullView();
  function collect() {
    var cvs = Array.prototype.slice.call(document.querySelectorAll('#cards canvas, #synthBox canvas, #crossSection canvas'));
    if (!cvs.length) { alert('Aucun graphique à exporter.'); return; }
    var names = cvs.map(function (cv, i) {
      if (cv.id === 'synthCloud') return slug(state.title) + '-nuage-mots';
      if (cv.id === 'crossCanvas') return slug(state.title) + '-croisement';
      var col = null;
      state.catalog.forEach(function (c) { if (c.colId === cv.dataset.col) col = c; });
      return slug(col ? col.label : (cv.dataset.col || 'graphique-' + i));
    });
  if (window.JSZip) {
    var zip = new window.JSZip();
    var done = 0;
    cvs.forEach(function (cv, i) {
      var url = cv.toDataURL('image/png').split(',')[1];
      zip.file(names[i] + '.png', url, { base64: true });
      done++;
      if (done === cvs.length) {
        zip.generateAsync({ type: 'blob' }).then(function (blob) {
          download(blob, slug(state.title) + '-graphiques.zip');
        });
      }
    });
  } else {
    // Sans JSZip : telechargements sequentiels.
    cvs.forEach(function (cv, i) {
      cv.toBlob(function (b) { if (b) download(b, names[i] + '.png'); }, 'image/png');
    });
  }
  view.restore();
  }
  // Laisse le navigateur poser les tailles avant capture.
  setTimeout(collect, 350);
}
function activeFilterText() {
  var parts = [];
  Object.keys(state.filters).forEach(function (k) {
    if (state.filters[k]) {
      var c = null;
      state.catalog.forEach(function (x) { if (x.colId === k) c = x; });
      parts.push((c ? c.label : k) + ' = ' + state.filters[k]);
    }
  });
  return parts.length ? 'Filtres : ' + parts.join(' · ') : 'Aucun filtre';
}
/* ---------------- import CSV ---------------- */
function detectSep(line) {
  var cands = [';', ',', '\t'];
  var best = ';', bestN = -1;
  cands.forEach(function (s) {
    var n = line.split(s).length;
    if (n > bestN) { bestN = n; best = s; }
  });
  return best;
}
function parseCsv(text) {
  var sep = detectSep((text.split(/\r?\n/)[0] || ''));
  var rows = [], cur = [], val = '', inQ = false;
  for (var i = 0; i < text.length; i++) {
    var c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { val += '"'; i++; }
        else inQ = false;
      } else val += c;
    } else if (c === '"') inQ = true;
    else if (c === sep) { cur.push(val); val = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      cur.push(val); val = '';
      if (cur.length > 1 || cur[0] !== '') rows.push(cur);
      cur = [];
    } else val += c;
  }
  cur.push(val);
  if (cur.length > 1 || cur[0] !== '') rows.push(cur);
  return { sep: sep, rows: rows };
}
function importCsvFile(file) {
  var rd = new FileReader();
  rd.onload = function () {
    try {
      var parsed = parseCsv(String(rd.result || ''));
      if (parsed.rows.length < 2) { alert('CSV vide ou illisible.'); return; }
      var headers = parsed.rows[0].map(function (h) { return h.trim(); });
      // Correspondance en-tete -> colId (exact, puis libelle/question).
      var dataRows = parsed.rows.slice(1);
      var allKnown = state.catalog.slice();
      var map = headers.map(function (h) {
        var low = h.toLowerCase();
        for (var i = 0; i < allKnown.length; i++) {
          if (allKnown[i].colId.toLowerCase() === low) return allKnown[i].colId;
        }
        for (var j = 0; j < allKnown.length; j++) {
          var c = allKnown[j];
          if ((c.label && c.label.toLowerCase() === low) ||
            (c.question && c.question.toLowerCase() === low)) return c.colId;
        }
        return null;
      });
      // Colonnes inconnues -> nouveaux identifiants (libellés = en-têtes, voir meta).
      map = map.map(function (m, idx) {
        if (m) return m;
        return 'CSV_' + (idx + 1);
      });
      var recs = dataRows.map(function (r, ri) {
        var o = { id: ri + 1 };
        map.forEach(function (colId, ci) {
          var raw = (r[ci] || '').trim();
          o[colId] = raw.indexOf(';') >= 0 ? raw.split(';').map(function (x) { return x.trim(); }).filter(Boolean) : raw;
        });
        return o;
      });
      // Les en-têtes du CSV deviennent les libellés (jamais les anciens).
      var meta = {};
      map.forEach(function (colId, ci) {
        if (!meta[colId]) meta[colId] = { type: '', label: headers[ci] || colId, question: '', choices: [] };
      });
      setData(recs, meta, 'csv');
      setStatus('CSV importé : ' + recs.length + ' lignes, ' + map.length + ' colonnes.', true);
    } catch (e) { alert('Import impossible : ' + e.message); }
  };
  rd.readAsText(file, 'utf-8');
}

/* ---------------- alimentation ---------------- */
function setData(records, metaMap, source) {
  state.records = records;
  state.source = source;
  state.filters = {};
  state.search = {};
  state.cross.x = null; state.cross.y = null; state.crossCache = null;
  state.qSel = null; state.vSel = null; state.vSearch = '';
  if (source === 'demo') {
    // La démo simule le chemin « métadonnées Grist » (accès complet) :
    // types + libellés issus du schéma démo, jamais devinés.
    metaMap = {};
    DEMO_SCHEMA.forEach(function (c) {
      metaMap[c.colId] = {
        type: c.kind === 'multi' ? 'ChoiceList' : (c.kind === 'text' ? 'Text' : 'Choice'),
        label: c.label, question: c.question, choices: (c.choices || []).slice()
      };
    });
    state.catalog = buildCatalog(records, metaMap, DEMO_SCHEMA.map(function (c) { return c.colId; }));
  } else {
    state.catalog = buildCatalog(records, metaMap, null);
  }
  var badge = $('sourceBadge');
  if (source === 'grist') {
    badge.textContent = '● Connecté Grist — ' + records.length + ' lignes';
    badge.className = 'badge live';
    setStatus(null);
  } else if (source === 'csv') {
    badge.textContent = 'CSV importé — ' + records.length + ' lignes';
    badge.className = 'badge';
  } else {
    badge.textContent = 'DÉMO — ' + records.length + ' fausses réponses (en attente de Grist)';
    badge.className = 'badge';
  }
  renderAll();
}

/* ---------------- Grist ---------------- */
function parseWidgetOptions(json) {
  if (!json) return {};
  try { return typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { return {}; }
}
function tryFetchMeta() {
  var g = window.grist;
  if (!g || !g.docApi || !g.docApi.fetchTable) return Promise.resolve(null);
  return g.docApi.fetchTable('_grist_Tables_column').then(function (t) {
    if (!t || !t.colId) return null;
    var map = {};
    var idsInData = {};
    state.records.forEach(function (r) { Object.keys(r).forEach(function (k) { idsInData[k] = 1; }); });
    for (var i = 0; i < t.colId.length; i++) {
      var cid = t.colId[i];
      if (!idsInData[cid]) continue;
      var wo = parseWidgetOptions(t.widgetOptions ? t.widgetOptions[i] : '');
      var choices = Array.isArray(wo.choices) ? wo.choices.slice() : [];
      map[cid] = {
        type: t.type ? t.type[i] : '',
        label: (t.label && t.label[i]) || cid,
        question: wo.question || '',
        choices: choices
      };
    }
    return map;
  }).catch(function () { return null; });
}
function loadScriptOnce(src) {
  return new Promise(function (resolve, reject) {
    var s = document.createElement('script');
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}
function initGrist() {
  var g = window.grist;
  if (!g || !g.ready) return false;
  try {
    g.ready({ requiredAccess: 'read table' });
  } catch (e) { return false; }
  try {
    if (g.onOptions) {
      g.onOptions(function (opts) {
        if (opts && typeof opts.title === 'string' && opts.title.trim()) {
          state.title = opts.title.trim();
          $('surveyTitle').textContent = state.title;
        }
      });
    }
  } catch (e) { /* noop */ }
  try {
    g.onRecords(function (records) {
      state.gristSeen = true;
      if (!records || !records.length) {
        setStatus("Grist connecté mais aucune ligne reçue — vérifiez la table sélectionnée dans le widget (Select Data).", true);
        return;
      }
      var clean = records.map(function (r) {
        var o = {};
        Object.keys(r).forEach(function (k) { if (k !== 'id' || true) o[k] = r[k]; });
        return o;
      });
      // Les metadonnees dependent de state.records pour filtrer : on pose d'abord.
      state.records = clean;
      tryFetchMeta().then(function (meta) {
        // Si l'utilisateur a entre-temps importe un CSV, ne pas ecraser.
        if (state.source === 'csv' && !state.gristSeen) return;
        setData(clean, meta, 'grist');
      });
    });
  } catch (e) { return false; }
  return true;
}

/* ---------------- demarrage ---------------- */
function boot() {
  var params = new URLSearchParams(window.location.search);
  if (params.get('title')) {
    state.title = params.get('title');
    $('surveyTitle').textContent = state.title;
  }
  var demoN = parseInt(params.get('demo') || '140', 10) || 140;

  $('csvBtn').addEventListener('click', exportGlobalCsv);
  $('pngBtn').addEventListener('click', exportAllPng);
  $('printBtn').addEventListener('click', function () { window.print(); });
  $('demoBtn').addEventListener('click', function () {
    setData(genDemoRecords(demoN, 20260206), null, 'demo');
    setStatus('Jeu de démonstration rechargé.', true);
  });
  $('resetFiltersBtn').addEventListener('click', function () {
    state.filters = {};
    renderAll();
  });
  $('crossX').addEventListener('change', function (e) {
    state.cross.x = e.target.value;
    renderAll();
  });
  $('crossY').addEventListener('change', function (e) {
    state.cross.y = e.target.value;
    renderAll();
  });
  $('crossMode').addEventListener('change', function (e) {
    state.cross.mode = e.target.value;
    renderAll();
  });
  $('crossCsvBtn').addEventListener('click', exportCrossCsv);
  $('crossPngBtn').addEventListener('click', function () {
    var cv = $('crossCanvas');
    if (cv) cv.toBlob(function (b) { if (b) download(b, slug(state.title) + '-croisement.png'); }, 'image/png');
  });
  $('csvInput').addEventListener('change', function (e) {
    if (e.target.files && e.target.files[0]) importCsvFile(e.target.files[0]);
    e.target.value = '';
  });
  Array.prototype.forEach.call(document.querySelectorAll('#tabBar button'), function (b) {
    b.addEventListener('click', function () { showTab(b.dataset.tab); });
  });
  $('qPrevBtn').addEventListener('click', function () { stepQuestion(-1); });
  $('qNextBtn').addEventListener('click', function () { stepQuestion(1); });
  $('verbSel').addEventListener('change', function (e) {
    state.vSel = e.target.value;
    renderVerbatimExplorer(getFiltered());
  });
  $('verbSearch').addEventListener('input', function (e) {
    state.vSearch = e.target.value;
    updateVerbList();
  });
  $('verbCsvBtn').addEventListener('click', function () {
    var col = currentVerbCol();
    if (col) exportVerbatimCsv(col, getFiltered());
  });
  window.addEventListener('beforeprint', function () {
    document.body.classList.add('exporting');
    Array.prototype.forEach.call(document.querySelectorAll('#cards .card'), function (c) { c.hidden = false; });
    refreshVisibleCharts();
    if (state.crossChart) { try { state.crossChart.resize(); } catch (e) { /* noop */ } }
    var synthCv = $('synthCloud');
    if (synthCv && state.synthTerms && state.synthTerms.length) drawCloud(synthCv, state.synthTerms);
  });
  window.addEventListener('afterprint', function () {
    document.body.classList.remove('exporting');
    showTab(state.tab);
    selectQuestion(state.qSel);
  });
  // Onglet initial via #hash (ex. #questions), sinon Synthèse.
  (function () {
    var h = (window.location.hash || '').replace('#', '');
    if (['synthese', 'questions', 'croisement', 'verbatim'].indexOf(h) >= 0) state.tab = h;
  })();

  function startDemoIfNoGrist() {
    if (!state.gristSeen) {
      setData(genDemoRecords(demoN, 20260206), null, 'demo');
      if (window.grist && window.grist.ready) {
        setStatus("En attente des données Grist — jeu démo affiché. Dans Grist : Custom widget → Select Data = votre table.", true);
      }
    }
  }

  // Apercu Perchance : demo immediate, sans tentative de connexion Grist.
  if (window.__WIDGET_PREVIEW) {
    setData(genDemoRecords(demoN, 20260206), null, 'demo');
    return;
  }

  if (window.grist && window.grist.ready) {
    if (initGrist()) {
      setStatus('Connexion à Grist…', true);
      setTimeout(startDemoIfNoGrist, 2500);
      return;
    }
  }
  // API Grist absente (GitHub Pages / apercu) : tentative de repli DINUM, puis demo.
  loadScriptOnce('https://grist.numerique.gouv.fr/grist-plugin-api.js').then(function () {
    if (window.grist && window.grist.ready && initGrist()) {
      setTimeout(startDemoIfNoGrist, 2500);
    } else {
      startDemoIfNoGrist();
    }
  }).catch(function () {
    startDemoIfNoGrist();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

// Crochet de test / console (sans effet sur Grist) : permet de rejouer des
// jeux de donnees, utile pour valider d'autres structures d'enquete.
window.SurveyWidget = {
  setData: setData,
  demo: genDemoRecords,
  state: state
};
})();
