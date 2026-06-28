// Chargement des affaires depuis Grist
async function loadAffairs() {
    try {
        const affairs = await gristApi.fetchAffairs();
        renderAffairsTable(affairs);
    } catch (error) {
        console.error("Erreur lors du chargement des affaires :", error);
    }
}

// Affichage du tableau des affaires
function renderAffairsTable(affairs) {
    const tableContainer = document.getElementById("main-content");
    tableContainer.innerHTML = `
        <div class="fr-table__wrapper">
            <table class="fr-table">
                <thead>
                    <tr>
                        <th>Mis en cause</th>
                        <th>École</th>
                        <th>État</th>
                        <th>Date de l'état</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${affairs.map(affair => `
                        <tr>
                            <td>${affair.accused}</td>
                            <td>${affair.school}</td>
                            <td><span class="fr-badge fr-badge--${getBadgeClass(affair.status)}">${affair.status}</span></td>
                            <td>${formatFrenchDate(affair.statusDate)}</td>
                            <td>
                                <button class="fr-btn fr-btn--secondary fr-btn--sm" data-id="${affair.id}">Ouvrir</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Ajout des événements pour ouvrir une affaire
    document.querySelectorAll("[data-id]").forEach(button => {
        button.addEventListener("click", (e) => {
            const affairId = e.target.getAttribute("data-id");
            loadAffairDetail(affairId);
        });
    });
}

// Fonction utilitaire pour le style des badges
function getBadgeClass(status) {
    const classes = {
        "Pré-enregistrée": "info",
        "En instruction": "warning",
        "Clôturée": "success"
    };
    return classes[status] || "default";
}

// Formatage des dates en français
function formatFrenchDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('fr-FR', options);
}

// Chargement initial
document.addEventListener("DOMContentLoaded", () => {
    loadAffairs();
});
