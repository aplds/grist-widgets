// Initialisation de l'API Grist
grist.ready({
    requiredAccess: 'read table',
    optionalAccess: ['full']
});

// Après l'initialisation de l'API Grist
grist.ready({
    requiredAccess: 'read table',
    optionalAccess: ['full']
});

// Charger explicitement la table "Affaires"
grist.docApi.fetchTable('Affaires').then(function(table) {
    affairesData = table;
    isDataLoaded = true;
    console.log("Affaires chargées via fetchTable :", affairesData);
}).catch(function(error) {
    console.error("Erreur lors du chargement de la table Affaires :", error);
});

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
let isDataLoaded = false;

// Écouteur pour les enregistrements des tables
grist.onRecords(function(table) {
    try {
        console.log(`Table reçue : ${table.name}, Nombre d'enregistrements : ${table.records.length}`);

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

        // Marquer les données comme prêtes si la table "Affaires" est chargée
        if (table.name === "Affaires" && table.records.length > 0) {
            isDataLoaded = true;
            console.log("Données prêtes !");
        }
    } catch (error) {
        console.error("Erreur lors du traitement des enregistrements :", error);
    }
});

// Fonction pour vérifier si les données sont prêtes
function checkDataReady(callback) {
    if (isDataLoaded) {
        callback();
    } else {
        console.log("Données non encore prêtes, réessai dans 200ms...");
        setTimeout(() => checkDataReady(callback), 200);
    }
}

// Fonction pour récupérer une affaire par son ID
function getAffaireById(id) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return null;
    }
    return affairesData.find(affaire => affaire.id === id);
}

// Fonction pour récupérer les parties d'une affaire
function getPartiesByAffaireId(affaireId) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return partiesData.filter(partie => partie.Affaire === affaireId);
}

// Fonction pour récupérer les membres d'une affaire
function getMembresByAffaireId(affaireId) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    const affaire = getAffaireById(affaireId);
    if (!affaire || !affaire.Membres_convoques) return [];
    const membresIds = affaire.Membres_convoques;
    return membresData.filter(membre => membresIds.includes(membre.id));
}

// Fonction pour récupérer les audiences d'une affaire
function getAudiencesByAffaireId(affaireId) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return audiencesData.filter(audience => audience.Affaire === affaireId);
}

// Fonction pour récupérer les rôles d'une école
function getRolesByEcoleId(ecoleId) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return rolesData.filter(role => role.Ecole === ecoleId);
}

// Fonction pour récupérer les observateurs d'une école
function getObservateursByEcoleId(ecoleId) {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return observateursData.filter(observateur => observateur.Structure === ecoleId);
}

// Fonction pour récupérer les écoles
function getEcoles() {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return ecolesData;
}

// Fonction pour récupérer les onglets
function getOnglets() {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return ongletsData;
}

// Fonction pour récupérer le rétroplanning
function getRetroplanning() {
    if (!isDataLoaded) {
        console.warn("Les données ne sont pas encore chargées !");
        return [];
    }
    return retroplanningData;
}
