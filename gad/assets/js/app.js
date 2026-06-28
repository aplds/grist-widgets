// Initialisation de la vue "détails d'une affaire"
function initDetailsAffaireView() {
    const affaireId = localStorage.getItem('currentAffaireId');
    const affaire = getAffaireById(parseInt(affaireId));
    if (!affaire) return;

    document.getElementById('affaire-nom').textContent = `Affaire n°${affaire.Numero}`;
    // Ajoutez ici d'autres champs de l'affaire si nécessaire

    // Charger les membres
    const membres = getMembresByAffaireId(affaireId);
    const membresList = document.getElementById('membres-list');
    membresList.innerHTML = membres
        .map(membre => `
            <div class="fr-card fr-enlarge-link fr-mb-3w">
                <div class="fr-card__body">
                    <h5 class="fr-card__title">${membre.NOM} ${membre.Prenom}</h5>
                    <p class="fr-card__desc">${membre.Role} (${membre.College})</p>
                </div>
            </div>
        `)
        .join('');

    // Charger les parties
    const parties = getPartiesByAffaireId(affaireId);
    const partiesList = document.getElementById('parties-list');
    partiesList.innerHTML = parties
        .map(partie => `
            <div class="fr-card fr-enlarge-link fr-mb-3w">
                <div class="fr-card__body">
                    <h5 class="fr-card__title">${partie.Nom} ${partie.Prenom}</h5>
                    <p class="fr-card__desc">${partie.Qualite} (${partie.Type})</p>
                </div>
            </div>
        `)
        .join('');

    // Charger les audiences
    const audiences = getAudiencesByAffaireId(affaireId);
    const audiencesList = document.getElementById('audiences-list');
    audiencesList.innerHTML = audiences
        .map(audience => `
            <div class="fr-card fr-enlarge-link fr-mb-3w">
                <div class="fr-card__body">
                    <h5 class="fr-card__title">Audience du ${new Date(audience.Date_et_heure).toLocaleDateString('fr-FR')}</h5>
                    <p class="fr-card__desc">Salle : ${audience.Salle}</p>
                </div>
            </div>
        `)
        .join('');
}
