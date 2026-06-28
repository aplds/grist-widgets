/**
 * Module principal de l'application
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialisation
    initApp();
});

/**
 * Initialise l'application
 */
function initApp() {
    // Chargement de la page d'accueil par défaut
    loadPage('home');

    // Configuration des boutons de navigation
    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', () => {
            // Mise à jour de l'état actif
            document.querySelectorAll('.nav-button').forEach(b => b.classList.remove('active'));
            button.classList.add('active');

            // Chargement de la page
            const page = button.getAttribute('data-page');
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
    contentElement.innerHTML = '<div class="loading">Chargement en cours...</div>';

    switch(page) {
        case 'home':
            loadHomePage();
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
            contentElement.innerHTML = '<div class="error">Page non trouvée</div>';
    }
}

/**
 * Affiche un message d'erreur
 * @param {string} message - Message d'erreur
 */
function showError(message) {
    const contentElement = document.getElementById('app-content');
    contentElement.innerHTML = `<div class="error">${message}</div>`;
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
 * Ouvre une modale
 * @param {string} title - Titre de la modale
 * @param {string} content - Contenu HTML de la modale
 * @param {string} modalId - ID de la modale
 */
function openModal(title, content, modalId = 'app-modal') {
    // Fermeture des modales existantes
    closeModal();

    // Création de la modale
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = modalId;
    modal.innerHTML = `
        <div class="modal-content">
            <h2>${title}</h2>
            ${content}
        </div>
    `;

    document.body.appendChild(modal);

    // Ajout d'un bouton de fermeture
    const closeButton = document.createElement('button');
    closeButton.className = 'button secondary';
    closeButton.textContent = 'Fermer';
    closeButton.addEventListener('click', () => closeModal(modalId));

    const modalContent = modal.querySelector('.modal-content');
    modalContent.appendChild(closeButton);
}

/**
 * Ferme une modale
 * @param {string} modalId - ID de la modale à fermer
 */
function closeModal(modalId = 'app-modal') {
    const modal = document.getElementById(modalId);
    if (modal) modal.remove();
}
