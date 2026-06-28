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

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    const contentElement = document.getElementById('app-content');
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
 * Ouvre une modale DSFR
 * @param {string} title - Titre de la modale
 * @param {string} content - Contenu HTML de la modale
 * @param {string} modalId - ID de la modale
 */
function openModal(title, content, modalId = 'app-modal') {
    // Fermeture des modales existantes
    closeModal();

    // Création de la modale
    const modal = document.createElement('div');
    modal.id = modalId;
    modal.className = 'fr-modal';
    modal.setAttribute('aria-labelledby', `${modalId}-title`);
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
        <div class="fr-container fr-container--fluid fr-container-md">
            <div class="fr-grid-row fr-grid-row--center">
                <div class="fr-col-md-8 fr-col-12">
                    <div class="fr-modal__body">
                        <div class="fr-modal__header">
                            <h1 id="${modalId}-title" class="fr-modal__title">
                                <span class="fr-fi-arrow-right-line fr-fi--lg" aria-hidden="true"></span>
                                ${title}
                            </h1>
                        </div>
                        <div class="fr-modal__content">
                            ${content}
                        </div>
                        <div class="fr-modal__footer">
                            <ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline-lg">
                                <li>
                                    <button class="fr-btn fr-btn--secondary" onclick="closeModal('${modalId}')">
                                        Fermer
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';

    // Initialisation du composant modal DSFR
    if (window.dsfr) {
        window.dsfr(modal).modal().init();
    }
}

/**
 * Ferme une modale
 * @param {string} modalId - ID de la modale à fermer
 */
function closeModal(modalId = 'app-modal') {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
    }
}

// Fonctions temporaires pour les autres pages
function loadMembersPage() {
    const contentElement = document.getElementById('app-content');
    contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12">
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Page Membres</h3>
                    <p class="fr-callout__text">Cette page sera implémentée prochainement.</p>
                </div>
            </div>
        </div>
    `;
}

function loadHearingsPage() {
    const contentElement = document.getElementById('app-content');
    contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12">
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Page Audiences</h3>
                    <p class="fr-callout__text">Cette page sera implémentée prochainement.</p>
                </div>
            </div>
        </div>
    `;
}

function loadTemplatesPage() {
    const contentElement = document.getElementById('app-content');
    contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12">
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Page Modèles</h3>
                    <p class="fr-callout__text">Cette page sera implémentée prochainement.</p>
                </div>
            </div>
        </div>
    `;
}
