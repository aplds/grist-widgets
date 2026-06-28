/**
 * Module pour gérer l'initialisation de l'API Grist
 */

// Fonction pour vérifier si Grist est prêt
function checkGristReady() {
    return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
            if (typeof grist !== 'undefined' && grist.ready) {
                clearInterval(checkInterval);
                resolve();
            }
        }, 100);
    });
}

// Fonction pour initialiser l'API Grist
async function initGristAPI() {
    try {
        await checkGristReady();

        // Initialiser l'API Grist avec les permissions nécessaires
        grist.ready({
            requiredAccess: 'read selected table'
        });

        // Créer un objet global pour encapsuler les fonctions
        window.GristAPI = {
            /**
             * Récupère les données de la table sélectionnée
             */
            fetchSelectedTable: function() {
                return grist.docApi.fetchSelectedTable();
            },

            /**
             * Écoute les changements de sélection
             * @param {Function} callback - Fonction de rappel
             */
            onRecordChange: function(callback) {
                grist.on('record', callback);
            },

            /**
             * Écoute les changements de table
             * @param {Function} callback - Fonction de rappel
             */
            onTableChange: function(callback) {
                grist.on('message', function(msg) {
                    if (msg.type === 'table') {
                        callback(msg.selectedTable);
                    }
                });
            }
        };

        return true;
    } catch (error) {
        console.error("Erreur d'initialisation de l'API Grist:", error);
        return false;
    }
}

// Exporter les fonctions
window.initGristAPI = initGristAPI;
