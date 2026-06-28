// Initialisation de l'API Grist
grist.ready({
  requiredAccess: 'read table',
  optionalAccess: ['full']
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

// Mappage des couleurs pour les états
const etatColors = {
  "Pré-enregistrée": { background: "#E1FEDE", color: "inherit" },
  "Enregistrée": { background: "#98FD90", color: "inherit" },
  "En cours d'instruction": { background: "#BC77FC", color: "inherit" },
  "Audience": { background: "#FD79F4", color: "inherit" },
  "En délibéré": { background: "#FECC81", color: "inherit" },
  "Terminée": { background: "#126E0E", color: "white" },
  "Classé sans suite": { background: "#E00A17", color: "white" },
  "Procédure R.811-40": { background: "#FEF47A", color: "inherit" },
};

// Écouteur pour les enregistrements des tables
grist.onRecords(function(table) {
  try {
    console.log(`Table reçue : ${table.name}`);

    if (!table || !table.records) {
      console.warn(`La table ${table ? table.name : 'inconnue'} ne contient pas de propriété "records".`);
      return;
    }

    if (!Array.isArray(table.records)) {
      console.warn(`La propriété "records" de la table ${table.name} n'est pas un tableau.`);
      return;
    }

    console.log(`Nombre d'enregistrements : ${table.records.length}`);

    switch (table.name) {
      case "Affaires":
        affairesData = Array.isArray(table.records) ? table.records : [];
        isDataLoaded = true;
        break;
      case "Parties":
        partiesData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Membres":
        membresData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Audiences":
        audiencesData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Retroplanning":
        retroplanningData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Role":
        rolesData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Onglets":
        ongletsData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Observateurs":
        observateursData = Array.isArray(table.records) ? table.records : [];
        break;
      case "Ecoles":
        ecolesData = Array.isArray(table.records) ? table.records : [];
        break;
    }

    console.log("Données prêtes !");
  } catch (error) {
    console.error("Erreur lors du traitement des enregistrements :", error);
  }
});

// Charger explicitement la table "Affaires"
function loadAffairesTable() {
  grist.docApi.fetchTable('Affaires')
    .then(function(table) {
      if (!table) {
        console.warn("La table 'Affaires' n'a pas pu être chargée.");
        affairesData = [];
        return;
      }

      if (!Array.isArray(table)) {
        console.warn("Les données de la table 'Affaires' ne sont pas un tableau.");
        affairesData = [];
      } else {
        affairesData = table;
      }
      isDataLoaded = true;
      console.log("Affaires chargées via fetchTable :", affairesData);
    })
    .catch(function(error) {
      console.error("Erreur lors du chargement de la table Affaires :", error);
      affairesData = [];
    });
}

// Vérifier si les données sont prêtes
function checkDataReady(callback) {
  if (isDataLoaded && Array.isArray(affairesData) && affairesData.length > 0) {
    callback();
  } else {
    console.log("Données non encore prêtes, réessai dans 200ms...");
    setTimeout(() => checkDataReady(callback), 200);
  }
}

// Fonction pour récupérer une affaire par son ID
function getAffaireById(id) {
  if (!Array.isArray(affairesData)) {
    console.warn("affairesData n'est pas un tableau.");
    return null;
  }
  return affairesData.find(affaire => affaire.id === id);
}

// Fonction pour récupérer les parties d'une affaire
function getPartiesByAffaireId(affaireId) {
  if (!Array.isArray(partiesData)) {
    console.warn("partiesData n'est pas un tableau.");
    return [];
  }
  return partiesData.filter(partie => partie.Affaire === affaireId);
}

// Fonction pour récupérer les membres d'une affaire
function getMembresByAffaireId(affaireId) {
  if (!Array.isArray(membresData) || !Array.isArray(affairesData)) {
    console.warn("membresData ou affairesData n'est pas un tableau.");
    return [];
  }
  const affaire = getAffaireById(affaireId);
  if (!affaire || !affaire.Membres_convoques) return [];
  const membresIds = affaire.Membres_convoques;
  return membresData.filter(membre => membresIds.includes(membre.id));
}

// Fonction pour récupérer les audiences d'une affaire
function getAudiencesByAffaireId(affaireId) {
  if (!Array.isArray(audiencesData)) {
    console.warn("audiencesData n'est pas un tableau.");
    return [];
  }
  return audiencesData.filter(audience => audience.Affaire === affaireId);
}

// Fonction pour obtenir la date d'une affaire
function getAffaireDate(affaire) {
  if (!affaire) return null;

  const possibleDateFields = ["Date de l état", "Date_de_l_etat", "dateEtat", "Date", "date", "dateStatut"];
  for (const field of possibleDateFields) {
    if (affaire[field]) {
      try {
        return new Date(affaire[field]);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

// Initialisation
grist.ready().then(loadAffairesTable);
