/**
 * Module principal de l'application
 */

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', () => {
    // Initialisation du DSFR
    if (window.dsfr) {
        window.dsfr.start();
    }

    // Configuration de la navigation
    setupNavigation();

    // Chargement de la page par défaut
    loadPage('home');
});

/**
 * Configure la navigation
 */
function setupNavigation() {
    document.querySelectorAll('.fr-nav__link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Mise à jour de l'état actif
            document.querySelectorAll('.fr-nav__link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            // Chargement de la page
            const page = link.getAttribute('data-page');
            loadPage(page);
        });
    });
}

/**
 * Charge une page spécifique
 * @param {string} page - Nom de la page à charger
 */
function loadPage(page) {
    const contentElement = document.getElementById('app-content');
    contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12">
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Chargement en cours...</h3>
                </div>
            </div>
        </div>
    `;

    // Chargement asynchrone de la page
    setTimeout(() => {
        switch(page) {
            case 'home':
                if (typeof loadHomePage === 'function') {
                    loadHomePage();
                }
                break;
            case 'members':
                loadMembersPage();
                break;
            case 'hearings':
                loadHearingsPage();
                break;
            case 'templates':
                loadTemplatesPage();
                break;
            default:
                contentElement.innerHTML = `
                    <div class="fr-grid-row fr-grid-row--center">
                        <div class="fr-col-12">
                            <div class="fr-callout fr-callout--error">
                                <h3 class="fr-callout__title">Page non trouvée</h3>
                                <p class="fr-callout__text">La page demandée n'existe pas.</p>
                            </div>
                        </div>
                    </div>
                `;
        }
    }, 100);
}

// [Le reste du fichier main.js reste inchangé]
