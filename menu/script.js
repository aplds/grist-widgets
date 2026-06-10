grist.ready({
    requiredAccess: 'read table'
});

// Utilisez onRecord au lieu de onRecords pour cibler uniquement la ligne active
grist.onRecord(function(record) {
    // Remplir le titre avec la valeur de la colonne Menu de la ligne active
    const menuTitle = document.getElementById("menuTitle");
    if (record && record.Menu) {
        menuTitle.textContent = record.Menu;
    }

    // Effacer le contenu précédent du conteneur des boutons
    const menuContainer = document.getElementById("menuContainer");
    menuContainer.innerHTML = '';

    // Vérifier que les colonnes Lien et Titre existent et ne sont pas vides
    if (record && record.Lien && record.Titre) {
        const liens = Array.isArray(record.Lien) ? record.Lien : [record.Lien];
        const titres = Array.isArray(record.Titre) ? record.Titre : [record.Titre];

        // Créer un bouton pour chaque paire Lien/Titre
        for (let i = 0; i < Math.max(liens.length, titres.length); i++) {
            const lien = liens[i] ? liens[i] + (liens[i].includes("?") ? "&style=singlePage" : "?style=singlePage") : "#";
            const titre = titres[i] || "Lien sans titre";

            const button = document.createElement("button");
            button.textContent = titre;
            button.style.margin = "0 8px 8px 0";
            button.style.padding = "12px 24px";
            button.style.backgroundColor = "#000091";
            button.style.color = "#ffffff";
            button.style.border = "none";
            button.style.borderRadius = "4px";
            button.style.fontFamily = "Marianne, Arial, sans-serif";
            button.style.fontSize = "16px";
            button.style.fontWeight = "500";
            button.style.cursor = "pointer";
            button.style.transition = "background-color 0.2s ease";

            // Effet de survol
            button.onmouseover = function() {
                this.style.backgroundColor = "#1e1e5e";
            };
            button.onmouseout = function() {
                this.style.backgroundColor = "#000091";
            };

            button.onclick = function() {
                window.open(lien, "_blank");
            };

            menuContainer.appendChild(button);
        }
    }
});
