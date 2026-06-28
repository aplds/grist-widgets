/**
 * Fonctions pour gérer les affaires
 */

// Fonction pour obtenir la date d'une affaire
function getAffaireDate(affaire) {
    const possibleDateFields = ["Date de l état", "Date_de_l_etat", "dateEtat", "Date", "date", "dateStatut"];
    for (const field of possibleDateFields) {
        if (affaire[field]) {
            try {
                return new Date(affaire[field]);
            } catch (e) {
                return null;
            }
        }
    }
    return null;
}

// Fonction pour obtenir l'ID de la ligne
function getRowId(record) {
    if (record.id) return record.id;
    if (record.$id) return record.$id;
    if (record._grist_rowId) return record._grist_rowId;
    return window.affairesData.allRecords.indexOf(record);
}

// Fonction pour appliquer les filtres et la recherche
function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filterEtat = document.getElementById('filterEtat').value;
    const filterEcole = document.getElementById('filterEcole').value;

    window.affairesData.filteredRecords = window.affairesData.allRecords.filter(record => {
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
    applySort();

    // Réinitialiser à la première page après filtrage
    window.affairesData.currentPage = 1;
    renderTable();
    updatePaginationInfo();
}

// Fonction pour appliquer le tri
function applySort() {
    if (!window.affairesData.sortColumn) {
        // Tri par défaut par date (du plus récent au plus ancien)
        window.affairesData.filteredRecords.sort((a, b) => {
            const dateA = getAffaireDate(a);
            const dateB = getAffaireDate(b);
            if (!dateA && !dateB) return 0;
            if (!dateA) return 1;
            if (!dateB) return -1;
            return dateB - dateA;
        });
        return;
    }

    window.affairesData.filteredRecords.sort((a, b) => {
        let valueA, valueB;

        // Récupérer les valeurs selon la colonne de tri
        switch(window.affairesData.sortColumn) {
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
            return window.affairesData.sortDirection * (valueA - valueB);
        } else if (typeof valueA === 'string' && typeof valueB === 'string') {
            return window.affairesData.sortDirection * valueA.localeCompare(valueB);
        } else if (typeof valueA === 'number' && typeof valueB === 'number') {
            return window.affairesData.sortDirection * (valueA - valueB);
        } else {
            // Conversion en string pour comparaison
            return window.affairesData.sortDirection * String(valueA).localeCompare(String(valueB));
        }
    });
}

// Fonction pour afficher le tableau avec pagination
function renderTable() {
    const tableBody = document.getElementById('affairesTableBody');
    tableBody.innerHTML = '';

    if (window.affairesData.filteredRecords.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Aucune affaire trouvée</td></tr>';
        return;
    }

    // Calculer les indices de début et fin pour la page actuelle
    const startIndex = (window.affairesData.currentPage - 1) * window.affairesData.itemsPerPage;
    const endIndex = Math.min(startIndex + window.affairesData.itemsPerPage, window.affairesData.filteredRecords.length);
    const pageRecords = window.affairesData.filteredRecords.slice(startIndex, endIndex);

    // Afficher les enregistrements de la page actuelle
    pageRecords.forEach(function(record, index) {
        const row = document.createElement('tr');
        row.style.cursor = "pointer";

        // Obtenir l'ID de la ligne pour l'ancre
        const rowId = getRowId(record);

        // Ajouter l'événement de clic pour la redirection
        row.addEventListener('click', function() {
            // Remplacez cette URL par celle de votre document Grist
            const url = `https://grist.numerique.gouv.fr/o/ia-daj/bM2zpoDmek3E/Sections-disciplinaires/p/30?style=singlePage&#a1.s117.r${rowId}.c19`;
            window.open(url, '_blank');
        });

        // Numéro (en gras)
        const numeroCell = document.createElement('td');
        numeroCell.textContent = record.Numero || record.numero || record['Numéro'] || record.numAffaire || "N/C";
        numeroCell.style.fontWeight = "bold";
        row.appendChild(numeroCell);

        // État (avec surlignage selon la valeur)
        const etatCell = document.createElement('td');
        const etat = record.Etat || record.etat || record['État'] || record.statut || "N/C";

        // Créer un span pour le surlignage
        const etatSpan = document.createElement('span');
        etatSpan.textContent = etat;
        etatSpan.className = 'etat-badge';
        etatSpan.style.padding = "4px 8px";
        etatSpan.style.borderRadius = "4px";

        // Appliquer le style selon l'état
        if (window.etatColors[etat]) {
            etatSpan.style.backgroundColor = window.etatColors[etat].background;
            etatSpan.style.color = window.etatColors[etat].color;
        }

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
        row.appendChild(dateCell);

        // École
        const ecoleCell = document.createElement('td');
        ecoleCell.textContent = record.Ecole || record.ecole || record['École'] || "N/C";
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
        row.appendChild(misEnCauseCell);

        tableBody.appendChild(row);
    });
}

// Fonction pour mettre à jour les infos de pagination
function updatePaginationInfo() {
    const paginationInfo = document.getElementById('paginationInfo');
    const totalPages = Math.ceil(window.affairesData.filteredRecords.length / window.affairesData.itemsPerPage) || 1;

    paginationInfo.textContent = `Page ${window.affairesData.currentPage} sur ${totalPages} | ${window.affairesData.filteredRecords.length} affaire(s)`;

    // Désactiver les boutons si nécessaire
    document.getElementById('prevPage').disabled = window.affairesData.currentPage <= 1;
    document.getElementById('nextPage').disabled = window.affairesData.currentPage >= totalPages || totalPages === 0;
}

// Fonction pour remplir les filtres
function populateFilters() {
    // Récupérer les valeurs uniques pour chaque filtre
    const etats = [...new Set(window.affairesData.allRecords.map(r => r.Etat || r.etat || r['État'] || r.statut || "N/C"))].filter(e => e !== "N/C");
    const ecoles = [...new Set(window.affairesData.allRecords.map(r => r.Ecole || r.ecole || r['École'] || r.nomEcole || "N/C"))].filter(e => e !== "N/C");

    const filterEtat = document.getElementById('filterEtat');
    filterEtat.innerHTML = '<option value="">Tous les états</option>';
    etats.forEach(etat => {
        const option = document.createElement('option');
        option.value = etat;
        option.textContent = etat;
        filterEtat.appendChild(option);
    });

    const filterEcole = document.getElementById('filterEcole');
    filterEcole.innerHTML = '<option value="">Toutes les écoles</option>';
    ecoles.forEach(ecole => {
        const option = document.createElement('option');
        option.value = ecole;
        option.textContent = ecole;
        filterEcole.appendChild(option);
    });
}

// Écouteurs d'événements pour la pagination
document.getElementById('itemsPerPage').addEventListener('change', function() {
    window.affairesData.itemsPerPage = parseInt(this.value);
    window.affairesData.currentPage = 1;
    renderTable();
    updatePaginationInfo();
});

document.getElementById('prevPage').addEventListener('click', function() {
    if (window.affairesData.currentPage > 1) {
        window.affairesData.currentPage--;
        renderTable();
        updatePaginationInfo();
    }
});

document.getElementById('nextPage').addEventListener('click', function() {
    const totalPages = Math.ceil(window.affairesData.filteredRecords.length / window.affairesData.itemsPerPage);
    if (window.affairesData.currentPage < totalPages) {
        window.affairesData.currentPage++;
        renderTable();
        updatePaginationInfo();
    }
});

// Écouteurs d'événements pour les filtres
document.getElementById('searchInput').addEventListener('input', applyFilters);
document.getElementById('filterEtat').addEventListener('change', applyFilters);
document.getElementById('filterEcole').addEventListener('change', applyFilters);

// Écouteurs d'événements pour le tri
document.querySelectorAll('.sort-icon').forEach(icon => {
    icon.addEventListener('click', function() {
        const column = this.getAttribute('data-column');

        // Changer la direction de tri si on clique sur la même colonne
        if (window.affairesData.sortColumn === column) {
            window.affairesData.sortDirection *= -1; // Inverser la direction
        } else {
            window.affairesData.sortColumn = column;
            window.affairesData.sortDirection = 1; // Réinitialiser à ascendant
        }

        // Mettre à jour les icônes de tri
        document.querySelectorAll('.sort-icon').forEach(i => {
            i.textContent = '↕';
        });
        this.textContent = window.affairesData.sortDirection === 1 ? '↓' : '↑';

        applyFilters(); // Re-appliquer les filtres avec le nouveau tri
    });
});
