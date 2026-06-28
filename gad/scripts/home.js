/**
 * Module pour la page d'accueil (liste des affaires)
 */

// Chargement de la page d'accueil
async function loadHomePage() {
  const contentElement = document.getElementById('app-content');

  try {
    // Récupération des affaires
    const affairs = await GristAPI.fetchTable('Affaires');
    renderAffairsTable(affairs);
  } catch (error) {
    showError(`Erreur lors du chargement des affaires: ${error.message}`);
  }

  /**
   * Affiche le tableau des affaires
   * @param {Array} affairs - Liste des affaires
   */
  function renderAffairsTable(affairs) {
    if (!affairs.length) {
      contentElement.innerHTML = `
        <div class="fr-grid-row fr-grid-row--center">
          <div class="fr-col-12">
            <div class="fr-callout fr-callout--info">
              <h3 class="fr-callout__title">Aucune affaire trouvée</h3>
              <p class="fr-callout__text">Il n'y a actuellement aucune affaire enregistrée.</p>
            </div>
          </div>
        </div>
      `;
      return;
    }

    contentElement.innerHTML = `
      <div class="fr-table fr-table--layout-fixed">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Mis en cause</th>
              <th>École</th>
              <th>État</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${affairs.map(affair => `
              <tr>
                <td>${affair.id}</td>
                <td>${escapeHtml(affair.Mis_en_cause || 'Non spécifié')}</td>
                <td>${escapeHtml(affair.Ecole || 'Non spécifiée')}</td>
                <td>
                  <span class="fr-badge fr-badge--sm ${getBadgeClass(affair.Etat)}">
                    ${escapeHtml(affair.Etat || 'Non spécifié')}
                  </span>
                </td>
                <td>${formatFrenchDate(affair.Date_etat)}</td>
                <td>
                  <button class="fr-btn fr-btn--secondary fr-btn--sm"
                          onclick="loadAffairDetail(${affair.id})">
                    Ouvrir
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /**
   * Retourne la classe DSFR pour un badge en fonction de l'état
   * @param {string} status - État de l'affaire
   * @returns {string} - Classe DSFR
   */
  function getBadgeClass(status) {
    const classes = {
      "Pré-enregistrée": "fr-badge--info",
      "En instruction": "fr-badge--warning",
      "Clôturée": "fr-badge--success",
      "Annulée": "fr-badge--error"
    };
    return classes[status] || "fr-badge--info";
  }
}

/**
 * Charge les détails d'une affaire
 * @param {number} affairId - ID de l'affaire
 */
async function loadAffairDetail(affairId) {
  const contentElement = document.getElementById('app-content');

  try {
    // Récupération des détails de l'affaire
    const affair = await GristAPI.fetchRecord('Affaires', affairId);

    // Récupération des membres liés
    const members = await GristAPI.fetchRelatedRecords('Affaires_Membres', 'AffaireId', affairId);
    const membersDetails = await Promise.all(
      members.map(async (am) => {
        const member = await GristAPI.fetchRecord('Membres', am.MembreId);
        return { ...member, Role: am.Role };
      })
    );

    // Récupération des documents liés
    const letters = await GristAPI.fetchRelatedRecords('Courriers', 'AffaireId', affairId);
    const decisions = await GristAPI.fetchRelatedRecords('Decisions', 'AffaireId', affairId);

    renderAffairDetail(affair, membersDetails, letters, decisions);
  } catch (error) {
    showError(`Erreur lors du chargement de l'affaire: ${error.message}`);
  }

  /**
   * Affiche les détails d'une affaire
   * @param {Object} affair - Détails de l'affaire
   * @param {Array} members - Membres liés
   * @param {Array} letters - Courriers liés
   * @param {Array} decisions - Décisions liées
   */
  function renderAffairDetail(affair, members, letters, decisions) {
    contentElement.innerHTML = `
      <div class="fr-grid-row">
        <div class="fr-col-12">
          <div class="fr-card fr-card--no-border fr-card--grey">
            <div class="fr-card__body">
              <div class="fr-card__content">
                <h3 class="fr-card__title">
                  Affaire #${affair.id}
                  <span class="fr-badge fr-badge--sm ${getBadgeClass(affair.Etat)} fr-ml-1w">
                    ${escapeHtml(affair.Etat)}
                  </span>
                </h3>
                <p class="fr-card__desc">${escapeHtml(affair.Titre || 'Sans titre')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="fr-tabs">
        <ul class="fr-tabs__list" role="tablist" aria-label="Onglets de détails">
          <li role="presentation">
            <button class="fr-tabs__tab" id="tab-details" tabindex="0" role="tab" aria-selected="true">Détails</button>
          </li>
          <li role="presentation">
            <button class="fr-tabs__tab" id="tab-members" tabindex="-1" role="tab" aria-selected="false">
              Membres (${members.length})
            </button>
          </li>
          <li role="presentation">
            <button class="fr-tabs__tab" id="tab-documents" tabindex="-1" role="tab" aria-selected="false">
              Documents (${letters.length + decisions.length})
            </button>
          </li>
        </ul>

        <div id="tab-details-panel" class="fr-tabs__panel fr-tabs__panel--selected" role="tabpanel" aria-labelledby="tab-details">
          ${renderDetailsTab(affair)}
        </div>

        <div id="tab-members-panel" class="fr-tabs__panel" role="tabpanel" aria-labelledby="tab-members">
          ${renderMembersTab(members)}
        </div>

        <div id="tab-documents-panel" class="fr-tabs__panel" role="tabpanel" aria-labelledby="tab-documents">
          ${renderDocumentsTab(letters, decisions)}
        </div>
      </div>

      <div class="fr-grid-row fr-mt-2w">
        <div class="fr-col-12">
          <button class="fr-btn fr-btn--secondary" onclick="loadPage('home')">
            Retour à la liste
          </button>
        </div>
      </div>
    `;

    // Initialisation des onglets DSFR
    window.dsfr(document.querySelector('.fr-tabs')).tabs().init();
  }

  /**
   * Affiche l'onglet des détails
   * @param {Object} affair - Détails de l'affaire
   * @returns {string} - HTML
   */
  function renderDetailsTab(affair) {
    return `
      <div class="fr-grid-row">
        <div class="fr-col-md-6">
          <div class="fr-input-group">
            <label class="fr-label" for="affair-title">Titre</label>
            <input class="fr-input" type="text" id="affair-title"
                   value="${escapeHtml(affair.Titre || '')}" readonly>
          </div>
        </div>
        <div class="fr-col-md-6">
          <div class="fr-input-group">
            <label class="fr-label" for="affair-status">État</label>
            <input class="fr-input" type="text" id="affair-status"
                   value="${escapeHtml(affair.Etat || '')}" readonly>
          </div>
        </div>
      </div>

      <div class="fr-grid-row">
        <div class="fr-col-md-6">
          <div class="fr-input-group">
            <label class="fr-label" for="affair-accused">Mis en cause</label>
            <input class="fr-input" type="text" id="affair-accused"
                   value="${escapeHtml(affair.Mis_en_cause || '')}" readonly>
          </div>
        </div>
        <div class="fr-col-md-6">
          <div class="fr-input-group">
            <label class="fr-label" for="affair-school">École</label>
            <input class="fr-input" type="text" id="affair-school"
                   value="${escapeHtml(affair.Ecole || '')}" readonly>
          </div>
        </div>
      </div>

      <div class="fr-grid-row">
        <div class="fr-col-md-6">
          <div class="fr-input-group">
            <label class="fr-label" for="affair-date">Date</label>
            <input class="fr-input" type="text" id="affair-date"
                   value="${formatFrenchDate(affair.Date_etat)}" readonly>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Affiche l'onglet des membres
   * @param {Array} members - Liste des membres
   * @returns {string} - HTML
   */
  function renderMembersTab(members) {
    if (members.length === 0) {
      return `
        <div class="fr-callout fr-callout--info">
          <h3 class="fr-callout__title">Aucun membre associé</h3>
          <p class="fr-callout__text">Cette affaire n'a actuellement aucun membre associé.</p>
        </div>
        <button class="fr-btn" onclick="openAddMemberModal(${affair.id})">
          Ajouter un membre
        </button>
      `;
    }

    return `
      <div class="fr-table fr-table--layout-fixed fr-mb-2w">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Email</th>
              <th>Rôle</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(member => `
              <tr>
                <td>${escapeHtml(member.Nom || 'Non spécifié')}</td>
                <td>${escapeHtml(member.Email || 'Non spécifié')}</td>
                <td>${escapeHtml(member.Role || 'Non spécifié')}</td>
                <td>
                  <button class="fr-btn fr-btn--tertiary fr-btn--sm">
                    Retirer
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <button class="fr-btn" onclick="openAddMemberModal(${affair.id})">
        Ajouter un membre
      </button>
    `;
  }

  /**
   * Affiche l'onglet des documents
   * @param {Array} letters - Liste des courriers
   * @param {Array} decisions - Liste des décisions
   * @returns {string} - HTML
   */
  function renderDocumentsTab(letters, decisions) {
    return `
      <div class="fr-accordion-group">
        <section class="fr-accordion">
          <h3 class="fr-accordion__title">
            <button class="fr-accordion__btn" aria-expanded="true" aria-controls="letters-content">
              Courriers (${letters.length})
            </button>
          </h3>
          <div class="fr-collapse" id="letters-content">
            ${letters.length > 0 ? `
              <div class="fr-table fr-table--layout-fixed fr-mt-1w">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${letters.map(letter => `
                      <tr>
                        <td>${escapeHtml(letter.Type || 'Non spécifié')}</td>
                        <td>${formatFrenchDate(letter.Date)}</td>
                        <td>
                          <button class="fr-btn fr-btn--tertiary fr-btn--sm">
                            Voir
                          </button>
                          <button class="fr-btn fr-btn--tertiary fr-btn--sm">
                            PDF
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="fr-callout fr-callout--info">
                <p class="fr-callout__text">Aucun courrier associé à cette affaire.</p>
              </div>
            `}
          </div>
        </section>

        <section class="fr-accordion">
          <h3 class="fr-accordion__title">
            <button class="fr-accordion__btn" aria-expanded="false" aria-controls="decisions-content">
              Décisions (${decisions.length})
            </button>
          </h3>
          <div class="fr-collapse" id="decisions-content">
            ${decisions.length > 0 ? `
              <div class="fr-table fr-table--layout-fixed fr-mt-1w">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${decisions.map(decision => `
                      <tr>
                        <td>${escapeHtml(decision.Type || 'Non spécifié')}</td>
                        <td>${formatFrenchDate(decision.Date)}</td>
                        <td>
                          <button class="fr-btn fr-btn--tertiary fr-btn--sm">
                            Voir
                          </button>
                          <button class="fr-btn fr-btn--tertiary fr-btn--sm">
                            PDF
                          </button>
                        </td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : `
              <div class="fr-callout fr-callout__text">
                <p class="fr-callout__text">Aucune décision associée à cette affaire.</p>
              </div>
            `}
          </div>
        </section>
      </div>

      <div class="fr-grid-row fr-grid-row--gutters fr-mt-2w">
        <div class="fr-col-6">
          <button class="fr-btn fr-btn--secondary" onclick="openAddDocumentModal(${affair.id}, 'letter')">
            Ajouter un courrier
          </button>
        </div>
        <div class="fr-col-6">
          <button class="fr-btn fr-btn--secondary" onclick="openAddDocumentModal(${affair.id}, 'decision')">
            Ajouter une décision
          </button>
        </div>
      </div>
    `;
  }
}

/**
 * Ouvre la modale pour ajouter un membre à une affaire
 * @param {number} affairId - ID de l'affaire
 */
async function openAddMemberModal(affairId) {
  try {
    // Récupération des membres disponibles
    const allMembers = await GristAPI.fetchTable('Membres');
    const affairMembers = await GristAPI.fetchRelatedRecords('Affaires_Membres', 'AffaireId', affairId);

    const existingMemberIds = affairMembers.map(am => am.MembreId);
    const availableMembers = allMembers.filter(member => !existingMemberIds.includes(member.id));

    const content = `
      <form id="add-member-form">
        <input type="hidden" name="AffaireId" value="${affairId}">

        <div class="fr-input-group">
          <label class="fr-label" for="member-select">Membre</label>
          <select class="fr-select" id="member-select" name="MembreId" required>
            <option value="">Sélectionnez un membre</option>
            ${availableMembers.map(member => `
              <option value="${member.id}">
                ${escapeHtml(member.Nom)} (${escapeHtml(member.Role)})
              </option>
            `).join('')}
          </select>
        </div>

        <div class="fr-input-group">
          <label class="fr-label" for="role-select">Rôle dans l'affaire</label>
          <select class="fr-select" id="role-select" name="Role" required>
            <option value="">Sélectionnez un rôle</option>
            <option value="Président">Président</option>
            <option value="Secrétaire">Secrétaire</option>
            <option value="Membre">Membre</option>
            <option value="Mis en cause">Mis en cause</option>
            <option value="Témoin">Témoin</option>
          </select>
        </div>
      </form>
    `;

    openModal('Ajouter un membre à l\'affaire', `
      ${content}
      <div class="fr-grid-row fr-grid-row--right">
        <button class="fr-btn fr-btn--secondary" onclick="closeModal()">
          Annuler
        </button>
        <button class="fr-btn" onclick="document.getElementById('add-member-form').requestSubmit()">
          Ajouter
        </button>
      </div>
    `, 'add-member-modal');

    // Gestion du formulaire
    document.getElementById('add-member-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      try {
        await GristAPI.addRecord('Affaires_Membres', {
          AffaireId: parseInt(data.AffaireId),
          MembreId: parseInt(data.MembreId),
          Role: data.Role
        });

        closeModal('add-member-modal');
        loadAffairDetail(parseInt(data.AffaireId));
      } catch (error) {
        openModal('Erreur', `
          <p class="fr-text--error">Erreur lors de l'ajout: ${error.message}</p>
          <div class="fr-grid-row fr-grid-row--right fr-mt-2w">
            <button class="fr-btn" onclick="closeModal()">OK</button>
          </div>
        `, 'error-modal');
        console.error('Erreur:', error);
      }
    });
  } catch (error) {
    showError(`Erreur lors du chargement des membres: ${error.message}`);
  }
}

/**
 * Ouvre la modale pour ajouter un document
 * @param {number} affairId - ID de l'affaire
 * @param {string} type - Type de document (letter/decision)
 */
async function openAddDocumentModal(affairId, type) {
  try {
    // Récupération des modèles disponibles
    const templates = await GristAPI.fetchTable('Trames_Contenu', {
      filter: { Type: type === 'letter' ? 'Convocation' : 'Décision' }
    });

    const content = `
      <form id="add-document-form">
        <input type="hidden" name="AffaireId" value="${affairId}">
        <input type="hidden" name="Type" value="${type}">

        <div class="fr-input-group">
          <label class="fr-label" for="template-select">Modèle</label>
          <select class="fr-select" id="template-select" name="ModeleId" required>
            <option value="">Sélectionnez un modèle</option>
            ${templates.map(template => `
              <option value="${template.id}">
                ${escapeHtml(template.Titre)}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="fr-input-group">
          <label class="fr-label" for="document-date">Date</label>
          <input class="fr-input" type="date" id="document-date" name="Date"
                 value="${new Date().toISOString().split('T')[0]}" required>
        </div>

        <div class="fr-input-group">
          <label class="fr-label" for="document-content">Contenu</label>
          <textarea class="fr-input" id="document-content" name="Contenu" rows="10" required></textarea>
        </div>
      </form>
    `;

    openModal(`Ajouter un ${type === 'letter' ? 'courrier' : 'une décision'}`, `
      ${content}
      <div class="fr-grid-row fr-grid-row--right">
        <button class="fr-btn fr-btn--secondary" onclick="closeModal()">
          Annuler
        </button>
        <button class="fr-btn" onclick="document.getElementById('add-document-form').requestSubmit()">
          Enregistrer
        </button>
      </div>
    `, 'add-document-modal');

    // Chargement du contenu du modèle sélectionné
    const form = document.getElementById('add-document-form');
    const modelSelect = form.querySelector('[name="ModeleId"]');
    const contentArea = form.querySelector('[name="Contenu"]');

    modelSelect.addEventListener('change', async () => {
      if (modelSelect.value) {
        const template = await GristAPI.fetchRecord('Trames_Contenu', parseInt(modelSelect.value));
        contentArea.value = template.Contenu || '';
      }
    });

    // Gestion du formulaire
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      const data = Object.fromEntries(formData.entries());

      try {
        const tableName = type === 'letter' ? 'Courriers' : 'Decisions';
        await GristAPI.addRecord(tableName, {
          AffaireId: parseInt(data.AffaireId),
          Type: type === 'letter' ? 'Convocation' : 'Décision',
          Date: data.Date,
          Contenu: data.Contenu,
          ModeleId: parseInt(data.ModeleId)
        });

        closeModal('add-document-modal');
        loadAffairDetail(parseInt(data.AffaireId));
      } catch (error) {
        openModal('Erreur', `
          <p class="fr-text--error">Erreur lors de l'ajout: ${error.message}</p>
          <div class="fr-grid-row fr-grid-row--right fr-mt-2w">
            <button class="fr-btn" onclick="closeModal()">OK</button>
          </div>
        `, 'error-modal');
        console.error('Erreur:', error);
      }
    });
  } catch (error) {
    showError(`Erreur lors du chargement des modèles: ${error.message}`);
  }
}
