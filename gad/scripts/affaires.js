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

// Récupérer l'ID de l'affaire depuis l'URL
const urlParams = new URLSearchParams(window.location.search);
const affaireId = urlParams.get("id");

// Charger les détails de l'affaire
async function loadAffaireDetails() {
    const affairesTable = gristDoc.getTable("Affaires");
    const affaire = await affairesTable.fetchOne(affaireId);

    const detailsElement = document.getElementById("affaire-details");
    detailsElement.innerHTML = `
        <h1>Affaire #${affaire.Numero || ""}</h1>
        <div class="fr-affaire-details">
            <p><strong>Mis en cause :</strong> ${affaire.Mis_en_cause || ""}</p>
            <p><strong>École :</strong> ${affaire.Ecole?.Nom_de_l_ecole || ""}</p>
            <p><strong>État :</strong> ${affaire.Etat || ""}</p>
            <p><strong>Date :</strong> ${affaire.Date ? new Date(affaire.Date).toLocaleDateString("fr-FR") : ""}</p>
            <button class="fr-btn" onclick="editAffaire('${affaireId}')">Modifier les détails</button>
        </div>
    `;

    // Charger les onglets
    loadMembres(affaireId);
    loadCourriers(affaireId);
    loadJugements(affaireId);
    loadRapports(affaireId);
    loadDecisions(affaireId);
}

// Charger les membres de l'affaire
async function loadMembres(affaireId) {
    const membresTable = gristDoc.getTable("Membres");
    const membres = await membresTable.fetchAll({ filter: { Affaires: affaireId } });

    const membresPanel = document.getElementById("membres-panel");
    membresPanel.innerHTML = `
        <h2>Membres affectés</h2>
        <button class="fr-btn" onclick="addMembre('${affaireId}')">Ajouter un membre</button>
        <table class="fr-table">
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Rôle</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${membres.map(membre => `
                    <tr>
                        <td>${membre.Nom || ""}</td>
                        <td>${membre.Prenom || ""}</td>
                        <td>${membre.Role || ""}</td>
                        <td>
                            <button class="fr-btn" onclick="editMembre('${membre.id}')">Modifier</button>
                            <button class="fr-btn" onclick="removeMembre('${membre.id}')">Retirer</button>
                        </td>
                    </tr>
                `).join("")}
            </tbody>
        </table>
    `;
}

// Fonction pour ajouter un membre
function addMembre(affaireId) {
    alert(`Ajouter un membre à l'affaire ${affaireId}`);
}

// Fonction pour éditer un membre
function editMembre(membreId) {
    alert(`Éditer le membre avec l'ID : ${membreId}`);
}

// Fonction pour retirer un membre
function removeMembre(membreId) {
    alert(`Retirer le membre avec l'ID : ${membreId}`);
}

// Charger les courriers de l'affaire
async function loadCourriers(affaireId) {
    const courriersPanel = document.getElementById("courriers-panel");
    courriersPanel.innerHTML = `
        <h2>Courriers</h2>
        <button class="fr-btn" onclick="addCourrier('${affaireId}')">Ajouter un courrier</button>
        <p>Liste des courriers liés à cette affaire...</p>
    `;
}

// Charger les jugements de l'affaire
async function loadJugements(affaireId) {
    const jugementsPanel = document.getElementById("jugements-panel");
    jugementsPanel.innerHTML = `
        <h2>Jugements</h2>
        <button class="fr-btn" onclick="addJugement('${affaireId}')">Ajouter un jugement</button>
        <p>Liste des jugements liés à cette affaire...</p>
    `;
}

// Charger les rapports de l'affaire
async function loadRapports(affaireId) {
    const rapportsPanel = document.getElementById("rapports-panel");
    rapportsPanel.innerHTML = `
        <h2>Rapports d'instruction</h2>
        <button class="fr-btn" onclick="addRapport('${affaireId}')">Ajouter un rapport</button>
        <p>Liste des rapports liés à cette affaire...</p>
    `;
}

// Charger les décisions de l'affaire
async function loadDecisions(affaireId) {
    const decisionsPanel = document.getElementById("decisions-panel");
    decisionsPanel.innerHTML = `
        <h2>Décisions</h2>
        <button class="fr-btn" onclick="addDecision('${affaireId}')">Ajouter une décision</button>
        <p>Liste des décisions liées à cette affaire...</p>
    `;
}

// Fonction pour éditer une affaire
function editAffaire(affaireId) {
    alert(`Éditer l'affaire avec l'ID : ${affaireId}`);
}

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", async () => {
    await initGrist();
    loadAffaireDetails();
});

// Initialisation au chargement de la page
document.addEventListener("DOMContentLoaded", initGrist);
