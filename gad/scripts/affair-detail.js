// Chargement des détails d'une affaire
async function loadAffairDetail(affairId) {
    try {
        const affair = await gristApi.fetchAffairById(affairId);
        renderAffairDetail(affair);
    } catch (error) {
        console.error("Erreur lors du chargement de l'affaire :", error);
    }
}

// Affichage des détails d'une affaire
function renderAffairDetail(affair) {
    const content = document.getElementById("main-content");
    content.innerHTML = `
        <div class="fr-container">
            <div class="fr-grid-row fr-grid-row--gutters">
                <div class="fr-col-12">
                    <h1>${affair.title}</h1>
                    <div class="fr-badge fr-badge--${getBadgeClass(affair.status)}">${affair.status}</div>
                </div>
            </div>

            <!-- Onglets pour les différentes sections -->
            <div class="fr-tabs">
                <ul class="fr-tabs__list" role="tablist" aria-label="Sections de l'affaire">
                    <li role="presentation">
                        <button class="fr-tabs__tab" id="tab-details" tabindex="0" role="tab" aria-selected="true">Détails</button>
                    </li>
                    <li role="presentation">
                        <button class="fr-tabs__tab" id="tab-members" tabindex="-1" role="tab" aria-selected="false">Membres</button>
                    </li>
                    <li role="presentation">
                        <button class="fr-tabs__tab" id="tab-documents" tabindex="-1" role="tab" aria-selected="false">Documents</button>
                    </li>
                </ul>

                <!-- Contenu des onglets -->
                <div class="fr-tabs__panels">
                    <div class="fr-tabs__panel fr-tabs__panel--selected" id="panel-details" role="tabpanel" aria-labelledby="tab-details">
                        ${renderAffairDetails(affair)}
                    </div>
                    <div class="fr-tabs__panel" id="panel-members" role="tabpanel" aria-labelledby="tab-members">
                        ${renderAffairMembers(affair)}
                    </div>
                    <div class="fr-tabs__panel" id="panel-documents" role="tabpanel" aria-labelledby="tab-documents">
                        ${renderAffairDocuments(affair)}
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialisation des onglets
    initTabs();
}

// Rendu des détails de l'affaire
function renderAffairDetails(affair) {
    return `
        <form id="affair-form">
            <div class="fr-grid-row fr-grid-row--gutters">
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="title">Titre</label>
                        <input class="fr-input" type="text" id="title" value="${affair.title}">
                    </div>
                </div>
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="status">Statut</label>
                        <select class="fr-select" id="status">
                            <option value="Pré-enregistrée" ${affair.status === "Pré-enregistrée" ? "selected" : ""}>Pré-enregistrée</option>
                            <option value="En instruction" ${affair.status === "En instruction" ? "selected" : ""}>En instruction</option>
                            <option value="Clôturée" ${affair.status === "Clôturée" ? "selected" : ""}>Clôturée</option>
                        </select>
                    </div>
                </div>
            </div>
            <div class="fr-grid-row fr-grid-row--gutters">
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="accused">Mis en cause</label>
                        <input class="fr-input" type="text" id="accused" value="${affair.accused}">
                    </div>
                </div>
                <div class="fr-col-md-6">
                    <div class="fr-input-group">
                        <label class="fr-label" for="school">École</label>
                        <select class="fr-select" id="school">
                            ${affair.schools.map(school => `
                                <option value="${school.id}" ${affair.schoolId === school.id ? "selected" : ""}>${school.name}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
            </div>
            <button class="fr-btn" type="submit">Enregistrer</button>
        </form>
    `;
}

// Rendu des membres affectés à l'affaire
function renderAffairMembers(affair) {
    return `
        <div class="fr-table__wrapper">
            <table class="fr-table">
                <thead>
                    <tr>
                        <th>Nom</th>
                        <th>Rôle</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${affair.members.map(member => `
                        <tr>
                            <td>${member.name}</td>
                            <td>${member.role}</td>
                            <td>
                                <button class="fr-btn fr-btn--tertiary fr-btn--sm" data-id="${member.id}">Retirer</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        <button class="fr-btn fr-btn--secondary" id="add-member">Ajouter un membre</button>
    `;
}

// Rendu des documents liés à l'affaire
function renderAffairDocuments(affair) {
    return `
        <div class="fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-12">
                <h3>Courriers</h3>
                <button class="fr-btn fr-btn--secondary" data-type="letter">Nouveau courrier</button>
                <div class="fr-table__wrapper">
                    <table class="fr-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${affair.letters.map(letter => `
                                <tr>
                                    <td>${letter.type}</td>
                                    <td>${formatFrenchDate(letter.date)}</td>
                                    <td>
                                        <button class="fr-btn fr-btn--tertiary fr-btn--sm" data-id="${letter.id}">Éditer</button>
                                        <button class="fr-btn fr-btn--tertiary fr-btn--sm" data-id="${letter.id}">PDF</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="fr-grid-row fr-grid-row--gutters">
            <div class="fr-col-12">
                <h3>Jugements et Décisions</h3>
                <button class="fr-btn fr-btn--secondary" data-type="decision">Nouvelle décision</button>
                <div class="fr-table__wrapper">
                    <table class="fr-table">
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${affair.decisions.map(decision => `
                                <tr>
                                    <td>${decision.type}</td>
                                    <td>${formatFrenchDate(decision.date)}</td>
                                    <td>
                                        <button class="fr-btn fr-btn--tertiary fr-btn--sm" data-id="${decision.id}">Éditer</button>
                                        <button class="fr-btn fr-btn--tertiary fr-btn--sm" data-id="${decision.id}">PDF</button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// Initialisation des onglets
function initTabs() {
    const tabs = document.querySelectorAll('.fr-tabs__tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabId = e.target.id;
            const panelId = `panel-${tabId.replace('tab-', '')}`;

            // Masquer tous les panneaux
            document.querySelectorAll('.fr-tabs__panel').forEach(panel => {
                panel.classList.remove('fr-tabs__panel--selected');
                panel.setAttribute('aria-hidden', 'true');
            });

            // Désélectionner tous les onglets
            tabs.forEach(t => {
                t.setAttribute('aria-selected', 'false');
                t.setAttribute('tabindex', '-1');
            });

            // Afficher le panneau sélectionné
            document.getElementById(panelId).classList.add('fr-tabs__panel--selected');
            document.getElementById(panelId).setAttribute('aria-hidden', 'false');

            // Sélectionner l'onglet
            e.target.setAttribute('aria-selected', 'true');
            e.target.setAttribute('tabindex', '0');
        });
    });
}
