// Initialisation de l'API Grist
let gristDoc;

async function initGrist() {
    gristDoc = await grist.ready();
    loadAffaires();
}

// Charger la liste des affaires
async function loadAffaires() {
    const affairesTable = gristDoc.getTable("Affaires");
    const affaires = await affairesTable.fetchAll();

    const affairesListElement = document.getElementById("affaires-list");
    affairesListElement.innerHTML = "";

    affaires.forEach(affaire => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${affaire.Mis_en_cause || ""}</td>
            <td>${affaire.Ecole?.Nom_de_l_ecole || ""}</td>
            <td>${affaire.Etat || ""}</td>
            <td>${affaire.Date ? new Date(affaire.Date).toLocaleDateString("fr-FR") : ""}</td>
            <td>
                <button class="fr-btn" onclick="openAffaire('${affaire.id}')">Ouvrir</button>
            </td>
        `;
        affairesListElement.appendChild(row);
    });
}

// Ouvrir une affaire
function openAffaire(affaireId) {
    window.location.href = `affaire.html?id=${affaireId}`;
}

// Rechercher une affaire
document.getElementById("search-button").addEventListener("click", async () => {
    const searchTerm = document.getElementById("search-input").value.toLowerCase();
    const affairesTable = gristDoc.getTable("Affaires");
    const affaires = await affairesTable.fetchAll();

    const filteredAffaires = affaires.filter(affaire =>
        (affaire.Mis_en_cause && affaire.Mis_en_cause.toLowerCase().includes(searchTerm)) ||
        (affaire.Ecole?.Nom_de_l_ecole && affaire.Ecole.Nom_de_l_ecole.toLowerCase().includes(searchTerm)) ||
        (affaire.Etat && affaire.Etat.toLowerCase().includes(searchTerm))
    );

    const affairesListElement = document.getElementById("affaires-list");
    affairesListElement.innerHTML = "";

    filteredAffaires.forEach(affaire => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${affaire.Mis_en_cause || ""}</td>
            <td>${affaire.Ecole?.Nom_de_l_ecole || ""}</td>
            <td>${affaire.Etat || ""}</td>
            <td>${affaire.Date ? new Date(affaire.Date).toLocaleDateString("fr-FR") : ""}</td>
            <td>
                <button class="fr-btn" onclick="openAffaire('${affaire.id}')">Ouvrir</button>
            </td>
        `;
        affairesListElement.appendChild(row);
    });
});

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", initGrist);
