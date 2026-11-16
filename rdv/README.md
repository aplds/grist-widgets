# rdv — widget de prise de rendez-vous

Widget Grist générique de prise de rendez-vous, déployé sur GitHub Pages :
<https://aplds.github.io/grist-widgets/rdv/>

## Principes

1. **Une plage, point.** Le widget affiche uniquement les dates qui ont des
   ouvertures dans la table dédiée (ex. du 23 au 25/11), sans navigation
   mensuelle : proposer une plage, c'est l'organisateur qui le fait, dans Grist.
2. **Vue emploi du temps** : les jours de la plage en colonnes, les heures
   en lignes ; chaque créneau est un bloc — libre (vert), occupé (rouge),
   candidature en attente (jaune). Granularité réglable (`step`, 30 min
   par défaut).
3. **L'utilisateur sélectionne une tranche et pose sa candidature** : nom,
   courriel, motif. La ligne est écrite dans la table des réservations avec
   le statut *En attente* — l'organisateur confirme ou refuse dans Grist.
   Une relecture anti-conflit a lieu juste avant l'écriture.

## Tables attendues (noms par défaut, configurables)

- **Ouvertures** : Date, Début, Fin (+ colonne facultative Fermé/Statut).
  Ce sont ces lignes qui déterminent la plage affichée.
- **Reservations** : Date, Début, Fin ou Durée, Nom, Courriel, Motif,
  Statut (la candidature écrit « En attente » ; « Annulé » est ignoré).

Les colonnes sont détectées automatiquement (alias FR/EN usuels). Options du
widget : `title`, `openTable`, `bookTable`, `step`, `startDate` /
`endDate` (plage forcée, facultative), `horizonDays`.

## Installation dans Grist

1. Ajouter un *Custom URL widget* pointant vers l'URL GitHub Pages ci-dessus.
2. Accorder l'accès complet (*Full access*) pour permettre l'écriture.
3. Créer les deux tables et saisir la plage proposée ; tout le reste est
   automatique.

Hors Grist, la page ouverte directement montre un jeu de démonstration
(23-25 du mois suivant).

## Licence

Voir le fichier LICENSE à la racine du dépôt.