/**
 * Module pour la page d'accueil (liste des affaires)
 */
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
        if (!affairs.length) {
            contentElement.innerHTML = '<div class="info">Aucune affaire trouvée</div>';
            return;
        }

        contentElement.innerHTML = `
            <div class="table-container">
                <table class="data-table">
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
                                <td><span class="badge ${getBadgeClass(affair.Etat)}">${escapeHtml(affair.Etat || 'Non spécifié')}</span></td>
                                <td>${formatFrenchDate(affair.Date_etat)}</td>
                                <td>
                                    <button class="button secondary" onclick="loadAffairDetail(${affair.id})">Ouvrir</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Retourne la classe CSS pour un badge en fonction de l'état
     * @param {string} status - État de l'affaire
     * @returns {string} - Classe CSS
     */
    function getBadgeClass(status) {
        const classes = {
            "Pré-enregistrée": "info",
            "En instruction": "warning",
            "Clôturée": "success"
        };
        return classes[status] || "info";
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

        // Récupération des documents liés
        const letters = await GristAPI.fetchRelatedRecords('Courriers', 'AffaireId', affairId);
        const decisions = await GristAPI.fetchRelatedRecords('Decisions', 'AffaireId', affairId);

        renderAffairDetail(affair, membersDetails, letters, decisions);
    } catch (error) {
        showError(`Erreur lors du chargement de l'affaire: ${error.message}`);
    }

    /**
     * Affiche les détails d'une affaire
     * @param {Object} affair - Détails de l'affaire
     * @param {Array} members - Membres liés
     * @param {Array} letters - Courriers liés
     * @param {Array} decisions - Décisions liées
     */
    function renderAffairDetail(affair, members, letters, decisions) {
        contentElement.innerHTML = `
            <div class="affair-header">
                <div>
                    <h2>Affaire #${affair.id}</h2>
                    <span class="badge ${getBadgeClass(affair.Etat)}">${escapeHtml(affair.Etat)}</span>
                </div>
                <div class="affair-actions">
                    <button class="button secondary" onclick="loadPage('home')">Retour</button>
                </div>
            </div>

            <div class="tab-container">
                <div class="tab-buttons">
                    <button class="tab-button active" data-tab="details">Détails</button>
                    <button class="tab-button" data-tab="members">Membres (${members.length})</button>
                    <button class="tab-button" data-tab="documents">Documents (${letters.length + decisions.length})</button>
                </div>

                <div class="tab-content active" data-tab="details">
                    ${renderDetailsTab(affair)}
                </div>
                <div class="tab-content" data-tab="members">
                    ${renderMembersTab(members)}
                </div>
                <div class="tab-content" data-tab="documents">
                    ${renderDocumentsTab(letters, decisions)}
                </div>
            </div>
        `;

        // Initialisation des onglets
        initTabs();
    }

    /**
     * Affiche l'onglet des détails
     * @param {Object} affair - Détails de l'affaire
     * @returns {string} - HTML
     */
    function renderDetailsTab(affair) {
        return `
            <form class="affair-form">
                <div class="form-group">
                    <label class="form-label">Titre</label>
                    <input class="form-input" type="text" value="${escapeHtml(affair.Titre || '')}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Mis en cause</label>
                    <input class="form-input" type="text" value="${escapeHtml(affair.Mis_en_cause || '')}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">École</label>
                    <input class="form-input" type="text" value="${escapeHtml(affair.Ecole || '')}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">État</label>
                    <input class="form-input" type="text" value="${escapeHtml(affair.Etat || '')}" readonly>
                </div>
                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input class="form-input" type="text" value="${formatFrenchDate(affair.Date_etat)}" readonly>
                </div>
            </form>
        `;
    }

    /**
     * Affiche l'onglet des membres
     * @param {Array} members - Liste des membres
     * @returns {string} - HTML
     */
    function renderMembersTab(members) {
        return `
            <div class="members-actions">
                <button class="button secondary" onclick="openAddMemberModal(${affair.id})">Ajouter un membre</button>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Nom</th>
                            <th>Email</th>
                            <th>Rôle</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${members.map(member => `
                            <tr>
                                <td>${escapeHtml(member.Nom || 'Non spécifié')}</td>
                                <td>${escapeHtml(member.Email || 'Non spécifié')}</td>
                                <td>${escapeHtml(member.Role || 'Non spécifié')}</td>
                                <td>
                                    <button class="button secondary">Retirer</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    /**
     * Affiche l'onglet des documents
     * @param {Array} letters - Liste des courriers
     * @param {Array} decisions - Liste des décisions
     * @returns {string} - HTML
     */
    function renderDocumentsTab(letters, decisions) {
        return `
            <div class="documents-actions">
                <button class="button secondary" onclick="openAddDocumentModal(${affair.id}, 'letter')">Ajouter un courrier</button>
                <button class="button secondary" onclick="openAddDocumentModal(${affair.id}, 'decision')">Ajouter une décision</button>
            </div>

            <h3>Courriers (${letters.length})</h3>
            ${letters.length > 0 ? `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${letters.map(letter => `
                                <tr>
                                    <td>${escapeHtml(letter.Type || 'Non spécifié')}</td>
                                    <td>${formatFrenchDate(letter.Date)}</td>
                                    <td>
                                        <button class="button secondary">Voir</button>
                                        <button class="button secondary">PDF</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>Aucun courrier</p>'}

            <h3>Décisions (${decisions.length})</h3>
            ${decisions.length > 0 ? `
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${decisions.map(decision => `
                                <tr>
                                    <td>${escapeHtml(decision.Type || 'Non spécifié')}</td>
                                    <td>${formatFrenchDate(decision.Date)}</td>
                                    <td>
                                        <button class="button secondary">Voir</button>
                                        <button class="button secondary">PDF</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<p>Aucune décision</p>'}
        `;
    }

    /**
     * Initialise les onglets
     */
    function initTabs() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');

                // Désélectionne tous les boutons et contenus
                document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                // Sélectionne le bouton et le contenu actuel
                button.classList.add('active');
                document.querySelector(`.tab-content[data-tab="${tab}"]`).classList.add('active');
            });
        });
    }
}

/**
 * Ouvre la modale pour ajouter un membre à une affaire
 * @param {number} affairId - ID de l'affaire
 */
async function openAddMemberModal(affairId) {
    try {
        // Récupération des membres disponibles
        const allMembers = await GristAPI.fetchTable('Membres');
        const affairMembers = await GristAPI.fetchRelatedRecords('Affaires_Membres', 'AffaireId', affairId);

        const existingMemberIds = affairMembers.map(am => am.MembreId);
        const availableMembers = allMembers.filter(member => !existingMemberIds.includes(member.id));

        const content = `
            <form id="add-member-form">
                <input type="hidden" name="AffaireId" value="${affairId}">

                <div class="form-group">
                    <label class="form-label">Membre</label>
                    <select class="form-select" name="MembreId" required>
                        <option value="">Sélectionnez un membre</option>
                        ${availableMembers.map(member => `
                            <option value="${member.id}">${escapeHtml(member.Nom)} (${escapeHtml(member.Role)})</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Rôle dans l'affaire</label>
                    <select class="form-select" name="Role" required>
                        <option value="">Sélectionnez un rôle</option>
                        <option value="Président">Président</option>
                        <option value="Secrétaire">Secrétaire</option>
                        <option value="Membre">Membre</option>
                        <option value="Mis en cause">Mis en cause</option>
                        <option value="Témoin">Témoin</option>
                    </select>
                </div>

                <div class="modal-actions">
                    <button type="button" class="button secondary" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="button primary">Ajouter</button>
                </div>
            </form>
        `;

        openModal('Ajouter un membre à l\'affaire', content, 'add-member-modal');

        // Gestion du formulaire
        document.getElementById('add-member-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            try {
                await GristAPI.addRecord('Affaires_Membres', {
                    AffaireId: parseInt(data.AffaireId),
                    MembreId: parseInt(data.MembreId),
                    Role: data.Role
                });

                closeModal('add-member-modal');
                loadAffairDetail(parseInt(data.AffaireId));
            } catch (error) {
                alert(`Erreur lors de l'ajout: ${error.message}`);
                console.error('Erreur:', error);
            }
        });
    } catch (error) {
        showError(`Erreur lors du chargement des membres: ${error.message}`);
    }
}

/**
 * Ouvre la modale pour ajouter un document
 * @param {number} affairId - ID de l'affaire
 * @param {string} type - Type de document (letter/decision)
 */
async function openAddDocumentModal(affairId, type) {
    try {
        // Récupération des modèles disponibles
        const templates = await GristAPI.fetchTable('Trames_Contenu', {
            filter: { Type: type === 'letter' ? 'Convocation' : 'Décision' }
        });

        const content = `
            <form id="add-document-form">
                <input type="hidden" name="AffaireId" value="${affairId}">
                <input type="hidden" name="Type" value="${type}">

                <div class="form-group">
                    <label class="form-label">Modèle</label>
                    <select class="form-select" name="ModeleId" required>
                        <option value="">Sélectionnez un modèle</option>
                        ${templates.map(template => `
                            <option value="${template.id}">${escapeHtml(template.Titre)}</option>
                        `).join('')}
                    </select>
                </div>

                <div class="form-group">
                    <label class="form-label">Date</label>
                    <input class="form-input" type="date" name="Date" value="${new Date().toISOString().split('T')[0]}" required>
                </div>

                <div class="form-group">
                    <label class="form-label">Contenu</label>
                    <textarea class="form-textarea" name="Contenu" required></textarea>
                </div>

                <div class="modal-actions">
                    <button type="button" class="button secondary" onclick="closeModal()">Annuler</button>
                    <button type="submit" class="button primary">Enregistrer</button>
                </div>
            </form>
        `;

        openModal(`Ajouter un ${type === 'letter' ? 'courrier' : 'une décision'}`, content, 'add-document-modal');

        // Chargement du contenu du modèle sélectionné
        const form = document.getElementById('add-document-form');
        const modelSelect = form.querySelector('[name="ModeleId"]');
        const contentArea = form.querySelector('[name="Contenu"]');

        modelSelect.addEventListener('change', async () => {
            if (modelSelect.value) {
                const template = await GristAPI.fetchRecord('Trames_Contenu', parseInt(modelSelect.value));
                contentArea.value = template.Contenu || '';
            }
        });

        // Gestion du formulaire
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());

            try {
                const tableName = type === 'letter' ? 'Courriers' : 'Decisions';
                await GristAPI.addRecord(tableName, {
                    AffaireId: parseInt(data.AffaireId),
                    Type: type === 'letter' ? 'Convocation' : 'Décision',
                    Date: data.Date,
                    Contenu: data.Contenu,
                    ModeleId: parseInt(data.ModeleId)
                });

                closeModal('add-document-modal');
                loadAffairDetail(parseInt(data.AffaireId));
            } catch (error) {
                alert(`Erreur lors de l'ajout: ${error.message}`);
                console.error('Erreur:', error);
            }
        });
    } catch (error) {
        showError(`Erreur lors du chargement des modèles: ${error.message}`);
    }
}
