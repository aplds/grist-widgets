/**
 * Module pour la page d'accueil (liste des affaires)
 */

// Chargement de la page d'accueil
async function loadHomePage() {
    const contentElement = document.getElementById('app-content');

    try {
        // Vérification que l'API est disponible
        if (!window.GristAPI) {
            throw new Error("L'API Grist n'est pas initialisée");
        }

        // Récupération des affaires
        const affairs = await window.GristAPI.fetchTable('Affaires');

        if (!affairs || affairs.length === 0) {
            contentElement.innerHTML = `
                <div class="fr-grid-row fr-grid-row--center">
                    <div class="fr-col-12">
                        <div class="fr-callout fr-callout--info">
                            <h3 class="fr-callout__title">Aucune affaire trouvée</h3>
                            <p class="fr-callout__text">Il n'y a actuellement aucune affaire enregistrée.</p>
                        </div>
                    </div>
                </div>
            `;
            return;
        }

        renderAffairsTable(affairs);
    } catch (error) {
        showError(`Erreur lors du chargement des affaires: ${error.message}`);
        console.error("Détails de l'erreur:", error);
    }

    /**
     * Affiche le tableau des affaires
     * @param {Array} affairs - Liste des affaires
     */
    function renderAffairsTable(affairs) {
        contentElement.innerHTML = `
            <div class="fr-table fr-table--layout-fixed">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Mis en cause</th>
                            <th>École</th>
                            <th>État</th>
                            <th>Date</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${affairs.map(affair => `
                            <tr>
                                <td>${affair.id}</td>
                                <td>${escapeHtml(affair.Mis_en_cause || 'Non spécifié')}</td>
                                <td>${escapeHtml(affair.Ecole || 'Non spécifiée')}</td>
                                <td>
                                    <span class="fr-badge fr-badge--sm ${getBadgeClass(affair.Etat)}">
                                        ${escapeHtml(affair.Etat || 'Non spécifié')}
                                    </span>
                                </td>
                                <td>${formatFrenchDate(affair.Date_etat)}</td>
                                <td>
                                    <button class="fr-btn fr-btn--secondary fr-btn--sm"
                                            onclick="loadAffairDetail(${affair.id})">
                                        Ouvrir
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Retourne la classe DSFR pour un badge en fonction de l'état
     * @param {string} status - État de l'affaire
     * @returns {string} - Classe DSFR
     */
    function getBadgeClass(status) {
        const classes = {
            "Pré-enregistrée": "fr-badge--info",
            "En instruction": "fr-badge--warning",
            "Clôturée": "fr-badge--success",
            "Annulée": "fr-badge--error"
        };
        return classes[status] || "fr-badge--info";
    }
}
