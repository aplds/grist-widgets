// Configuration de l'API Grist
const gristApi = {
    baseUrl: 'https://docs.getgrist.com/your-document-id/api',

    // Récupération de la liste des affaires
    async fetchAffairs() {
        const response = await fetch(`${this.baseUrl}/Affaires`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des affaires");
        return await response.json();
    },

    // Récupération des détails d'une affaire
    async fetchAffairById(id) {
        const response = await fetch(`${this.baseUrl}/Affaires/${id}`);
        if (!response.ok) throw new Error("Erreur lors de la récupération de l'affaire");
        return await response.json();
    },

    // Mise à jour d'une affaire
    async updateAffair(id, data) {
        const response = await fetch(`${this.baseUrl}/Affaires/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error("Erreur lors de la mise à jour de l'affaire");
        return await response.json();
    },

    // Récupération des membres
    async fetchMembers() {
        const response = await fetch(`${this.baseUrl}/Membres`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des membres");
        return await response.json();
    },

    // Récupération des audiences
    async fetchHearings() {
        const response = await fetch(`${this.baseUrl}/Audiences`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des audiences");
        return await response.json();
    },

    // Récupération des modèles de documents
    async fetchTemplates() {
        const response = await fetch(`${this.baseUrl}/Trames_Contenu`);
        if (!response.ok) throw new Error("Erreur lors de la récupération des modèles");
        return await response.json();
    },
};
