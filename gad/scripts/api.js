/**
 * Module d'interaction avec l'API Grist
 */
const GristAPI = {
    /**
     * Récupère toutes les lignes d'une table
     * @param {string} tableName - Nom de la table
     * @returns {Promise<Array>} - Liste des enregistrements
     */
    async fetchTable(tableName) {
        try {
            const records = await grist.docApi.fetchTable(tableName);
            return records || [];
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}:`, error);
            throw error;
        }
    },

    /**
     * Récupère un enregistrement spécifique
     * @param {string} tableName - Nom de la table
     * @param {number} recordId - ID de l'enregistrement
     * @returns {Promise<Object>} - L'enregistrement
     */
    async fetchRecord(tableName, recordId) {
        try {
            const record = await grist.docApi.fetchTable(tableName, { recordId });
            return record || {};
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}#${recordId}:`, error);
            throw error;
        }
    },

    /**
     * Ajoute un nouvel enregistrement
     * @param {string} tableName - Nom de la table
     * @param {Object} data - Données à ajouter
     * @returns {Promise<Object>} - L'enregistrement créé
     */
    async addRecord(tableName, data) {
        try {
            const newRecord = await grist.docApi.addRecord(tableName, data);
            return newRecord;
        } catch (error) {
            console.error(`Erreur lors de l'ajout dans ${tableName}:`, error);
            throw error;
        }
    },

    /**
     * Met à jour un enregistrement
     * @param {string} tableName - Nom de la table
     * @param {number} recordId - ID de l'enregistrement
     * @param {Object} data - Données à mettre à jour
     * @returns {Promise<Object>} - L'enregistrement mis à jour
     */
    async updateRecord(tableName, recordId, data) {
        try {
            const updatedRecord = await grist.docApi.updateRecord(tableName, recordId, data);
            return updatedRecord;
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${tableName}#${recordId}:`, error);
            throw error;
        }
    },

    /**
     * Récupère les enregistrements liés via une table de jointure
     * @param {string} tableName - Nom de la table
     * @param {string} foreignKey - Clé étrangère (ex: 'AffaireId')
     * @param {number} foreignKeyValue - Valeur de la clé étrangère
     * @returns {Promise<Array>} - Liste des enregistrements liés
     */
    async fetchRelatedRecords(tableName, foreignKey, foreignKeyValue) {
        try {
            const records = await grist.docApi.fetchTable(tableName, {
                filter: { [foreignKey]: foreignKeyValue }
            });
            return records || [];
        } catch (error) {
            console.error(`Erreur lors de la récupération des enregistrements liés dans ${tableName}:`, error);
            throw error;
        }
    }
};
