// Attendre que Grist soit prêt
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialiser l'API Grist
        const gristDoc = await grist.ready();

        // Charger les affaires
        loadAffaires(gristDoc);

        // Gérer la recherche
        document.getElementById('search-button').addEventListener('click', () => {
            searchAffaires(gristDoc);
        });

        // Gérer la fermeture de la modale
        document.querySelector('.close').addEventListener('click', () => {
            document.getElementById('affaire-modal').style.display = 'none';
        });

        // Gérer les onglets
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                document.querySelectorAll('.tab-button').forEach(btn => {
                    btn.classList.remove('active');
                });
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                button.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    } catch (error) {
        console.error('Erreur lors de l\'initialisation de Grist :', error);
    }
});

// Charger les affaires
async function loadAffaires(gristDoc) {
    try {
        const affairesTable = gristDoc.getTable('Affaires');
        const affaires = await affairesTable.fetchAll();

        const tbody = document.querySelector('#affaires-list tbody');
        tbody.innerHTML = '';

        affaires.forEach(affaire => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${affaire.Mis_en_cause || ''}</td>
                <td>${affaire.Ecole?.Nom_de_l_ecole || ''}</td>
                <td>${affaire.Etat || ''}</td>
                <td>${affaire.Date ? new Date(affaire.Date).toLocaleDateString('fr-FR') : ''}</td>
                <td>
                    <button class="fr-btn" onclick="openAffaireModal('${affaire.id}')">Ouvrir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des affaires :', error);
    }
}

// Rechercher des affaires
async function searchAffaires(gristDoc) {
    try {
        const searchTerm = document.getElementById('search-input').value.toLowerCase();
        const affairesTable = gristDoc.getTable('Affaires');
        const affaires = await affairesTable.fetchAll();

        const filteredAffaires = affaires.filter(affaire =>
            (affaire.Mis_en_cause && affaire.Mis_en_cause.toLowerCase().includes(searchTerm)) ||
            (affaire.Ecole?.Nom_de_l_ecole && affaire.Ecole.Nom_de_l_ecole.toLowerCase().includes(searchTerm)) ||
            (affaire.Etat && affaire.Etat.toLowerCase().includes(searchTerm))
        );

        const tbody = document.querySelector('#affaires-list tbody');
        tbody.innerHTML = '';

        filteredAffaires.forEach(affaire => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${affaire.Mis_en_cause || ''}</td>
                <td>${affaire.Ecole?.Nom_de_l_ecole || ''}</td>
                <td>${affaire.Etat || ''}</td>
                <td>${affaire.Date ? new Date(affaire.Date).toLocaleDateString('fr-FR') : ''}</td>
                <td>
                    <button class="fr-btn" onclick="openAffaireModal('${affaire.id}')">Ouvrir</button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Erreur lors de la recherche des affaires :', error);
    }
}

// Ouvrir la modale pour une affaire
async function openAffaireModal(affaireId) {
    try {
        const gristDoc = await grist.ready();
        const affairesTable = gristDoc.getTable('Affaires');
        const affaire = await affairesTable.fetchOne(affaireId);

        const modal = document.getElementById('affaire-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalDetails = document.getElementById('modal-details');

        modalTitle.textContent = `Affaire #${affaire.Numero || ''}`;
        modalDetails.innerHTML = `
            <p><strong>Mis en cause :</strong> ${affaire.Mis_en_cause || ''}</p>
            <p><strong>École :</strong> ${affaire.Ecole?.Nom_de_l_ecole || ''}</p>
            <p><strong>État :</strong> ${affaire.Etat || ''}</p>
            <p><strong>Date :</strong> ${affaire.Date ? new Date(affaire.Date).toLocaleDateString('fr-FR') : ''}</p>
        `;

        // Charger les onglets
        await loadMembres(gristDoc, affaireId);
        await loadCourriers(gristDoc, affaireId);
        await loadJugements(gristDoc, affaireId);
        await loadRapports(gristDoc, affaireId);
        await loadDecisions(gristDoc, affaireId);

        modal.style.display = 'block';
    } catch (error) {
        console.error('Erreur lors de l\'ouverture de l\'affaire :', error);
    }
}

// Charger les membres d'une affaire
async function loadMembres(gristDoc, affaireId) {
    try {
        const membresTable = gristDoc.getTable('Membres');
        const membres = await membresTable.fetchAll({ filter: { Affaires: affaireId } });

        const membresTab = document.getElementById('membres-tab');
        membresTab.innerHTML = `
            <h3>Membres affectés</h3>
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
                            <td>${membre.Nom || ''}</td>
                            <td>${membre.Prenom || ''}</td>
                            <td>${membre.Role || ''}</td>
                            <td>
                                <button class="fr-btn" onclick="editMembre('${membre.id}')">Modifier</button>
                                <button class="fr-btn" onclick="removeMembre('${membre.id}')">Retirer</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (error) {
        console.error('Erreur lors du chargement des membres :', error);
    }
}

// Fonctions pour les autres onglets (exemple pour les courriers)
async function loadCourriers(gristDoc, affaireId) {
    const courriersTab = document.getElementById('courriers-tab');
    courriersTab.innerHTML = `
        <h3>Courriers</h3>
        <button class="fr-btn" onclick="addCourrier('${affaireId}')">Ajouter un courrier</button>
        <p>Liste des courriers liés à cette affaire...</p>
    `;
}

// Fonctions pour les autres onglets (exemple pour les jugements)
async function loadJugements(gristDoc, affaireId) {
    const jugementsTab = document.getElementById('jugements-tab');
    jugementsTab.innerHTML = `
        <h3>Jugements</h3>
        <button class="fr-btn" onclick="addJugement('${affaireId}')">Ajouter un jugement</button>
        <p>Liste des jugements liés à cette affaire...</p>
    `;
}

// Fonctions pour les autres onglets (exemple pour les rapports)
async function loadRapports(gristDoc, affaireId) {
    const rapportsTab = document.getElementById('rapports-tab');
    rapportsTab.innerHTML = `
        <h3>Rapports d'instruction</h3>
        <button class="fr-btn" onclick="addRapport('${affaireId}')">Ajouter un rapport</button>
        <p>Liste des rapports liés à cette affaire...</p>
    `;
}

// Fonctions pour les autres onglets (exemple pour les décisions)
async function loadDecisions(gristDoc, affaireId) {
    const decisionsTab = document.getElementById('decisions-tab');
    decisionsTab.innerHTML = `
        <h3>Décisions</h3>
        <button class="fr-btn" onclick="addDecision('${affaireId}')">Ajouter une décision</button>
        <p>Liste des décisions liées à cette affaire...</p>
    `;
}

// Fonctions pour ajouter/éditer/supprimer des membres (exemples)
function addMembre(affaireId) {
    alert(`Ajouter un membre à l'affaire ${affaireId}`);
}

function editMembre(membreId) {
    alert(`Éditer le membre avec l'ID : ${membreId}`);
}

function removeMembre(membreId) {
    alert(`Retirer le membre avec l'ID : ${membreId}`);
}

// Fonctions pour ajouter des courriers, jugements, rapports, décisions (exemples)
function addCourrier(affaireId) {
    alert(`Ajouter un courrier à l'affaire ${affaireId}`);
}

function addJugement(affaireId) {
    alert(`Ajouter un jugement à l'affaire ${affaireId}`);
}

function addRapport(affaireId) {
    alert(`Ajouter un rapport à l'affaire ${affaireId}`);
}

function addDecision(affaireId) {
    alert(`Ajouter une décision à l'affaire ${affaireId}`);
}
