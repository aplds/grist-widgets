# rdv — widget de prise de rendez-vous

Widget Grist générique de prise de rendez-vous, déployé sur GitHub Pages :
<https://aplds.github.io/grist-widgets/rdv/>

## Principes

1. **Un calendrier, point.** L'utilisateur voit, mois par mois, ce qui est
   occupé, partiellement libre, ou fermé.
2. **Clic sur un jour libre** : les tranches horaires s'affichent (libres en
   vert, occupées en rouge, candidatures en attente en jaune).
3. **Il sélectionne une tranche et pose sa candidature** : nom, courriel,
   motif. La ligne est écrite dans la table des réservations avec le statut
   *En attente* — c'est l'organisateur qui confirme dans Grist.

## Tables attendues (noms par défaut, configurables)

- **Ouvertures** : Date, Début, Fin (+ colonne facultative Fermé/Statut).
- **Reservations** : Date, Début, Fin ou Durée, Nom, Courriel, Motif,
  Statut (la candidature écrit « En attente » ; « Annulé » est ignoré).

Les colonnes sont détectées automatiquement (alias FR/EN usuels), la
granularité des tranches et l'horizon de réservation se règlent dans les
options du widget (`step`, `horizonDays`, `title`, `openTable`,
`bookTable`).

## Installation dans Grist

1. Ajouter un *Custom URL widget* pointant vers l'URL GitHub Pages ci-dessus.
2. Accorder l'accès complet (*Full access*) pour permettre l'écriture.
3. Créer les deux tables ; tout le reste est automatique.

Hors Grist, la page ouverte directement montre un jeu de démonstration.

## Licence

Voir le fichier LICENSE à la racine du dépôt.