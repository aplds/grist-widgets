/**
 * Solution finale fonctionnelle pour un widget Grist
 */

// Fonction principale qui s'exécute quand le DOM est chargé
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le DSFR
    if (window.dsfr) {
        window.dsfr.start();
    }

    // Fonction pour vérifier si Grist est disponible
    function checkGristAvailable() {
        return new Promise((resolve, reject) => {
            // Vérifier toutes les 100ms si grist est disponible
            const interval = setInterval(() => {
                if (typeof grist !== 'undefined' && grist.ready) {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);

            // Timeout après 5 secondes
            setTimeout(() => {
                clearInterval(interval);
                reject(new Error("Grist API non disponible"));
            }, 5000);
        });
    }

    // Fonction pour initialiser l'application
    async function initApp() {
        try {
            // Vérifier si nous sommes dans un widget Grist
            if (window.location.href.includes('grist.numerique.gouv.fr') ||
                window.location.href.includes('getgrist.com')) {

                // Attendre que Grist soit disponible
                await checkGristAvailable();

                // Initialiser l'API Grist
                grist.ready({
                    requiredAccess: 'read table'
                });

                // Écouter les changements de données
                grist.onRecords(function(records) {
                    renderAffaires(records);
                });

                // Charger les données initiales
                const records = await grist.docApi.fetchSelectedTable();
                renderAffaires(records);
            } else {
                // Mode démonstration pour GitHub Pages
                showDemoMode();
            }
        } catch (error) {
            console.error("Erreur d'initialisation:", error);
            showError(`Impossible d'initialiser l'application: ${error.message}`);
        }
    }

    // Fonction pour afficher les affaires
    function renderAffaires(records) {
        const container = document.getElementById('affaires-container');

        if (!records || records.length === 0) {
            container.innerHTML = `
                <div class="fr-callout fr-callout--info">
                    <h3 class="fr-callout__title">Aucune affaire trouvée</h3>
                    <p class="fr-callout__text">Il n'y a actuellement aucune affaire enregistrée.</p>
                </div>
            `;
            return;
        }

        // Afficher les données dans la console pour débogage
        console.log("Données reçues:", records);

        // Créer le tableau
        const headers = getTableHeaders(records);

        container.innerHTML = `
            <div class="fr-table fr-table--layout-fixed">
                <table>
                    <thead>
                        <tr>
                            ${headers.map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => `
                            <tr>
                                ${headers.map(header => {
                                    const value = record[header];
                                    if (header.toLowerCase().includes('date') && value) {
                                        try {
                                            return `<td>${new Date(value).toLocaleDateString('fr-FR')}</td>`;
                                        } catch {
                                            return `<td>${value}</td>`;
                                        }
                                    }
                                    if (header.toLowerCase().includes('etat') || header.toLowerCase().includes('statut')) {
                                        return `<td><span class="etat-badge" style="background: ${getEtatColor(value)}">${value}</span></td>`;
                                    }
                                    return `<td>${value || 'N/A'}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // Fonction pour obtenir les en-têtes du tableau
    function getTableHeaders(records) {
        if (!records || records.length === 0) return [];

        // Obtenir les clés du premier enregistrement
        return Object.keys(records[0]);
    }

    // Fonction pour obtenir la couleur d'un état
    function getEtatColor(etat) {
        const etatColors = {
            "Pré-enregistrée": "#E1FEDE",
            "Enregistrée": "#98FD90",
            "En instruction": "#BC77FC",
            "En cours d'instruction": "#BC77FC",
            "Audience": "#FD79F4",
            "En délibéré": "#FECC81",
            "Terminée": "#126E0E",
            "Classé sans suite": "#E00A17",
            "Procédure R.811-40": "#FEF47A",
            "Clôturée": "#126E0E"
        };

        return etatColors[etat] || "#f0f0f0";
    }

    // Fonction pour afficher un message d'erreur
    function showError(message) {
        const container = document.getElementById('affaires-container');
        container.innerHTML = `
            <div class="fr-callout fr-callout--error">
                <h3 class="fr-callout__title">Erreur</h3>
                <p class="fr-callout__text">${message}</p>
            </div>
        `;
    }

    // Fonction pour afficher le mode démonstration
    function showDemoMode() {
        const container = document.getElementById('affaires-container');
        container.innerHTML = `
            <div class="fr-callout fr-callout--warning">
                <h3 class="fr-callout__title">Mode démonstration</h3>
                <p class="fr-callout__text">Ce widget est conçu pour fonctionner dans Grist. Vous voyez actuellement des données d'exemple.</p>
            </div>
        `;

        // Afficher des données d'exemple
        const mockData = [
            {
                "Numéro": "2023-001",
                "État": "En instruction",
                "Date": "2023-05-15",
                "École": "Montpellier",
                "Mis en cause": "Jean Dupont"
            },
            {
                "Numéro": "2023-002",
                "État": "Clôturée",
                "Date": "2023-04-20",
                "École": "Rennes",
                "Mis en cause": "Marie Martin"
            },
            {
                "Numéro": "2023-003",
                "État": "Pré-enregistrée",
                "Date": "2023-06-01",
                "École": "Angers",
                "Mis en cause": "Pierre Durand"
            }
        ];

        renderAffaires(mockData);
    }

    // Démarrer l'application
    initApp();
});
