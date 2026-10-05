# Widget « Visualisation d'enquêtes » — installation & usage

Widget **agnostique** : aucune structure d'enquête n'est codée en dur.
Le schéma Veille 2026 (`Q_1_1` → `Q_10_2`) ne sert qu'à générer le **jeu démo** ;
vos données sont toujours analysées par inférence (tableaux → multiples,
entiers 0–10 → échelle, peu de valeurs courtes → choix unique, sinon texte libre)
ou via les métadonnées Grist (`Choice`/`ChoiceList`/`Text`) en accès complet.
Surcharge manuelle possible par carte (« Type d'analyse »), sans configuration.

**Navigation en 4 onglets** (filtres globaux conservés au-dessus) :
*Synthèse* (KPIs + nuage de mots), *Questions* (sommaire latéral, une question
à la fois avec précédent/suivant), *Croisement*, *Verbatim* (explorateur des
réponses libres par question + recherche). L'onglet est mémorisé dans `#hash`
(`#questions`, `#croisement`…), et l'impression affiche tous les onglets.

## 1. Mettre en ligne (GitHub Pages)

Le widget est 100 % statique, sans build :

1. Créez un dépôt GitHub, copiez-y le contenu de `src/widget/` à la racine
   (`index.html`, `styles.css`, `app.js`).
2. GitHub → *Settings → Pages* → *Deploy from a branch* → branche `main`, dossier `/`.
3. URL obtenue, ex. : `https://VOTRE-COMPTE.github.io/VOTRE-DEPOT/`
   (c'est l'URL à coller dans Grist).

## 2. Brancher dans Grist (grist.numerique.gouv.fr)

1. Sur une page du document : *Add widget → Custom* (ou « Personnalisé »).
2. *Select Data* : choisissez la table d'enquête (ex. `Table1`).
3. *Select By* : laissez vide (le widget lit **toute la table**).
4. Ouvrez les options du widget (⋮ → *Widget options*) → *CUSTOM* →
   *Enter Custom URL* : collez l'URL GitHub Pages.
5. Accès : **Read selected table** suffit. Avec **Full document access**,
   le widget récupère en plus les vrais intitulés de questions et choix
   (table système `_grist_Tables_column`) ; sinon il infère tout depuis les
   données (chaque carte permet de corriger le type détecté via « Type d'analyse »).

## 3. Enquête d'exemple : Veille 2026 (démo uniquement)

Table `Table1`, 17 colonnes : `Q_1_1` (Choice Oui/Non, abonnement),
`Q_1_2` (ChoiceList motifs), `Q_1_3` (Text), `Q_2_1` (Choice lecture),
`Q_2_2` (Text), `Q_3_1` (ChoiceList format), `Q_3_2` (Text),
`Q_4_1` (ChoiceList contenu, 8 options), `Q_4_2` (Text),
`Q_5_1` (Choice 1–5 satisfaction), `Q_5_2` (Text), `Q_6` (Choice entité),
`Q_7` (ChoiceList domaines), `Q_8` (Text suggestions), `Q_9` (Text dernier mot),
`Q_10_1` (Choice Oui/Non fréquence), `Q_10_2` (Text). Hors Grist, le widget
génère ~140 fausses réponses plausibles selon ce schéma (bouton **Démo**).
Ce schéma ne sert qu'à la démo : il n'influence jamais l'analyse de vos données.

## 4. Exports (vers PowerPoint : CSV + PNG à glisser dans vos diapos)

* **Export CSV** : données filtrées (séparateur `;`, BOM UTF-8 → Excel direct),
  + CSV par question et par verbatim.
* **Réponses libres** : carte « Synthèse des réponses libres » — **nuage de mots**
  + top 20 des mots-clés (% de réponses les contenant), calculé sur les lignes
  filtrées, **sans IA et sans réseau** (tokenisation + ~260 stopwords français,
  regroupement insensible aux accents, rendu canvas maison, zéro dépendance).
  Chaque question ouverte affiche aussi ses 8 mots-clés en pastilles.
  Exports : PNG du nuage, CSV des mots-clés.
* **Croisements** : section « Croisement » — choisissez *Regrouper par* (X)
  et *Analyser* (Y), affichage en % lignes ou effectifs, barres groupées,
  tableau de contingence avec bases, et **test du χ² local** (p-value +
  alerte si effectifs théoriques < 5 ; pas de test pour les questions
  multi-réponses). Suit les filtres. Exports : CSV, PNG.
* **Export PNG** : tous les graphiques en `.zip` (ou téléchargements
  séquentiels si JSZip bloqué) — à glisser dans un diaporama existant.
* **Imprimer** : mise en page print prévue (vers PDF).

## 5. Paramètres d'URL (optionnel)

* `?title=Mon+enquête` : titre affiché.
* `?demo=200` : nombre de fausses réponses en mode démo.

## 6. Dépannage

* Widget vide + « aucune ligne reçue » → *Select Data* mal réglé dans Grist.
* Graphiques absents mais tableaux OK → CDN Chart.js bloqué (hors-ligne) :
  les tableaux et exports CSV restent utilisables.
* `ChoiceList` affichée en une seule valeur → la colonne a été détectée en
  « choix unique » : changez-la en « choix multiples » dans la carte.
* CSP de l'instance : l'URL du widget doit être en `https` public — GitHub Pages OK.
