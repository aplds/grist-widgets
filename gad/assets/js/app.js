// Variables globales pour la pagination et le tri
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = null;
let sortDirection = 1;

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
    }
  } catch (error) {
    console.error("Erreur lors du chargement de la vue :", error);
    document.getElementById('main-content').innerHTML = `<p class="fr-text--error">Erreur lors du chargement de la vue : ${error.message}</p>`;
  }
}

// Fonction pour appliquer les filtres et la recherche
function applyFilters() {
  if (!Array.isArray(affairesData)) {
    console.warn("affairesData n'est pas un tableau.");
    return;
  }

  const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
  const filterEtat = document.getElementById('filterEtat')?.value || "";
  const filterEcole = document.getElementById('filterEcole')?.value || "";

  let filtered = affairesData.filter(record => {
    if (!record) return false;

    const numero = (record.Numero || record.numero || record['Numéro'] || "").toString().toLowerCase();
    const misEnCause = (record["Mis en cause"] || record.misEnCause || record["Mis_en_cause"] || "").toString().toLowerCase();
    const searchMatch = !searchTerm || numero.includes(searchTerm) || misEnCause.includes(searchTerm);

    const etat = record.Etat || record.etat || record['État'] || "N/C";
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
  if (!Array.isArray(records)) {
    console.warn("records n'est pas un tableau.");
    return [];
  }

  if (!sortColumn) {
    // Tri par défaut par numéro d'affaire
    return [...records].sort((a, b) => {
      const numeroA = a.Numero || a.numero || a['Numéro'] || "";
      const numeroB = b.Numero || b.numero || b['Numéro'] || "";
      return sortDirection * numeroA.localeCompare(numeroB);
    });
  }

  return [...records].sort((a, b) => {
    if (!a || !b) return 0;

    let valueA, valueB;

    // Récupérer les valeurs selon la colonne de tri
    switch(sortColumn) {
      case 'Numero':
        valueA = a.Numero || a.numero || a['Numéro'] || "";
        valueB = b.Numero || b.numero || b['Numéro'] || "";
        break;
      case 'Etat':
        valueA = a.Etat || a.etat || a['État'] || "";
        valueB = b.Etat || b.etat || b['État'] || "";
        break;
      case 'Ecole':
        valueA = a.Ecole || a.ecole || a['École'] || "";
        valueB = b.Ecole || b.ecole || b['École'] || "";
        break;
      case 'Mis en cause':
        valueA = a["Mis en cause"] || a.misEnCause || a["Mis_en_cause"] || "";
        valueB = b["Mis en cause"] || b.misEnCause || b["Mis_en_cause"] || "";
        break;
      default:
        // Tri par défaut par numéro d'affaire
        valueA = a.Numero || a.numero || a['Numéro'] || "";
        valueB = b.Numero || b.numero || b['Numéro'] || "";
    }

    // Comparaison selon le type de valeur
    if (typeof valueA === 'string' && typeof valueB === 'string') {
      return sortDirection * valueA.localeCompare(valueB);
    } else {
      // Conversion en string pour comparaison
      return sortDirection * String(valueA).localeCompare(String(valueB));
    }
  });
}

// Fonction pour afficher le tableau des affaires avec pagination
function renderAffairesTable(records) {
  if (!Array.isArray(records)) {
    console.warn("records n'est pas un tableau.");
    return;
  }

  const tableBody = document.getElementById('affairesTableBody');
  if (!tableBody) {
    console.warn("L'élément affairesTableBody n'existe pas.");
    return;
  }

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
    if (!record) return;

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
    numeroCell.textContent = record.Numero || record.numero || record['Numéro'] || "N/C";
    numeroCell.style.padding = "12px";
    numeroCell.style.fontWeight = "bold";
    row.appendChild(numeroCell);

    // État
    const etatCell = document.createElement('td');
    const etat = record.Etat || record.etat || record['État'] || "N/C";
    etatCell.textContent = etat;
    etatCell.style.padding = "12px";
    row.appendChild(etatCell);

    // École
    const ecoleCell = document.createElement('td');
    ecoleCell.textContent = record.Ecole || record.ecole || record['École'] || "N/C";
    ecoleCell.style.padding = "12px";
    row.appendChild(ecoleCell);

    // Mis en cause
    const misEnCauseCell = document.createElement('td');
    let misEnCause = record["Mis en cause"] || record.misEnCause || record["Mis_en_cause"] || "N/C";
    misEnCauseCell.textContent = misEnCause;
    misEnCauseCell.style.padding = "12px";
    row.appendChild(misEnCauseCell);

    tableBody.appendChild(row);
  });
}

// Fonction pour mettre à jour les infos de pagination
function updatePaginationInfo(totalRecords) {
  const paginationInfo = document.getElementById('paginationInfo');
  if (!paginationInfo) {
    console.warn("L'élément paginationInfo n'existe pas.");
    return;
  }

  const totalPages = Math.ceil(totalRecords / itemsPerPage) || 1;
  paginationInfo.textContent = `Page ${currentPage} sur ${totalPages} | ${totalRecords} affaire(s)`;

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

  if (!filterEtat || !filterEcole) {
    console.warn("Les éléments filterEtat ou filterEcole n'existent pas.");
    return;
  }

  // Récupérer les valeurs uniques pour chaque filtre
  const etats = [...new Set(affairesData.map(r => r.Etat || r.etat || r['État'] || "N/C"))].filter(e => e !== "N/C");
  const ecoles = [...new Set(affairesData.map(r => r.Ecole || r.ecole || r['École'] || "N/C"))].filter(e => e !== "N/C");

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
      this.textContent = sortDirection === 1 ? '↓' : '↑';

      applyFilters(); // Re-appliquer les filtres avec le nouveau tri
    });
  });

  // Appliquer les filtres initiaux
  applyFilters();
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
