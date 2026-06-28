/**
 * Module pour la page d'accueil (liste des affaires)
 */

// Chargement de la page d'accueil
async function loadHomePage() {
    const contentElement = document.getElementById('app-content');

    try {
        // Récupération des affaires
        const affairs = await GristAPI.fetchTable('Affaires');
        renderAffairsTable(affairs);
    } catch (error) {
        showError(`Erreur lors du chargement des affaires: ${error.message}`);
    }

    /**
     * Affiche le tableau des affaires
     * @param {Array} affairs - Liste des affaires
     */
    function renderAffairsTable(affairs) {
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

/**
 * Charge les détails d'une affaire
 * @param {number} affairId - ID de l'affaire
 */
async function loadAffairDetail(affairId) {
    const contentElement = document.getElementById('app-content');

    try {
        // Récupération des détails de l'affaire
        const affair = await GristAPI.fetchRecord('Affaires', affairId);

        // Récupération des membres liés
        const members = await GristAPI.fetchRelatedRecords('Affaires_Membres', 'AffaireId', affairId);
        const membersDetails = await Promise.all(
            members.map(async (am) => {
                const member = await GristAPI.fetchRecord('Membres', am.MembreId);
                return { ...member, Role: am.Role };
            })
        );

        renderAffairDetail(affair, membersDetails);
    } catch (error) {
        showError(`Erreur lors du chargement de l'affaire: ${error.message}`);
    }

    /**
     * Affiche les détails d'une affaire
     * @param {Object} affair - Détails de l'affaire
     * @param {Array} members - Membres liés
     */
    function renderAffairDetail(affair, members) {
        contentElement.innerHTML = `
            <div class="fr-grid-row">
                <div class="fr-col-12">
                    <div class="fr-card">
                        <div class="fr-card__body">
                            <div class="fr-card__content">
                                <h3 class="fr-card__title">
                                    Affaire #${affair.id}
                                    <span class="fr-badge fr-badge--sm ${getBadgeClass(affair.Etat)} fr-ml-1w">
                                        ${escapeHtml(affair.Etat)}
                                    </span>
                                </h3>
                                <p class="fr-card__desc">${escapeHtml(affair.Titre || 'Sans titre')}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="fr-tabs">
                <ul class="fr-tabs__list" role="tablist" aria-label="Onglets de détails">
                    <li role="presentation">
                        <button class="fr-tabs__tab" id="tab-details" tabindex="0" role="tab" aria-selected="true">
                            Détails
                        </button>
                    </li>
                    <li role="presentation">
                        <button class="fr-tabs__tab" id="tab-members" tabindex="-1" role="tab" aria-selected="false">
                            Membres (${members.length})
                        </button>
                    </li>
                </ul>

                <div id="tab-details-panel" class="fr-tabs__panel fr-tabs__panel--selected" role="tabpanel" aria-labelledby="tab-details">
                    ${renderDetailsTab(affair)}
                </div>

                <div id="tab-members-panel" class="fr-tabs__panel" role="tabpanel" aria-labelledby="tab-members">
                    ${renderMembersTab(members)}
                </div>
            </div>

            <div class="fr-grid-row fr-mt-2w">
                <div class="fr-col-12">
                    <button class="fr-btn fr-btn--secondary" onclick="loadPage('home')">
                        Retour à la liste
                    </button>
                </div>
            </div>
        `;

        // Initialisation des onglets DSFR
        if (window.dsfr) {
            window.dsfr(document.querySelector('.fr-tabs')).tabs().init();
        }
    }

    /**
     * Affiche l'onglet des détails
     * @param {Object} affair - Détails de l'affaire
     * @returns {string} - HTML
     */
    function renderDetailsTab(affair) {
        return `
            <div class="fr-grid-row">
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="affair-title">Titre</label>
                        <input class="fr-input" type="text" id="affair-title"
                               value="${escapeHtml(affair.Titre || '')}" readonly>
                    </div>
                </div>
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="affair-status">État</label>
                        <input class="fr-input" type="text" id="affair-status"
                               value="${escapeHtml(affair.Etat || '')}" readonly>
                    </div>
                </div>
            </div>

            <div class="fr-grid-row">
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="affair-accused">Mis en cause</label>
                        <input class="fr-input" type="text" id="affair-accused"
                               value="${escapeHtml(affair.Mis_en_cause || '')}" readonly>
                    </div>
                </div>
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="affair-school">École</label>
                        <input class="fr-input" type="text" id="affair-school"
                               value="${escapeHtml(affair.Ecole || '')}" readonly>
                    </div>
                </div>
            </div>

            <div class="fr-grid-row">
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="affair-date">Date</label>
                        <input class="fr-input" type="text" id="affair-date"
                               value="${formatFrenchDate(affair.Date_etat)}" readonly>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Affiche l'onglet des membres
     * @param {Array} members - Liste des membres
     * @returns {string} - HTML
     */
    function renderMembersTab(members) {
        if (members.length === 0) {
            return `
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Aucun membre associé</h3>
                    <p class="fr-callout__text">Cette affaire n'a actuellement aucun membre associé.</p>
                </div>
            `;
        }

        return `
            <div class="fr-table fr-table--layout-fixed fr-mb-2w">
                <table>
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => `
                            <tr>
                                <td>${escapeHtml(member.Nom || 'Non spécifié')}</td>
                                <td>${escapeHtml(member.Email || 'Non spécifié')}</td>
                                <td>${escapeHtml(member.Role || 'Non spécifié')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
}
