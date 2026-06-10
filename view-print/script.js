// Configuration des colonnes attendues par le widget
const WIDGET_CONFIG = {
    columns: [
        { name: "Menu", type: "Text", required: true, label: "Titre du menu" },
        { name: "Lien", type: "TextList", required: true, label: "Liste des liens" },
        { name: "Titre", type: "TextList", required: true, label: "Liste des titres des boutons" }
    ],
    requiredAccess: 'read table'
};

// Fonction pour mettre à jour le widget
function updateWidget(record) {
    // Remplir le titre
    const menuTitle = document.getElementById("menuTitle");
    if (menuTitle && record && record.Menu) {
        menuTitle.textContent = record.Menu;
    }

    // Effacer et remplir les boutons
    const menuContainer = document.getElementById("menuContainer");
    if (menuContainer) {
        menuContainer.innerHTML = '';

        if (record && record.Lien && record.Titre) {
            const liens = Array.isArray(record.Lien) ? record.Lien : [record.Lien];
            const titres = Array.isArray(record.Titre) ? record.Titre : [record.Titre];

            for (let i = 0; i < Math.max(liens.length, titres.length); i++) {
                const lien = liens[i] ? liens[i] + (liens[i].includes("?") ? "&style=singlePage" : "?style=singlePage") : "#";
                const titre = titres[i] || "Lien sans titre";

                const button = document.createElement("button");
                button.textContent = titre;
                button.className = "menu-button";

                button.onclick = function() {
                    window.open(lien, "_blank");
                };

                menuContainer.appendChild(button);
            }
        }
    }
}

// Vérifie si l'API GRIST est disponible
if (typeof grist !== 'undefined') {
    // Mode GRIST : utilise l'API avec la configuration des colonnes
    grist.ready(WIDGET_CONFIG);

    grist.onRecord(function(record) {
        updateWidget(record);
    });
} else {
    // Mode GitHub Pages : utilise des données simulées
    document.addEventListener('DOMContentLoaded', function() {
        // Données simulées (à adapter selon vos besoins)
        const simulatedRecord = {
            Menu: "Menu Principal",
            Lien: [
                "https://www.example.com/accueil",
                "https://www.example.com/contact",
                "https://www.example.com/a-propos"
            ],
            Titre: [
                "Accueil",
                "Contact",
                "À propos"
            ]
        };
        updateWidget(simulatedRecord);
    });
}
