# Notifications push

> Statut : terminé et testé sur Android (deux émulateurs), non commité. iOS est préparé mais ne pourra pas être testé avant l'étape 7 : la feature n'est donc pas terminée sur iOS.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Sources : doc officielle Firebase et Android, listée en fin de spec.

## Spec

### Besoin

Aujourd'hui, tout passe par Firebase Realtime Database, qui ne fonctionne que si l'app est ouverte.

- **Chauffeur** : une demande de course n'apparaît que s'il regarde l'app. Il rate les courses, et le passager attend pour rien.
- **Passager** : il ne sait pas que son taxi est arrivé s'il a posé son téléphone.

### Comment ça marche

Le serveur n'envoie rien directement au téléphone : il passe par Firebase, qui garde une connexion ouverte avec chaque téléphone. L'app n'a pas besoin de tourner : c'est le système du téléphone qui reçoit le message et affiche la notification.

**1. Une fois au départ : le téléphone s'inscrit**

```text
App → Firebase : « donne-moi un identifiant »
Firebase → App : fX3k9…
App → API : PUT /v1/me/push-registration { fX3k9… }
API → Postgres : Jean = fX3k9…
```

**2. Quand une course arrive pour Jean**

```text
Passager commande
  ↓
API : choisit Jean, enregistre l'offre, l'écrit dans rideOffers/<uid>
  ↓
API → Firebase Cloud Messaging :
      « à fX3k9… : titre "Nouvelle course", texte "20–22 €", priorité haute, expire dans 15 s »
  ↓
Firebase → téléphone de Jean
  ↓
Le système affiche la notification, même écran verrouillé
  ↓
Jean touche la notification → l'app revient au premier plan
  ↓
L'app lit rideOffers/<uid> et affiche l'écran « Accepter / Refuser »
```

La notification ne fait que prévenir et ouvrir l'app. La vraie offre, avec son compte à rebours, reste celle de Firebase Realtime Database.

**Sur iOS**, le schéma est le même avec un intermédiaire de plus : Firebase passe par APNs, le service d'Apple, seul autorisé à joindre un iPhone.

**3. Pour que le serveur pense à Jean : sa position continue en arrière-plan**

Firebase Cloud Messaging réveille le téléphone, mais il ne suffit pas : le serveur ne propose une course qu'aux chauffeurs présents dans `drivers/`, et `drivers/<uid>` est supprimé dès que l'app perd sa connexion.

```text
Jean passe en ligne
  ↓
App : démarre l'envoi de position en arrière-plan
      (Android : notification permanente « Vous êtes en ligne » ;
       iOS : indicateur de localisation)
  ↓
Jean pose son téléphone, écran verrouillé
  ↓
App → drivers/<uid> : position toutes les 3 s environ
  ↓
API : trouve Jean dans drivers/ quand une course arrive
```

Sur Android, « Pendant l'utilisation » suffit : le service démarre pendant que l'app est à l'écran. iOS garde le texte « Toujours » dans `Info.plist`, non testé. S'il ferme vraiment l'app, le chauffeur disparaît de `drivers/` : il n'est plus en ligne et ne reçoit plus de course.

**4. Côté passager**

```text
Jean accepte → POST /v1/rides/:rideId/accept
  ↓
API : met à jour rides/<rideId>, comme aujourd'hui
  ↓
API → Firebase Cloud Messaging : « Votre taxi arrive » pour le passager
  ↓
Le passager touche la notification
  ↓
App : GET /v1/rides/current → rouvre l'écran de la course
```

**5. Selon l'état de l'app**

| État de l'app | Passager | Chauffeur en ligne |
|---|---|---|
| Ouverte à l'écran | Pas de notification : l'écran affiche l'information | Pareil : l'offre s'affiche directement |
| En arrière-plan ou écran verrouillé | Notification ; le toucher ramène dans l'app | Notification ; le toucher ouvre l'offre |
| Fermée | Notification ; le toucher démarre l'app, et `GET /v1/rides/current` rouvre la course | Plus en ligne : aucune offre |

**6. Quand le téléphone n'est plus joignable**

```text
Déconnexion → DELETE /v1/me/push-registration → ligne supprimée
Firebase répond UNREGISTERED → API supprime la ligne
Firebase en panne → API journalise, la course continue
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS |
| Canal | Firebase Cloud Messaging, seul canal officiel de Firebase ; il passe par APNs sur iOS |
| Chauffeur en arrière-plan | Sa position continue d'être envoyée tant qu'il est en ligne ; rejeté : garder l'app ouverte, qui rend le push chauffeur inutile |
| Plusieurs téléphones | Un seul par compte : le dernier connecté remplace le précédent |
| Reprise après fermeture | `GET /v1/rides/current` rouvre la course au démarrage, côté passager et chauffeur |
| Firebase Realtime Database | Reste la source de vérité : le push prévient, il ne remplace rien |
| Offre au chauffeur | Le push ouvre l'app, et l'offre vient toujours de `rideOffers/<uid>` |
| Échec d'un push | Ne bloque jamais une course : journalisé, la course continue |
| Priorité | Haute uniquement pour ce qui mène à une action et affiche une notification : FCM rétrograde sinon les messages |
| Durée de vie de l'offre | 15 s (`android.ttl`) : une offre périmée n'arrive jamais |
| App au premier plan | Rien de plus : FCM n'affiche pas ces notifications, l'écran montre déjà l'information |
| Identifiant du téléphone | Enregistré sur le serveur à chaque ouverture de l'app, avec sa date |
| Identifiant invalide | Supprimé quand FCM répond `UNREGISTERED` |
| Déconnexion | L'identifiant est supprimé : un téléphone déconnecté ne reçoit plus rien |

### Les notifications

| Destinataire | Quand | Titre | Texte |
|---|---|---|---|
| Chauffeur | Offre de course | Nouvelle course | 20–22 €, Rue d'Erstein |
| Chauffeur | Le passager annule | Course annulée | Le client a annulé la course. |
| Passager | Un chauffeur accepte | Votre taxi arrive | Jean D. est en route. |
| Passager | Le chauffeur est arrivé | Votre taxi est là | Votre chauffeur vous attend. |
| Passager | Aucun chauffeur | Aucun taxi disponible | Réessayez dans quelques minutes. |
| Passager | Le chauffeur se désiste | Nouveau chauffeur | Nous cherchons un autre taxi. |

Pas de notification de fin de course : le passager est avec le chauffeur.

### API

| Route | Rôle | Réponse |
|---|---|---|
| `PUT /v1/me/push-registration` | Passager, chauffeur | 204 |
| `DELETE /v1/me/push-registration` | Passager, chauffeur | 204 |
| `GET /v1/rides/current` | Passager, chauffeur | `{ id, status, arrivedAt }`, ou 404 |
| `GET /v1/me` | Passager, chauffeur | `{ role }` : restaure la session au démarrage |

```json
{ "token": "…" }
```

### Nouveaux éléments

**API** : module `notification`, port `PushSenderPort` et son adaptateur Firebase, commande `SendPushCommand` qui n'échoue jamais. `RideNotifier` (module `ride`) la lance depuis le dispatcher et les services accept, arrive, withdraw et cancel.

**Mobile** : `firebase_messaging` (installé par `flutter pub add`), enregistrement de l'identifiant, canal `rides` créé dans `MainActivity.kt`, restauration de la session, reprise de la course. Pas de gestionnaire d'arrière-plan : le système affiche les notifications, et le démarrage à froid passe par la restauration.

### Tables touchées

| Table | Opération | Quand |
|---|---|---|
| `push_registrations` | Nouvelle table | `userId` (clé, lié à `users`), `token` (unique), `updatedAt`. Si un autre compte se connecte sur le même téléphone, l'ancienne ligne est remplacée |

Un utilisateur sans téléphone enregistré n'a pas de ligne : aucune colonne nullable.

### Hors périmètre

- Sonnerie personnalisée et écran plein écran.
- Accepter ou refuser depuis la notification : il faut ouvrir l'app.
- Réglage « notifications » de l'onglet Compte, qui reste simulé.
- Notifications de réservation à l'avance.
- Nettoyage planifié des identifiants inactifs depuis plus d'un mois.

## iOS

Le poste de développement est sous Linux, et le user n'a ni Mac, ni compte Apple Developer payant, ni iPhone. Donc :

- Les étapes 1 à 6 sont testées sur Android. Le backend et le code Flutter sont communs aux deux plateformes.
- Ce qui peut s'écrire depuis Linux est préparé : `Info.plist`, réglages de position iOS. C'est marqué « non testé ».
- L'étape 7 attend le matériel : un Mac, loué à distance ou via un service de build, le compte Apple Developer, et un iPhone.
- Tant qu'elle n'est pas faite, la feature n'est pas terminée sur iOS, et l'app n'est pas publiée sur iOS.

## Limites connues

- **Publication** : Google Play et l'App Store examinent la position en arrière-plan, avec une déclaration à faire et une justification à donner.
- **iOS** : si le passager ferme l'app en la balayant, plus aucun message d'arrière-plan n'arrive tant qu'il ne l'a pas rouverte.
- **Android** : même chose si l'app est arrêtée de force dans les réglages.
- **Batterie** : envoyer la position en continu consomme plus.
- **Délai constaté** : une fois, une offre a mis 18 s à atteindre l'émulateur verrouillé, au-delà des 15 s de l'offre. Cause inconnue, non reproduite sur les deux essais suivants, instantanés.
- **Permission de notifications** : demandée seulement à l'inscription. Celui qui choisit « Passer », ou qui se reconnecte sur un nouveau téléphone, ne voit aucune notification tant qu'il ne l'active pas dans les réglages.

## Points à vérifier avant de coder

- **`token` choisi, `fid` écarté pour l'instant.** Firebase déprécie `token` au profit de `fid`. Mais `fid` demande `firebase_messaging` 17, donc `firebase_core` 5, `firebase_auth` 7, `firebase_database` 13, et `firebase-admin` 14 avec Node 22, alors que le projet fixe Node 20.1. Choix du user : `token`, avec `firebase_messaging` 16.7.1 et `firebase-admin` 13.10. Il faudra migrer quand `token` sera retiré, ou avec une mise à jour de Firebase.
- **`firebase_core`.** Vérifier que `firebase_messaging` 17 est compatible avec la version de `firebase_core` du projet.
- **Position en arrière-plan.** Tranché : `ACCESS_BACKGROUND_LOCATION` n'est pas ajoutée, car la doc Android ne l'exige que pour démarrer le service depuis l'arrière-plan. À confirmer écran verrouillé à l'étape 6.
- **`POST_NOTIFICATIONS`.** Tranché : le plugin 16.7.1 l'ajoute à son manifeste.
- **iOS.** Aucun `GoogleService-Info.plist` dans le dépôt, et rien n'a été testé : Firebase et Mapbox sont à vérifier sur iOS en général, pas seulement les notifications.
- **Sans réseau au redémarrage.** L'app renvoie à l'écran d'accueil au lieu de garder la session. Connu, non traité.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Exception demandée par le user : les étapes 1 à 5 ont été codées d'un coup.

### Étape 1 : enregistrer le téléphone (API et mobile)

- [x] Trancher `token` ou `fid` : `token`
- [x] Ajouter `PushRegistration` à `schema.prisma`
- [x] Commandes à lancer par le user : `npm run migration:dev -- --name push_registrations`, puis `npm run prisma:generate`
- [x] Ajouter le module `notification` et les deux routes
- [x] `flutter pub add firebase_messaging:^16.7.1`
- [x] Enregistrer l'identifiant à la connexion, le supprimer à la déconnexion
- [x] Vérifications : `tsc`, lint, `flutter analyze`, tests, lint Bloc

### Étape 2 : envoyer les notifications (API)

- [x] Ajouter `PushSenderPort` et son adaptateur Firebase : priorité, canal, durée de vie
- [x] Supprimer l'identifiant quand FCM répond `UNREGISTERED`
- [x] Lancer l'envoi depuis `RideNotifier` pour chaque notification du tableau
- [x] Vérifications : `tsc`, lint

### Étape 3 : recevoir les notifications (mobile)

- [x] Créer le canal Android à priorité haute
- [x] Pas de gestionnaire d'arrière-plan : le système affiche les notifications
- [x] Ouverture au toucher : l'app revient au premier plan, ou démarre et restaure la session
- [x] Vérifications : `dart format`, `flutter analyze`, `very_good test`, lint Bloc

### Étape 4 : chauffeur en arrière-plan (mobile)

- [x] Pas d'autorisation « Toujours » sur Android : le service démarre app à l'écran
- [x] Ajouter les permissions au manifeste
- [x] Démarrer l'envoi de position en arrière-plan en ligne, l'arrêter hors ligne
- [x] Préparer les réglages iOS, non testés : `Info.plist`
- [x] Vérifications : mêmes commandes qu'à l'étape 3

### Étape 5 : reprendre une course (API et mobile)

- [x] Rester connecté au redémarrage : `GET /v1/me` et écran d'attente `AuthRestoring`
- [x] Enregistrer l'identifiant aussi à ce démarrage et à chaque renouvellement (`onTokenRefresh`)
- [x] Ajouter `GET /v1/rides/current`
- [x] Test d'abord : quel écran rouvrir selon le statut de la course
- [x] Rouvrir la course au démarrage, côté passager et chauffeur
- [x] Vérifications : `tsc`, lint, `flutter analyze`, tests, lint Bloc

### Étape 6 : test Android à deux émulateurs (par le user)

- [x] Se connecter : une ligne apparaît dans `push_registrations` ; se déconnecter : elle disparaît
- [x] Redémarrer l'app connecté : on reste connecté, sans repasser par l'écran d'accueil
- [x] Redémarrer pendant une course : passager et chauffeur retrouvent le bon écran, le chauffeur repasse en ligne
- [x] Chauffeur app en arrière-plan : la notification de course arrive, le toucher ouvre l'offre
- [x] Chauffeur écran verrouillé : même résultat, testé sur 20 s au plus ; à refaire sur un vrai téléphone resté verrouillé plusieurs minutes
- [x] Passager app en arrière-plan : taxi en route, taxi arrivé, aucun taxi, nouveau chauffeur
- [x] Passager app fermée : le toucher rouvre la course
- [x] Déconnexion : plus aucune notification
- [x] Nouvelle inscription : « Activer les notifications » affiche bien la fenêtre Android

### Étape 7 : iOS, en attente du matériel (sur un Mac, par le user avec mon aide)

- [ ] Ajouter `GoogleService-Info.plist` et compiler l'app sur iOS
- [ ] Activer Push Notifications et Background Modes dans Xcode
- [ ] Déposer la clé APNs `.p8` dans la console Firebase
- [ ] Refaire les tests de l'étape 6 sur un vrai iPhone

### Fin de feature

- [x] Mettre à jour `.aimemory` dans les deux dépôts et compresser `done.md`
- [x] Mettre à jour les lignes `driverNeedsAppOpen` et `rideLostOnRestart` de `hyp.md`
- [x] Commiter les deux dépôts quand le user le demande

## Sources

- [Recevoir des messages dans une app Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/receive-messages)
- [Priorité des messages Android](https://firebase.google.com/docs/cloud-messaging/android/message-priority)
- [Gestion des identifiants](https://firebase.google.com/docs/cloud-messaging/manage-tokens)
- [Installation Flutter](https://firebase.google.com/docs/cloud-messaging/flutter/get-started)
- [Envoi avec l'Admin SDK](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk)
- [Types de services de premier plan Android](https://developer.android.com/develop/background-work/services/fgs/service-types)
- [README de geolocator](https://github.com/baseflow/flutter-geolocator/blob/main/geolocator/README.md)
