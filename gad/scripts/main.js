// Routage simple pour charger les différentes pages
document.addEventListener("DOMContentLoaded", () => {
    // Chargement initial de la page d'accueil
    loadPage("home");

    // Gestion des liens de navigation
    document.querySelectorAll("[data-page]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            const page = e.target.getAttribute("data-page");
            loadPage(page);
        });
    });
});

// Chargement d'une page
function loadPage(page) {
    const content = document.getElementById("main-content");
    content.innerHTML = `<div class="fr-container fr-py-6w"><h2>Chargement en cours...</h2></div>`;

    switch (page) {
        case "home":
            loadAffairs();
            break;
        case "members":
            loadMembersPage();
            break;
        case "hearings":
            loadHearingsPage();
            break;
        case "templates":
            loadTemplatesPage();
            break;
        default:
            content.innerHTML = `<div class="fr-container fr-py-6w"><h2>Page non trouvée</h2></div>`;
    }
}

// Chargement de la page de gestion des membres
async function loadMembersPage() {
    try {
        const members = await gristApi.fetchMembers();
        renderMembersPage(members);
    } catch (error) {
        console.error("Erreur lors du chargement des membres :", error);
    }
}

// Chargement de la page de gestion des audiences
async function loadHearingsPage() {
    try {
        const hearings = await gristApi.fetchHearings();
        renderHearingsPage(hearings);
    } catch (error) {
        console.error("Erreur lors du chargement des audiences :", error);
    }
}

// Chargement de la page de gestion des modèles
async function loadTemplatesPage() {
    try {
        const templates = await gristApi.fetchTemplates();
        renderTemplatesPage(templates);
    } catch (error) {
        console.error("Erreur lors du chargement des modèles :", error);
    }
}
