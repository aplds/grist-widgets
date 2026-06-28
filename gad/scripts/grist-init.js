/**
 * Initialisation de l'API Grist
 */

// Variables globales pour les affaires
window.affairesData = {
    allRecords: [],
    filteredRecords: [],
    currentPage: 1,
    itemsPerPage: 10,
    sortColumn: null,
    sortDirection: 1
};

// Mappage des couleurs pour les états
window.etatColors = {
    "Pré-enregistrée": { background: "#E1FEDE", color: "inherit" },
    "Enregistrée": { background: "#98FD90", color: "inherit" },
    "En instruction": { background: "#BC77FC", color: "inherit" },
    "En cours d'instruction": { background: "#BC77FC", color: "inherit" },
    "Audience": { background: "#FD79F4", color: "inherit" },
    "En délibéré": { background: "#FECC81", color: "inherit" },
    "Terminée": { background: "#126E0E", color: "white" },
    "Classé sans suite": { background: "#E00A17", color: "white" },
    "Procédure R.811-40": { background: "#FEF47A", color: "inherit" },
    "Clôturée": { background: "#126E0E", color: "white" }
};

// Initialisation de Grist
grist.ready({
    requiredAccess: 'read table'
});

// Écouteur pour les records
grist.onRecords(function(records) {
    window.affairesData.allRecords = records;
    window.populateFilters();
    window.applyFilters();
});
