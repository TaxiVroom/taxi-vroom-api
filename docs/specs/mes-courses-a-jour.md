# « Mes courses » et « Réservations » à jour

> Statut : codée, testée par le user et commitée le 2026-11-05.

Concerne `taxi-vroom-mobile` seulement : l'API n'est pas touchée.

## Spec

### Besoin

**Passager.** Constaté par le user le 2026-11-04 : le passager est sur « Mes courses », onglet « À venir ». Un chauffeur accepte sa réservation, et il reçoit « Réservation confirmée ». La carte de la réservation reste sur « En attente d'un chauffeur », jusqu'à ce qu'il quitte l'écran et y revienne. Même chose pour « Réservation : chauffeur désisté ».

**Chauffeur.** Constaté par le user le 2026-11-05, en testant l'étape 1 : le passager annule une réservation acceptée. Le chauffeur reçoit « Réservation annulée », mais son onglet « Réservations » la garde dans « Acceptées », avec « Se désister », que le serveur refuserait. Même chose quand le serveur lui retire une réservation, hors ligne à l'heure limite ou pas parti 10 min avant (« Réservation retirée »).

La cause, des deux côtés : ces notifications ne portent pas d'identifiant de course, puisqu'il n'y a pas encore de course à suivre (décision « Départ vu par le passager » de `reservations-a-l-avance.md`). L'app les reçoit, mais rien ne recharge la liste.

### Comment ça marche

```text
API → FCM → app : « Réservation confirmée », « chauffeur désisté », « Réservation annulée »…
  ├─ app à l'écran : FirebaseMessaging.onMessage, aucune notification affichée
  └─ app en arrière-plan, notification touchée : FirebaseMessaging.onMessageOpenedApp
  ↓
WatchPushedRidesUseCase : le même flux qu'aujourd'hui
  ├─ passager
  │    ├─ PassengerFlowBloc : ouvre la course si la notification en porte une (inchangé)
  │    └─ RideHistoryBloc : recharge « Mes courses » (GET /v1/rides/booked et /v1/rides)
  └─ chauffeur
       └─ DriverBookingsBloc : recharge « Réservations » (GET /v1/bookings/available et /accepted)
  ↓
La carte affiche le nouvel état : « Jean viendra vous chercher », ou disparaît des « Acceptées »
```

Pendant chaque rechargement, un rond remplace la liste, jusqu'à la réponse de l'API (validé par le user, 2026-11-11 : jamais d'ancienne valeur affichée pendant un appel). Remplace la première règle, qui gardait l'ancienne liste à l'écran.

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS ; iOS préparé et non testé, faute de Mac |
| Quelles notifications (validé par le user, 2026-11-05) | Toutes celles reçues app ouverte ou touchées, avec ou sans course : une seule règle, et un rechargement de trop ne coûte qu'une requête. Une notification de course recharge aussi les autres listes, sans effet visible |
| Côté chauffeur (validé par le user, 2026-11-05) | Le même rechargement pour l'onglet « Réservations », d'abord hors périmètre, ajouté après le test du user |
| Écouter plusieurs fois | `FirebaseMessaging.onMessage` et `onMessageOpenedApp` sont des flux à plusieurs écouteurs (`StreamController.broadcast()` dans `firebase_messaging_platform_interface` 4.10.0, installé) : chaque bloc peut les écouter par le même cas d'usage |
| Une réponse en cours | Côté chauffeur, un rechargement qui arrive pendant « Accepter », « Refuser » ou « Je pars » attend la fin de la réponse : les listes ne changent pas sous son doigt |
| Réservation disponible annulée ou prise par un autre (décision du user, 2026-11-05) | Constaté par le user : sans chauffeur engagé, personne n'est prévenu, et la réservation reste dans « Disponibles » chez les chauffeurs. Rien de plus pour la v1 : le serveur refuse « Accepter », et l'app recharge alors les listes. Écartés pour l'instant : recharger toutes les 30 s, ou un signal Firebase que l'API changerait à chaque réservation disponible modifiée |
| Échec d'une réponse (décision du user, 2026-11-05, codé sans spec à sa demande) | Le message en bas de l'écran, comme ailleurs dans l'app, au lieu d'un petit texte gris : « Action impossible » chez le chauffeur, « Annulation impossible » dans « À venir » chez le passager. Un refus du serveur recharge la liste ; une coupure réseau la garde. Côté passager, un 409 donne « Cette réservation a déjà commencé ou a été annulée. » au lieu de « Erreur serveur (409) » |
| Temps réel | Pas pour la v1 : rechargement à la notification. Une réservation change rarement, souvent des heures avant la prise en charge |
| API | Inchangée : ajouter l'identifiant de la course à ces notifications ferait ouvrir un écran de course qui n'existe pas encore |

### Règles

| Cas | Résultat |
|---|---|
| Notification reçue app ouverte | La liste se recharge et reste affichée |
| Notification touchée app en arrière-plan | Même chose |
| App fermée, lancée par une notification | Rien de nouveau : l'accueil charge déjà les listes au démarrage |
| Chauffeur en train de répondre à une réservation | Le rechargement est ignoré : la réponse recharge déjà les listes à sa fin |
| Rechargement en échec | Le message d'erreur actuel de la liste, comme aujourd'hui |

### API

Aucune route nouvelle ni modifiée.

### Nouveaux éléments

**Mobile** :

- `RideHistoryBloc` reçoit `WatchPushedRidesUseCase`, avec `RideHistoryPushesWatched`, qui commence l'écoute une seule fois, comme `PassengerPushesWatched` ;
- `DriverBookingsBloc` reçoit le même cas d'usage, avec `DriverBookingsPushesWatched` ;
- `passenger_home_page` et `driver_home_page` ajoutent l'événement à la création du bloc ; le cas d'usage est passé au chauffeur par `app.dart` et `AuthNavigator`.

### Tables touchées

Aucune.

### Hors périmètre

- Recharger les listes au retour de l'app au premier plan, sans notification.
- Le vrai temps réel : l'API écrirait les réservations dans Firebase, que l'app écouterait, comme `rides/<id>` pour la course. Plus fiable, puisqu'il ne dépend pas d'une notification, mais plus de travail : écritures à chaque changement, règles Firebase, écoute de plus.

### Limites connues

- **Notification perdue**, ou notifications désactivées : la liste reste en l'état jusqu'au prochain rechargement, comme aujourd'hui.

## À valider

1. **Toutes les notifications, ou seulement celles sans course ? Validé par le user, 2026-11-05 : toutes.** Une seule règle simple. L'autre option, seulement celles sans course, évitait un rechargement inutile pendant une course, mais ajoutait un cas à suivre.
2. **Côté chauffeur. Validé par le user, 2026-11-05.** Ajouté après son test : voir « Besoin ».

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : recharger « Mes courses » (mobile)

- [x] Relire la doc officielle de `firebase_messaging` 16.7.1 pour `onMessage` et `onMessageOpenedApp`, et le code installé de `firebase_messaging_platform_interface` 4.10.0 : les deux flux sont des `StreamController.broadcast()`
- [x] Test d'abord : aucune règle métier nouvelle, donc aucun test, comme le veut `testsScope`
- [x] `RideHistoryBloc` : `WatchPushedRidesUseCase`, événement `RideHistoryPushesWatched` écouté une seule fois, `RideHistoryRequested` à chaque notification
- [x] `passenger_home_page` : l'événement à la création du bloc, avec le cas d'usage qu'elle recevait déjà
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans remarque nouvelle, 93 tests verts, lint Bloc à ses 6 alertes habituelles
- [x] Test par le user, 2026-11-05 : le chauffeur accepte, la carte passe à « Test1 viendra vous chercher » sans quitter l'écran ; le passager annule, elle disparaît

### Étape 2 : recharger « Réservations » (mobile)

- [x] `DriverBookingsBloc` : `WatchPushedRidesUseCase`, événement `DriverBookingsPushesWatched` écouté une seule fois, `DriverBookingsRequested` à chaque notification, ignoré pendant une réponse
- [x] `driver_home_page` et `AuthNavigator` : câblage et événement à la création du bloc ; `app.dart` n'a pas changé, `AuthNavigator` recevait déjà le cas d'usage pour le passager
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans remarque nouvelle, 93 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 3 : test (par le user)

- [x] Chauffeur sur « Acceptées », le passager annule : la réservation disparaît, sans quitter l'onglet (vérifié par le user le 2026-11-05)
- [x] Chauffeur sur « Disponibles », le passager annule une réservation sans chauffeur : elle reste affichée (limite connue) ; « Accepter » donne « Action impossible / Cette réservation n'est plus disponible. » en bas, et la liste se vide (vérifié par le user le 2026-11-05)

### Fin de feature

- [x] Mettre à jour `.aimemory` du dépôt mobile
- [x] Commiter quand le user le demande

## Sources

- [FlutterFire, Receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive)
- `firebase_messaging_platform_interface` 4.10.0, `platform_interface_messaging.dart` : `onMessage` et `onMessageOpenedApp` en `StreamController.broadcast()`
