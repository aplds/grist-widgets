// Chargement dynamique des vues
async function loadView(viewName) {
    const response = await fetch(`views/${viewName}.html`);
    const html = await response.text();
    document.getElementById('main-content').innerHTML = html;

    // Initialisation spécifique à la vue
    if (viewName === "affaires") {
        initAffairesView();
    } else if (viewName === "details-affaire") {
        initDetailsAffaireView();
    } else if (viewName === "audiences") {
        initAudiencesView();
    } else if (viewName === "membres") {
        initMembresView();
    } else if (viewName === "modeles") {
        initModelesView();
    }
}

// Initialisation de la vue principale (affaires)
function initAffairesView() {
    const affairesList = document.getElementById('affaires-list');
    affairesList.innerHTML = affairesData
        .map(affaire => `
            <div class="fr-card fr-enlarge-link fr-mb-3w">
                <div class="fr-card__body">
                    <h5 class="fr-card__title">
                        <a href="#" data-affaire-id="${affaire.id}">${affaire.nom}</a>
                    </h5>
                    <p class="fr-card__desc">${affaire.description}</p>
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
    if (!affaire) return;

    document.getElementById('affaire-nom').textContent = affaire.nom;
    document.getElementById('affaire-description').textContent = affaire.description;
    // Ajoutez ici la logique pour afficher les membres, courriers, décisions, etc.
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
