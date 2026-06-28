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

// Initialisation de la vue principale (affaires)
function initAffairesView() {
    const affairesList = document.getElementById('affaires-list');

    if (!affairesData || affairesData.length === 0) {
        affairesList.innerHTML = "<p>Aucune affaire trouvée.</p>";
        return;
    }

    affairesList.innerHTML = affairesData
        .map(affaire => `
            <div class="fr-card fr-enlarge-link fr-mb-3w">
                <div class="fr-card__body">
                    <h5 class="fr-card__title">
                        <a href="#" data-affaire-id="${affaire.id}">${affaire.Numero || 'Sans numéro'}</a>
                    </h5>
                    <p class="fr-card__desc">${affaire.Description || 'Aucune description'}</p>
                </div>
            </div>
        `)
        .join('');

    // Gestion du clic sur une affaire
    document.querySelectorAll('[data-affaire-id]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const affaireId = e.target.getAttribute('data-affaire-id');
            localStorage.setItem('currentAffaireId', affaireId);
            loadView('details-affaire');
        });
    });
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
