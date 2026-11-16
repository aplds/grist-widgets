# rdv — widget de prise de rendez-vous

Widget Grist générique de prise de rendez-vous, déployé sur GitHub Pages :
<https://aplds.github.io/grist-widgets/rdv/>

## Principe

- **Vue agenda** : mois (résumé de disponibilité par jour), semaine (créneaux
  libres) et journée (timeline détaillée).
- **Créneaux calculés** : la table des **ouvertures** définit les plages
  (date, début, fin, pas, capacité) ; la table des **réservations** soustrait
  les créneaux occupés. Les durées proposées sont libres (15, 30, 45, 60 min…).
- **Universel** : aucune marque ni logique métier codée en dur. Titres, tables,
  colonnes et durées se règlent dans la configuration (bouton ⚙, persistée dans
  les options du widget). Les colonnes sont détectées automatiquement (alias
  FR/EN usuels : date/jour, début/fin, durée, nom, courriel/email, tel,
  motif/objet, notes…).
- **Écritures fiables** : l'accès complet du widget inscrit les réservations
  via l'API Grist, avec re-vérification anti-conflit immédiatement avant
  l'écriture.
- **Horizon** : délai de réservation réglable (J+X jours).
- **Mode démo** : ouvert directement sur GitHub Pages (hors Grist), le widget
  montre un jeu de données fictif.

## Tables attendues (noms par défaut, configurables)

| Ouvertures | Réservations |
| --- | --- |
| Date, Début, Fin, Pas (min), Capacité, Fermé si… | Date, Heure, Durée (min), annulée si… |

## Installation dans Grist

1. Ajouter un *Custom URL widget* pointant vers l'URL GitHub Pages ci-dessus.
2. Accorder l'accès complet (*Full access*) pour permettre les écritures.
3. Ouvrir la configuration (⚙) : indiquer les noms des tables, les durées
   proposées, l'horizon, et au besoin les correspondances de colonnes.

## Licence

Voir le fichier LICENSE à la racine du dépôt.