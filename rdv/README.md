# Widget Grist — prise de rendez-vous (RDV)

Widget personnalisé Grist de prise de rendez-vous, public universel (service
d'un institut, d'une mairie, de toute organisation). Déploiement GitHub Pages,
statique, sans étape de build. Moteur : FullCalendar v6 (même moteur que le
widget Calendar natif de Grist).

## Aperçu

- Vue semaine (timeGridWeek) par défaut, vue mois disponible, locale française.
- La plage proposée (bornes de la table Ouvertures, ou options startDate /
  endDate) borne le calendrier : rien d'autre n'est visible ni sélectionnable.
- Ouvertures : bandes vert clair (fond, sélectionnable).
- Réservations confirmées : événements gris « Occupé ».
- Candidatures « En attente » : événements ambre.
- L'utilisateur sélectionne à la souris une zone libre (dans une ouverture,
  hors créneau pris, pas dans le passé, granularité = option step) : le
  formulaire de candidature s'affiche ; la ligne est écrite dans la table
  Reservations avec le statut « En attente ». L'organisateur confirme ou
  refuse dans Grist. Une relecture anti-conflit a lieu juste avant l'écriture.

## Installation dans Grist

1. Ajouter un widget personnalisé (Custom Widget), URL :
   https://aplds.github.io/grist-widgets/rdv/
2. Access: Full Access.
3. Tables attendues (noms configurables dans les options du widget) :
   - Ouvertures : Date, Début, Fin (+ colonne Fermé/Statut facultative).
   - Reservations : Date, Début, Fin (ou Durée), Nom, Courriel, Motif (facultatif),
     Statut.
   Les colonnes sont auto-détectées (libellés FR ou EN, insensibles à la casse
   et aux accents).
4. Options du widget : titre, noms des tables, pas des créneaux (minutes),
   plage forcée startDate / endDate, horizon (jours).

## Mode démonstration

Ouvert directement hors Grist, le widget affiche des données fictives
(23-25 du mois suivant) : https://aplds.github.io/grist-widgets/rdv/

## Statuts

« En attente » (ou candidature/propose/pending) : ambre ; confirmé/validé :
gris « Occupé » ; annulé/refusé : ignoré.
