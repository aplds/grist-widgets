/**
 * Solution finale pour un widget Grist hébergé sur GitHub Pages
 */

// Attendre que le DOM soit chargé
document.addEventListener('DOMContentLoaded', function() {
    // Initialiser le DSFR
    if (window.dsfr) {
        window.dsfr.start();
    }

    // Fonction pour vérifier si nous sommes dans un widget Grist
    function isInGristWidget() {
        return typeof window !== 'undefined' &&
               (window.location.href.includes('grist.numerique.gouv.fr') ||
                window.location.href.includes('getgrist.com'));
    }

    // Fonction pour charger les données
    async function loadData() {
        const container = document.getElementById('affaires-container');

        try {
            if (isInGristWidget()) {
                // Dans un widget Grist, utiliser l'API Grist
                await initGristAPI();
            } else {
                // En développement ou sur GitHub Pages, utiliser des données mock
                container.innerHTML = `
                    <div class="fr-callout fr-callout--warning">
                        <h3 class="fr-callout__title">Mode démonstration</h3>
                        <p class="fr-callout__text">Ce widget est conçu pour fonctionner dans Grist. Vous voyez actuellement des données d'exemple.</p>
                    </div>
                `;
                renderMockData();
                return;
            }
        } catch (error) {
            console.error("Erreur d'initialisation:", error);
            container.innerHTML = `
                <div class="fr-callout fr-callout--error">
                    <h3 class="fr-callout__title">Erreur</h3>
                    <p class="fr-callout__text">Impossible de charger les données: ${error.message}</p>
                </div>
            `;
        }
    }

    // Initialisation de l'API Grist
    async function initGristAPI() {
        return new Promise((resolve, reject) => {
            // Vérifier si grist est disponible
            const checkGrist = setInterval(() => {
                if (typeof grist !== 'undefined') {
                    clearInterval(checkGrist);

                    try {
                        // Initialiser l'API Grist
                        grist.ready({
                            requiredAccess: 'read table'
                        });

                        // Écouter les changements de données
                        grist.onRecords(function(records) {
                            renderAffaires(records);
                        });

                        // Charger les données initiales
                        grist.docApi.fetchSelectedTable()
                            .then(records => {
                                renderAffaires(records);
                                resolve();
                            })
                            .catch(error => {
                                console.error("Erreur lors du chargement initial:", error);
                                reject(new Error("Impossible de charger les données initiales"));
                            });
                    } catch (error) {
                        console.error("Erreur d'initialisation Grist:", error);
                        reject(new Error("Impossible d'initialiser l'API Grist"));
                    }
                }
            }, 100);

            // Timeout après 10 secondes
            setTimeout(() => {
                clearInterval(checkGrist);
                reject(new Error("Timeout: l'API Grist n'est pas disponible"));
            }, 10000);
        });
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

        // Afficher les données brutes pour débogage
        console.log("Données reçues:", records);

        // Créer le tableau
        const tableHTML = `
            <div class="fr-table fr-table--layout-fixed">
                <table>
                    <thead>
                        <tr>
                            ${getTableHeaders(records).map(header => `<th>${header}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => `
                            <tr>
                                ${getTableHeaders(records).map(header => {
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

        container.innerHTML = tableHTML;
    }

    // Fonction pour obtenir les en-têtes du tableau
    function getTableHeaders(records) {
        if (!records || records.length === 0) return [];

        // Obtenir les clés du premier enregistrement
        const firstRecord = records[0];
        return Object.keys(firstRecord);
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

    // Fonction pour afficher des données mock en développement
    function renderMockData() {
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

    // Démarrer le chargement des données
    loadData();
});
