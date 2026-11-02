# Notation du chauffeur et historique des courses

> Statut : spec validée. Aucun code écrit. L'étape 1 attend le feu vert du user.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

## Spec

### Besoin

Les deux écrans existent mais tournent sur de fausses données :

- **Notation** : à la fin d'une course, le passager donne des étoiles et des compliments. Rien n'est enregistré. Le « ★ 4,9, 2340 courses » du chauffeur est inventé.
- **Mes courses** : l'onglet « Passées » montre des courses inventées. Les vraies courses terminées n'y apparaissent jamais.

### Décisions prises

| Sujet | Décision |
|---|---|
| Qui note | Le passager de la course, seulement lui |
| Quand | Sur l'écran de fin de course, une seule fois, sans modification ensuite |
| Note | De 1 à 5 étoiles, entier |
| Compliments | 0 ou plusieurs, dans une liste fixe : conduite douce, ponctuel, aide bagages |
| Pas de note | Le passager peut terminer sans noter : rien n'est envoyé, aucune note à 0 |
| Échec de l'envoi | Ne bloque pas le passager : la course est finie, il revient à l'accueil |
| Note du chauffeur | La moyenne de toutes ses notes depuis le début, arrondie à une décimale à l'affichage |
| Calcul de la moyenne | Une requête à chaque publication de la course, sans valeur stockée : le passager la voit après l'acceptation, et elle ne change pas pendant la course |
| Chauffeur sans note | « Nouveau » à la place des étoiles |
| Courses du chauffeur | Le nombre de ses courses terminées |
| Ce que voit le chauffeur | Rien pour l'instant : pas de note par course, pour éviter les représailles |
| Historique | Courses terminées du passager connecté, la plus récente d'abord : départ → destination, date, montant, sans lettre de tarif |
| Adresse de départ | Cherchée à l'estimation et stockée dans `rides.originName` |
| Pagination | Les 50 dernières courses, sans chargement au défilement |
| Réservations à l'avance | Restent simulées : l'onglet « À venir » ne change pas |

### Règles de la notation

| Cas | Résultat | Code |
|---|---|---|
| Course inconnue | Refus 404 | `RIDE.NOT_FOUND` |
| Course d'un autre passager | Refus 403 | `RIDE.NOT_OWNED_BY_PASSENGER` |
| Course pas terminée | Refus 409 | `RIDE.WRONG_STEP` |
| Course déjà notée | Refus 409 | `RIDE.ALREADY_RATED` |
| Étoiles hors de 1 à 5, compliment inconnu | Refus 400 | Validation du DTO |
| Le même compliment deux fois | Refus 400 | Validation du DTO |

### Adresse de départ

Le passager ne choisit pas son départ : c'est sa position GPS. L'API la transforme en adresse pendant l'estimation.

| Sujet | Décision |
|---|---|
| Service | Géocodage inverse de la Géoplateforme de l'État : `https://data.geopf.fr/geocodage/reverse` |
| Pourquoi pas Mapbox | Le stockage y demande `permanent=true`, donc une carte bancaire sur le compte |
| Pourquoi ce service | Gratuit, sans token, données de la Base Adresse Nationale en licence ouverte |
| Échec ou pas de résultat | L'estimation continue, avec le texte « Position de départ » : ce confort ne doit pas empêcher de commander |
| Colonne | `originName` devient obligatoire, ce qui retire la colonne nullable |
| Bonus | Le chauffeur voit la vraie adresse au lieu de « Position du client » |

La licence demande de citer la source et sa date de mise à jour : à ajouter aux mentions légales de l'app quand elles seront écrites.

### API

| Route | Rôle | Réponse |
|---|---|---|
| `POST /v1/rides/:rideId/rating` | Passager | 204 |
| `GET /v1/rides?page=0&limit=50` | Passager | Liste paginée, comme `GET /v1/users` |

Corps de la notation :

```json
{ "stars": 5, "compliments": ["SMOOTH_DRIVING", "PUNCTUAL"] }
```

Une ligne de l'historique :

```json
{
  "id": "…",
  "originName": "12 Rue du Général de Gaulle, 67300 Schiltigheim",
  "destinationName": "Gare de Strasbourg",
  "startedAt": "2026-10-22T08:07:16.017Z",
  "totalCents": 3120
}
```

`totalCents` vaut le compteur plus les suppléments, comme `RideEntity.totalCents`.

### Firebase

`rides/<rideId>/driver` reçoit en plus :

| Champ | Contenu |
|---|---|
| `rating` | Moyenne, ou `null` sans note |
| `completedRides` | Nombre de courses terminées |

Le mobile remplace alors ces deux valeurs simulées. Le numéro de taxi, la ville et le véhicule restent simulés : l'API ne les connaît pas encore.

### Nouveaux éléments

**API** : port `AddressFinderPort` et son adaptateur Géoplateforme, `RideEntity.rate()`, `RideAlreadyRatedError`, `RideCompliment`, commande `rate-ride`, requête `find-my-rides` (lecture directe en Prisma, comme les autres requêtes), `RideRepository.save()` étendu à la note, `findParticipants` étendu à la note et au nombre de courses.

**Mobile** : `RideCompliment` (code + libellé), `RideRemoteDataSource.rateRide` et `getPastRides`. La note 0 est traitée dans `RateRideUseCase`, pas dans l'écran.

### Tables touchées

| Table | Opération | Quand |
|---|---|---|
| `ride_ratings` | Nouvelle table | `offerId` (clé, liée à `ride_completions`), `stars`, `ratedAt` |
| `ride_rating_compliments` | Nouvelle table | `offerId`, `compliment` (clé sur les deux) |
| `rides` | `originName` obligatoire | Colonne rendue `NOT NULL` |

Une course sans note n'a simplement pas de ligne : aucune colonne nullable, aucune colonne dupliquée. Le lien avec `ride_completions` garantit qu'on ne peut noter qu'une course terminée, comme les autres sous-tables. `SMOOTH_DRIVING`, `PUNCTUAL` et `LUGGAGE_HELP` forment l'enum Prisma `RideCompliment`.

Migration créée par le user. La table `rides` est vidée avant, avec `DELETE FROM rides;` : elle ne contient que des courses de test, et aucune production n'existe. Le `DELETE` retire aussi les offres et les sous-tables en cascade, et garde les comptes, le tarif et les types de documents.

### Hors périmètre

- Commentaire libre, pourboire, signalement d'un problème.
- Note du passager par le chauffeur : reste simulée.
- Reçu téléchargeable : le bouton reste inactif.
- Courses annulées, sans chauffeur ou client absent dans l'historique.
- Choix manuel de l'adresse de départ par le passager.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : notation (API)

- [ ] Ajouter `RideRating`, `RideRatingCompliment` et l'enum `RideCompliment` à `schema.prisma`, relation depuis `RideCompletion`
- [ ] Rendre `Ride.originName` obligatoire dans `schema.prisma`
- [ ] À exécuter par le user : `DELETE FROM rides;`
- [ ] Commandes à lancer par le user : `npm run migration:dev -- --name ride_ratings_and_origin_name`, puis `npm run prisma:generate`
- [ ] Ajouter `RideAlreadyRatedError`
- [ ] Ajouter la note à l'étape `completed` de `RideStep` et `RideEntity.rate(passengerId, stars, compliments, now)`
- [ ] Étendre `ride.mapper.ts` et `RideRepository.save()`, charger la note dans `withSubTables`
- [ ] Ajouter la commande `rate-ride` : commande, service, contrôleur, DTO
- [ ] Ajouter la route à `app.routes.ts` et au module
- [ ] Lancer `npx tsc --noEmit` et `npm run lint`

### Étape 2 : adresse de départ et historique (API)

- [ ] Lire la documentation officielle de `geocodage/reverse` (paramètres, limite de 50 requêtes par seconde)
- [ ] Ajouter `AddressFinderPort` et son adaptateur, avec le texte de secours en cas d'échec
- [ ] L'appeler dans `EstimateRideService`
- [ ] Ajouter la requête `find-my-rides` : `query-handler`, contrôleur, DTO de réponse
- [ ] Ajouter le module et la route `GET /v1/rides`
- [ ] Lancer `npx tsc --noEmit` et `npm run lint`

### Étape 3 : note du chauffeur (API)

- [ ] Étendre `findParticipants` : moyenne et nombre de courses terminées
- [ ] Publier `rating` et `completedRides` dans `rides/<rideId>/driver`
- [ ] Lancer `npx tsc --noEmit` et `npm run lint`

### Étape 4 : notation et note du chauffeur (mobile)

- [ ] Test d'abord : `RateRideUseCase` n'appelle pas l'API avec 0 étoile
- [ ] Test d'abord : une erreur d'envoi ne bloque pas la fin de la course
- [ ] Ajouter `RideCompliment` et remplacer les textes de `ride_completed_view.dart`
- [ ] Ajouter `rateRide` à `RideRemoteDataSourceImpl`, retirer `RideRatingRemoteDataSource`
- [ ] Lire `rating` et `completedRides` dans `ride_remote_datasource.dart`, garder le reste simulé
- [ ] Afficher « Nouveau » sans note dans `driver_summary.dart`
- [ ] Mettre à jour le fake
- [ ] Lancer `dart format` sur les fichiers touchés, `flutter analyze`, `very_good test`, le lint Bloc

### Étape 5 : historique (mobile)

- [ ] Ajouter `getPastRides` à la vraie source
- [ ] Dans `RideRepositoryImpl.getRideHistory`, prendre « À venir » du fake et « Passées » de l'API
- [ ] Retirer `tariff` de `PastRide`, adapter `ride_history_tab.dart`
- [ ] Afficher la vraie adresse de départ chez le chauffeur, retirer `_unnamedPickup`
- [ ] Recharger l'historique à la fin d'une course, y compris sans note
- [ ] Lancer les mêmes vérifications qu'à l'étape 4

### Étape 6 : test à deux émulateurs (par le user)

- [ ] Estimation : la vraie adresse dans `rides.originName` et sur l'écran du chauffeur
- [ ] Course complète avec 5 étoiles et 2 compliments : ligne en base, course visible dans « Passées », bon montant
- [ ] Course suivante avec le même chauffeur : moyenne et nombre de courses à jour
- [ ] Fin de course sans note : aucune ligne, course visible dans « Passées »
- [ ] Chauffeur sans note : « Nouveau » affiché

### Fin de feature

- [ ] Mettre à jour `.aimemory` dans les deux dépôts, retirer la ligne « noCurrentRideRoute » si elle ne s'applique plus qu'à la course en cours
- [ ] Compresser `done.md`
- [ ] Commiter les deux dépôts quand le user le demande
