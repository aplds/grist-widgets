/**
 * Module pour gérer l'affichage des affaires
 */

// Variable pour stocker les affaires
let affaires = [];

/**
 * Charge et affiche les affaires
 */
async function loadAffairesPage() {
    const container = document.getElementById('affaires-container');
    container.innerHTML = `
        <div class="fr-callout fr-callout--info">
            Chargement des affaires en cours...
        </div>
    `;

    try {
        // Récupérer les données initiales
        affaires = await window.GristAPI.fetchSelectedTable();
        renderAffaires();

        // Écouter les changements
        window.GristAPI.onRecordChange(updateAffaires);
        window.GristAPI.onTableChange(updateAffairesFromTable);
    } catch (error) {
        console.error("Erreur lors du chargement des affaires:", error);
        showError(`Impossible de charger les affaires: ${error.message}`);
    }
}

/**
 * Met à jour les affaires depuis un changement de record
 */
async function updateAffaires() {
    try {
        affaires = await window.GristAPI.fetchSelectedTable();
        renderAffaires();
    } catch (error) {
        console.error("Erreur lors de la mise à jour:", error);
        showError("Impossible de mettre à jour les affaires");
    }
}

/**
 * Met à jour les affaires depuis un changement de table
 * @param {Array} newAffaires - Nouvelles affaires
 */
function updateAffairesFromTable(newAffaires) {
    affaires = newAffaires;
    renderAffaires();
}

/**
 * Affiche les affaires dans le tableau
 */
function renderAffaires() {
    const container = document.getElementById('affaires-container');

    if (!affaires || affaires.length === 0) {
        container.innerHTML = `
            <div class="fr-callout fr-callout--info">
                <h3 class="fr-callout__title">Aucune affaire trouvée</h3>
                <p class="fr-callout__text">Il n'y a actuellement aucune affaire enregistrée.</p>
            </div>
        `;
        return;
    }

    // Afficher les données brutes pour débogage
    console.log("Affaires reçues:", affaires);

    // Vérifier la structure des données
    const sample = affaires[0];
    const columns = Object.keys(sample || {});

    container.innerHTML = `
        <div class="fr-table fr-table--layout-fixed">
            <table>
                <thead>
                    <tr>
                        ${columns.map(col => `<th>${col}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${affaires.map(affaire => `
                        <tr>
                            ${columns.map(col => {
                                const value = affaire[col];
                                if (col.toLowerCase().includes('date') && value) {
                                    try {
                                        return `<td>${formatFrenchDate(value)}</td>`;
                                    } catch {
                                        return `<td>${value}</td>`;
                                    }
                                }
                                if (col.toLowerCase().includes('etat') || col.toLowerCase().includes('statut')) {
                                    return `<td><span class="fr-badge fr-badge--sm ${getBadgeClass(value)}">${value}</span></td>`;
                                }
                                return `<td>${value || 'N/A'}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}
