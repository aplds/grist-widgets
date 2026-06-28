// Initialisation de l'API Grist
grist.ready({ requiredAccess: 'read table' });

// Récupération des données depuis Grist
let affairesData = [];
let audiencesData = [];
let membresData = [];
let modelesData = [];

grist.onRecords(function(table) {
    if (table.name === "Affaires") {
        affairesData = table.records;
    } else if (table.name === "Audiences") {
        audiencesData = table.records;
    } else if (table.name === "Membres") {
        membresData = table.records;
    } else if (table.name === "Modeles") {
        modelesData = table.records;
    }
});

// Fonction pour récupérer une affaire par son ID
function getAffaireById(id) {
    return affairesData.find(affaire => affaire.id === id);
}

// Fonction pour mettre à jour une affaire
function updateAffaire(id, updates) {
    grist.docApi.applyUserActions([
        ["UpdateRecord", id, updates]
    ]);
}
