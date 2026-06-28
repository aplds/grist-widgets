// Initialisation de l'API Grist
grist.ready({
  requiredAccess: 'read table',
});

// Données des tables
let affairesData = [];
let isDataLoaded = false;

// Écouteur pour les enregistrements des tables
grist.onRecords(function(table) {
  try {
    if (!table || !table.records) {
      console.warn(`La table ${table ? table.name : 'inconnue'} ne contient pas de propriété "records".`);
      return;
    }

    if (!Array.isArray(table.records)) {
      console.warn(`La propriété "records" de la table ${table.name} n'est pas un tableau.`);
      return;
    }

    console.log(`Table reçue : ${table.name}, Nombre d'enregistrements : ${table.records.length}`);

    if (table.name === "Affaires") {
      affairesData = table.records;
      isDataLoaded = true;
      console.log("Affaires chargées :", affairesData);
    }
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
  if (isDataLoaded && Array.isArray(affairesData)) {
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

// Initialisation
grist.ready().then(loadAffairesTable);

// Dans grist-api.js
affairesData = [
  { id: 1, Numero: "AFF-001", Etat: "En cours", École: "École A", "Mis en cause": "Jean Dupont" },
  { id: 2, Numero: "AFF-002", Etat: "Terminée", École: "École B", "Mis en cause": "Marie Martin" }
];
isDataLoaded = true;
