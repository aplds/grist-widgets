/**
 * Module d'interaction avec l'API Grist
 * Utilise l'API globale initialisée dans index.html
 */
const GristAPI = window.GristAPI || {
    fetchTable: async function(tableName) {
        try {
            return await gristDoc.docApi.fetchTable(tableName);
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}:`, error);
            throw new Error(`Impossible de charger les données de ${tableName}: ${error.message}`);
        }
    },

    fetchRecord: async function(tableName, recordId) {
        try {
            return await gristDoc.docApi.fetchSelectedRecord(tableName, recordId);
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}#${recordId}:`, error);
            throw new Error(`Impossible de charger l'enregistrement ${recordId} de ${tableName}: ${error.message}`);
        }
    },

    fetchRelatedRecords: async function(tableName, foreignKey, foreignKeyValue) {
        try {
            return await gristDoc.docApi.fetchTable(tableName, {
                filter: { [foreignKey]: foreignKeyValue }
            });
        } catch (error) {
            console.error(`Erreur lors de la récupération des enregistrements liés dans ${tableName}:`, error);
            throw new Error(`Impossible de charger les enregistrements liés dans ${tableName}: ${error.message}`);
        }
    },

    addRecord: async function(tableName, data) {
        try {
            return await gristDoc.docApi.addRecord(tableName, data);
        } catch (error) {
            console.error(`Erreur lors de l'ajout dans ${tableName}:`, error);
            throw new Error(`Impossible d'ajouter l'enregistrement dans ${tableName}: ${error.message}`);
        }
    },

    updateRecord: async function(tableName, recordId, data) {
        try {
            return await gristDoc.docApi.updateRecord(tableName, recordId, data);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${tableName}#${recordId}:`, error);
            throw new Error(`Impossible de mettre à jour l'enregistrement ${recordId} dans ${tableName}: ${error.message}`);
        }
    }
};
