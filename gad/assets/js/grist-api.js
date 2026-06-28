// Initialisation de l'API Grist
grist.ready({ requiredAccess: 'read table' });

// Données des tables
let affairesData = [];
let partiesData = [];
let membresData = [];
let audiencesData = [];
let retroplanningData = [];
let rolesData = [];
let ongletsData = [];
let observateursData = [];
let ecolesData = [];

// Écouteur pour les enregistrements des tables
grist.onRecords(function(table) {
    switch (table.name) {
        case "Affaires":
            affairesData = table.records;
            break;
        case "Parties":
            partiesData = table.records;
            break;
        case "Membres":
            membresData = table.records;
            break;
        case "Audiences":
            audiencesData = table.records;
            break;
        case "Retroplanning":
            retroplanningData = table.records;
            break;
        case "Role":
            rolesData = table.records;
            break;
        case "Onglets":
            ongletsData = table.records;
            break;
        case "Observateurs":
            observateursData = table.records;
            break;
        case "Ecoles":
            ecolesData = table.records;
            break;
    }
});

// Fonction pour récupérer une affaire par son ID
function getAffaireById(id) {
    return affairesData.find(affaire => affaire.id === id);
}

// Fonction pour récupérer les parties d'une affaire
function getPartiesByAffaireId(affaireId) {
    return partiesData.filter(partie => partie.Affaire === affaireId);
}

// Fonction pour récupérer les membres d'une affaire
function getMembresByAffaireId(affaireId) {
    const affaire = getAffaireById(affaireId);
    if (!affaire || !affaire.Membres_convoques) return [];
    const membresIds = affaire.Membres_convoques;
    return membresData.filter(membre => membresIds.includes(membre.id));
}

// Fonction pour récupérer les audiences d'une affaire
function getAudiencesByAffaireId(affaireId) {
    return audiencesData.filter(audience => audience.Affaire === affaireId);
}
