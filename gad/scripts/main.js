/**
 * Module principal de l'application
 */

// Initialisation de l'application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialiser le DSFR
        if (window.dsfr) {
            window.dsfr.start();
        }

        // Initialiser l'API Grist
        const gristReady = await initGristAPI();

        if (!gristReady) {
            throw new Error("Impossible d'initialiser l'API Grist");
        }

        // Initialiser la navigation
        setupNavigation();

        // Charger la page par défaut
        loadPage('home');
    } catch (error) {
        console.error("Erreur d'initialisation:", error);
        showError(`Impossible d'initialiser l'application: ${error.message}`);
    }
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

    switch(page) {
        case 'home':
            loadAffairesPage();
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
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    const contentElement = document.getElementById('affaires-container') ||
                          document.getElementById('app-content');
    contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12">
                <div class="fr-callout fr-callout--error">
                    <h3 class="fr-callout__title">Erreur</h3>
                    <p class="fr-callout__text">${message}</p>
                </div>
            </div>
        </div>
    `;
    console.error(message);
}

/**
 * Formate une date en français
 * @param {string|Date} date - Date à formater
 * @returns {string} - Date formatée
 */
function formatFrenchDate(date) {
    if (!date) return 'Non spécifiée';

    try {
        const d = new Date(date);
        return d.toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch {
        return 'Date invalide';
    }
}

/**
 * Échappe les caractères HTML
 * @param {string} str - Chaîne à échapper
 * @returns {string} - Chaîne échappée
 */
function escapeHtml(str) {
    if (!str) return '';
    return str.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Retourne la classe DSFR pour un badge en fonction de l'état
 * @param {string} status - État de l'affaire
 * @returns {string} - Classe DSFR
 */
function getBadgeClass(status) {
    if (!status) return "fr-badge--info";

    const classes = {
        "pré-enregistrée": "fr-badge--info",
        "en instruction": "fr-badge--warning",
        "clôturée": "fr-badge--success",
        "annulée": "fr-badge--error"
    };

    return classes[status.toLowerCase()] || "fr-badge--info";
}
