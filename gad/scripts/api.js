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
            return await grist.docApi.fetchTable(tableName);
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}:`, error);
            throw new Error(`Impossible de charger les données de ${tableName}`);
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
            return await grist.docApi.fetchTable(tableName, { recordId });
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${tableName}#${recordId}:`, error);
            throw new Error(`Impossible de charger l'enregistrement ${recordId} de ${tableName}`);
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
            return await grist.docApi.addRecord(tableName, data);
        } catch (error) {
            console.error(`Erreur lors de l'ajout dans ${tableName}:`, error);
            throw new Error(`Impossible d'ajouter l'enregistrement dans ${tableName}`);
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
            return await grist.docApi.updateRecord(tableName, recordId, data);
        } catch (error) {
            console.error(`Erreur lors de la mise à jour de ${tableName}#${recordId}:`, error);
            throw new Error(`Impossible de mettre à jour l'enregistrement ${recordId} dans ${tableName}`);
        }
    },

    /**
     * Récupère les enregistrements liés
     * @param {string} tableName - Nom de la table
     * @param {string} foreignKey - Clé étrangère
     * @param {number} foreignKeyValue - Valeur de la clé étrangère
     * @returns {Promise<Array>} - Liste des enregistrements liés
     */
    async fetchRelatedRecords(tableName, foreignKey, foreignKeyValue) {
        try {
            return await grist.docApi.fetchTable(tableName, {
                filter: { [foreignKey]: foreignKeyValue }
            });
        } catch (error) {
            console.error(`Erreur lors de la récupération des enregistrements liés dans ${tableName}:`, error);
            throw new Error(`Impossible de charger les enregistrements liés dans ${tableName}`);
        }
    }
};
