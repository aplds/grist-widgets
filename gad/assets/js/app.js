// Variables globales pour la pagination et le tri
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = null;
let sortDirection = 1; // 1 pour ascendant, -1 pour descendant

// Fonction pour charger une vue
async function loadView(viewName) {
  try {
    const response = await fetch(`views/${viewName}.html`);
    if (!response.ok) {
      throw new Error(`Erreur lors du chargement de la vue ${viewName}`);
    }
    const html = await response.text();
    document.getElementById('main-content').innerHTML = html;

    // Initialisation spécifique à la vue
    if (viewName === "affaires") {
      checkDataReady(initAffairesView);
    } else if (viewName === "details-affaire") {
      checkDataReady(initDetailsAffaireView);
    } else if (viewName === "audiences") {
      checkDataReady(initAudiencesView);
    } else if (viewName === "membres") {
      checkDataReady(initMembresView);
    } else if (viewName === "modeles") {
      checkDataReady(initModelesView);
    }
  } catch (error) {
    console.error("Erreur lors du chargement de la vue :", error);
    document.getElementById('main-content').innerHTML = `<p class="fr-text--error">Erreur lors du chargement de la vue : ${error.message}</p>`;
  }
}

// Fonction pour appliquer les filtres et la recherche
function applyFilters() {
  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
  const filterEtat = document.getElementById('filterEtat')?.value || "";
  const filterEcole = document.getElementById('filterEcole')?.value || "";

  let filtered = affairesData.filter(record => {
    const numero = (record.Numero || record.numero || record['Numéro'] || record.numAffaire || "").toString().toLowerCase();
    const misEnCause = (record["Mis en cause"] || record.misEnCause || record["Mis_en_cause"] || record.personne || "").toString().toLowerCase();
    const searchMatch = !searchTerm || numero.includes(searchTerm) || misEnCause.includes(searchTerm);

    const etat = record.Etat || record.etat || record['État'] || record.statut || "N/C";
    const etatMatch = !filterEtat || etat === filterEtat;

    const ecole = record.Ecole || record.ecole || record['École'] || "N/C";
    const ecoleMatch = !filterEcole || ecole === filterEcole;

    return searchMatch && etatMatch && ecoleMatch;
  });

  // Appliquer le tri
  filtered = applySort(filtered);

  // Réinitialiser à la première page après filtrage
  currentPage = 1;
  renderAffairesTable(filtered);
  updatePaginationInfo(filtered.length);
}

// Fonction pour appliquer le tri
function applySort(records) {
  if (!sortColumn) {
    // Tri par défaut par date (du plus récent au plus ancien)
    return [...records].sort((a, b) => {
      const dateA = getAffaireDate(a);
      const dateB = getAffaireDate(b);
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    });
  }

  return [...records].sort((a, b) => {
    let valueA, valueB;

    // Récupérer les valeurs selon la colonne de tri
    switch(sortColumn) {
      case 'Numero':
        valueA = a.Numero || a.numero || a['Numéro'] || a.numAffaire || "";
        valueB = b.Numero || b.numero || b['Numéro'] || b.numAffaire || "";
        break;
      case 'Etat':
        valueA = a.Etat || a.etat || a['État'] || a.statut || "";
        valueB = b.Etat || b.etat || b['État'] || b.statut || "";
        break;
      case 'Date':
        valueA = getAffaireDate(a);
        valueB = getAffaireDate(b);
        break;
      case 'Ecole':
        valueA = a.Ecole || a.ecole || a['École'] || "";
        valueB = b.Ecole || b.ecole || b['École'] || "";
        break;
      case 'Mis en cause':
        valueA = a["Mis en cause"] || a.misEnCause || a["Mis_en_cause"] || a.personne || "";
        valueB = b["Mis en cause"] || b.misEnCause || b["Mis_en_cause"] || b.personne || "";
        break;
      default:
        // Tri par défaut par date
        valueA = getAffaireDate(a);
        valueB = getAffaireDate(b);
    }

    // Comparaison selon le type de valeur
    if (valueA instanceof Date && valueB instanceof Date) {
      return sortDirection * (valueA - valueB);
    } else if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection * valueA.localeCompare(valueB);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      return sortDirection * (valueA - valueB);
    } else {
      // Conversion en string pour comparaison
      return sortDirection * String(valueA).localeCompare(String(valueB));
    }
  });
}

// Fonction pour afficher le tableau des affaires avec pagination
function renderAffairesTable(records) {
  const tableBody = document.getElementById('affairesTableBody');
  tableBody.innerHTML = '';

  if (records.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Aucune affaire trouvée</td></tr>';
    return;
  }

  // Calculer les indices de début et fin pour la page actuelle
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, records.length);
  const pageRecords = records.slice(startIndex, endIndex);

  // Afficher les enregistrements de la page actuelle
  pageRecords.forEach(function(record, index) {
    const row = document.createElement('tr');
    row.style.cursor = "pointer";
    row.style.borderBottom = "1px solid #f0f0f0";

    // Alternance de couleurs de fond (zebrage)
    if (index % 2 === 0) {
      row.style.backgroundColor = '#ffffff';
    } else {
      row.style.backgroundColor = '#f9f9f9';
    }

    // Obtenir l'ID de la ligne pour l'ancre
    const rowId = record.id;

    // Ajouter l'événement de clic pour la redirection
    row.addEventListener('click', function() {
      localStorage.setItem('currentAffaireId', rowId);
      loadView('details-affaire');
    });

    // Numéro (en gras)
    const numeroCell = document.createElement('td');
    numeroCell.textContent = record.Numero || record.numero || record['Numéro'] || record.numAffaire || "N/C";
    numeroCell.style.padding = "12px";
    numeroCell.style.fontWeight = "bold";
    row.appendChild(numeroCell);

    // État (avec surlignage selon la valeur)
    const etatCell = document.createElement('td');
    const etat = record.Etat || record.etat || record['État'] || record.statut || "N/C";

    // Créer un span pour le surlignage
    const etatSpan = document.createElement('span');
    etatSpan.textContent = etat;
    etatSpan.style.padding = "4px 8px";
    etatSpan.style.borderRadius = "4px";
    etatSpan.style.display = "inline-block";

    // Appliquer le style selon l'état
    if (etatColors[etat]) {
      etatSpan.style.backgroundColor = etatColors[etat].background;
      etatSpan.style.color = etatColors[etat].color;
    }

    etatCell.style.padding = "12px";
    etatCell.appendChild(etatSpan);
    row.appendChild(etatCell);

    // Date de l'état
    const dateCell = document.createElement('td');
    let dateEtat = "N/C";
    const possibleDateFields = ["Date de l état", "Date_de_l_etat", "dateEtat", "Date", "date", "dateStatut"];
    for (const field of possibleDateFields) {
      if (record[field]) {
        try {
          dateEtat = new Date(record[field]).toLocaleDateString("fr-FR");
          break;
        } catch (e) {
          dateEtat = record[field];
        }
      }
    }
    dateCell.textContent = dateEtat;
    dateCell.style.padding = "12px";
    row.appendChild(dateCell);

    // École
    const ecoleCell = document.createElement('td');
    ecoleCell.textContent = record.Ecole || record.ecole || record['École'] || "N/C";
    ecoleCell.style.padding = "12px";
    row.appendChild(ecoleCell);

    // Mis en cause
    const misEnCauseCell = document.createElement('td');
    let misEnCause = "N/C";

    const possibleMisEnCauseFields = [
      "Mis en cause", "misEnCause", "Mis_en_cause",
      "personne", "nomMisEnCause", "Personne mise en cause"
    ];

    for (const field of possibleMisEnCauseFields) {
      if (record[field]) {
        misEnCause = record[field];
        if (Array.isArray(misEnCause) && misEnCause.length > 0) {
          misEnCause = misEnCause[0];
        }
        break;
      }
    }

    if (typeof misEnCause === 'object' && misEnCause !== null && !Array.isArray(misEnCause)) {
      misEnCause = misEnCause.display || misEnCause.value || JSON.stringify(misEnCause);
    }

    misEnCauseCell.textContent = misEnCause;
    misEnCauseCell.style.padding = "12px";
    row.appendChild(misEnCauseCell);

    tableBody.appendChild(row);
  });
}

// Fonction pour mettre à jour les infos de pagination
function updatePaginationInfo(totalRecords) {
  const paginationInfo = document.getElementById('paginationInfo');
  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;

  if (paginationInfo) {
    paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} | ${totalRecords} affaire(s)`;
  }

  // Désactiver les boutons si nécessaire
  if (document.getElementById('prevPage')) {
    document.getElementById('prevPage').disabled = currentPage <= 1;
  }
  if (document.getElementById('nextPage')) {
    document.getElementById('nextPage').disabled = currentPage >= totalPages || totalPages === 0;
  }
}

// Fonction pour remplir les filtres
function populateFilters() {
  const filterEtat = document.getElementById('filterEtat');
  const filterEcole = document.getElementById('filterEcole');

  if (filterEtat && filterEcole) {
    // Récupérer les valeurs uniques pour chaque filtre
    const etats = [...new Set(affairesData.map(r => r.Etat || r.etat || r['État'] || r.statut || "N/C"))].filter(e => e !== "N/C");
    const ecoles = [...new Set(affairesData.map(r => r.Ecole || r.ecole || r['École'] || r.nomEcole || "N/C"))].filter(e => e !== "N/C");

    filterEtat.innerHTML = '<option value="">Tous les états</option>';
    etats.forEach(etat => {
      const option = document.createElement('option');
      option.value = etat;
      option.textContent = etat;
      filterEtat.appendChild(option);
    });

    filterEcole.innerHTML = '<option value="">Toutes les écoles</option>';
    ecoles.forEach(ecole => {
      const option = document.createElement('option');
      option.value = ecole;
      option.textContent = ecole;
      filterEcole.appendChild(option);
    });
  }
}

// Initialisation de la vue principale (affaires)
function initAffairesView() {
  // Remplir les filtres
  populateFilters();

  // Écouteurs d'événements pour la pagination
  if (document.getElementById('itemsPerPage')) {
    document.getElementById('itemsPerPage').addEventListener('change', function() {
      itemsPerPage = parseInt(this.value);
      currentPage = 1;
      applyFilters();
    });
  }

  if (document.getElementById('prevPage')) {
    document.getElementById('prevPage').addEventListener('click', function() {
      if (currentPage > 1) {
        currentPage--;
        applyFilters();
      }
    });
  }

  if (document.getElementById('nextPage')) {
    document.getElementById('nextPage').addEventListener('click', function() {
      const totalPages = Math.ceil(affairesData.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        applyFilters();
      }
    });
  }

  // Écouteurs d'événements pour les filtres
  if (document.getElementById('searchInput')) {
    document.getElementById('searchInput').addEventListener('input', applyFilters);
  }
  if (document.getElementById('filterEtat')) {
    document.getElementById('filterEtat').addEventListener('change', applyFilters);
  }
  if (document.getElementById('filterEcole')) {
    document.getElementById('filterEcole').addEventListener('change', applyFilters);
  }

  // Écouteurs d'événements pour le tri
  document.querySelectorAll('.sort-icon').forEach(icon => {
    icon.addEventListener('click', function() {
      const column = this.getAttribute('data-column');

      // Changer la direction de tri si on clique sur la même colonne
      if (sortColumn === column) {
        sortDirection *= -1; // Inverser la direction
      } else {
        sortColumn = column;
        sortDirection = 1; // Réinitialiser à ascendant
      }

      // Mettre à jour les icônes de tri
      document.querySelectorAll('.sort-icon').forEach(i => {
        i.textContent = '↕';
      });
      if (this.textContent === '↓') {
        this.textContent = '↑';
      } else {
        this.textContent = '↓';
      }

      applyFilters(); // Re-appliquer les filtres avec le nouveau tri
    });
  });

  // Appliquer les filtres initiaux
  applyFilters();
}

// Initialisation de la vue "détails d'une affaire"
function initDetailsAffaireView() {
  const affaireId = localStorage.getItem('currentAffaireId');
  const affaire = getAffaireById(parseInt(affaireId));
  if (!affaire) {
    document.getElementById('main-content').innerHTML = "<p>Affaire non trouvée.</p>";
    return;
  }

  document.getElementById('affaire-nom').textContent = `Affaire n°${affaire.Numero || 'Sans numéro'}`;

  // Charger les membres
  const membres = getMembresByAffaireId(affaireId);
  const membresList = document.getElementById('membres-list');
  membresList.innerHTML = membres.length > 0 ?
    membres.map(membre => `
      <div class="fr-card fr-enlarge-link fr-mb-3w">
        <div class="fr-card__body">
          <h5 class="fr-card__title">${membre.NOM || ''} ${membre.Prenom || ''}</h5>
          <p class="fr-card__desc">${membre.Role || ''} (${membre.College || ''})</p>
        </div>
      </div>
    `).join('') :
    "<p>Aucun membre trouvé.</p>";

  // Charger les parties
  const parties = getPartiesByAffaireId(affaireId);
  const partiesList = document.getElementById('parties-list');
  partiesList.innerHTML = parties.length > 0 ?
    parties.map(partie => `
      <div class="fr-card fr-enlarge-link fr-mb-3w">
        <div class="fr-card__body">
          <h5 class="fr-card__title">${partie.Nom || ''} ${partie.Prenom || ''}</h5>
          <p class="fr-card__desc">${partie.Qualite || ''} (${partie.Type || ''})</p>
        </div>
      </div>
    `).join('') :
    "<p>Aucune partie trouvée.</p>";

  // Charger les audiences
  const audiences = getAudiencesByAffaireId(affaireId);
  const audiencesList = document.getElementById('audiences-list');
  audiencesList.innerHTML = audiences.length > 0 ?
    audiences.map(audience => `
      <div class="fr-card fr-enlarge-link fr-mb-3w">
        <div class="fr-card__body">
          <h5 class="fr-card__title">Audience du ${audience.Date_et_heure ? new Date(audience.Date_et_heure).toLocaleDateString('fr-FR') : 'Date inconnue'}</h5>
          <p class="fr-card__desc">Salle : ${audience.Salle || 'Non spécifiée'}</p>
        </div>
      </div>
    `).join('') :
    "<p>Aucune audience trouvée.</p>";
}

// Initialisation de la vue "Audiences"
function initAudiencesView() {
  const audiencesList = document.getElementById('audiences-list');

  if (!audiencesData || audiencesData.length === 0) {
    audiencesList.innerHTML = "<p>Aucune audience trouvée.</p>";
    return;
  }

  audiencesList.innerHTML = audiencesData
    .map(audience => `
      <div class="fr-card fr-enlarge-link fr-mb-3w">
        <div class="fr-card__body">
          <h5 class="fr-card__title">Audience du ${audience.Date_et_heure ? new Date(audience.Date_et_heure).toLocaleDateString('fr-FR') : 'Date inconnue'}</h5>
          <p class="fr-card__desc">Salle : ${audience.Salle || 'Non spécifiée'}</p>
        </div>
      </div>
    `)
    .join('');
}

// Initialisation de la vue "Membres"
function initMembresView() {
  const membresList = document.getElementById('membres-list');

  if (!membresData || membresData.length === 0) {
    membresList.innerHTML = "<p>Aucun membre trouvé.</p>";
    return;
  }

  membresList.innerHTML = membresData
    .map(membre => `
      <div class="fr-card fr-enlarge-link fr-mb-3w">
        <div class="fr-card__body">
          <h5 class="fr-card__title">${membre.NOM || ''} ${membre.Prenom || ''}</h5>
          <p class="fr-card__desc">${membre.Role || ''} (${membre.College || ''})</p>
        </div>
      </div>
    `)
    .join('');
}

// Initialisation de la vue "Modèles"
function initModelesView() {
  // À développer selon vos besoins
  document.getElementById('main-content').innerHTML += "<p>Vue des modèles de documents à développer.</p>";
}

// Gestion du menu
document.querySelectorAll('[data-view]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const view = e.target.getAttribute('data-view');
    loadView(view);
  });
});

// Chargement initial
loadView('affaires');
