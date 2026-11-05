# Réservations à l'avance

> Statut : livrée et commitée le 2026-11-04. Testée sur deux émulateurs jusqu'à « Je pars » ; le retrait 10 min avant n'est pas testé, par choix du user (étape 7). Le point 8 de « À valider », les obligations légales, reste à vérifier avant la mise en prod.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

## Spec

### Besoin

Les écrans existent des deux côtés, mais tout est simulé :

- **Passager** : il choisit « Plus tard », un jour et une heure, puis « Réserver le taxi ». La réservation n'existe que dans la mémoire du téléphone, et l'onglet « À venir » montre des réservations inventées.
- **Chauffeur** : l'onglet « Réservations » montre des courses inventées à accepter. Accepter ne fait que déplacer une ligne en mémoire.
- **Prix** : il est calculé pour un départ immédiat, même pour une réservation à 5 h du matin. Le tarif de nuit et les jours fériés ne sont donc pas pris en compte.

Le cas qui compte : un passager réserve la veille un taxi pour l'aéroport à 5 h. Il doit être sûr qu'un taxi viendra.

### Comment ça marche

**1. Le passager réserve**

```text
Passager : « Plus tard », demain 5 h 00, destination l'aéroport
  ↓
App → API : POST /v1/rides { départ, destination, pickupAt: demain 5 h 00 }
  ↓
API : prix au tarif de demain 5 h (nuit), trafic prévu à cette heure (Mapbox)
  ↓
Passager : voit la fourchette et appuie sur « Réserver le taxi »
  ↓
App → API : POST /v1/rides/:rideId/book
  ↓
API → Postgres : course de type SCHEDULED, au statut BOOKED, heure de prise en charge dans ride_schedules
  ↓
Onglet « À venir » du passager : la réservation apparaît, « En attente d'un chauffeur »
```

**2. Un chauffeur s'engage à l'avance**

```text
Chauffeur : ouvre l'onglet « Réservations »
  ↓
App → API : GET /v1/bookings/available?latitude=…&longitude=…
  ↓
API : réservations sans chauffeur, départ à moins de 20 km de lui
  ↓
Chauffeur : « Accepter »
  ↓
App → API : POST /v1/rides/:rideId/booking/accept
  ↓
API → Postgres : ride_schedule_drivers, une seule ligne possible par course
API → Firebase Cloud Messaging → passager : « Réservation confirmée »
```

Ou bien il n'en veut pas :

```text
Chauffeur : « Refuser »
  ↓
App → API : POST /v1/rides/:rideId/booking/refuse
  ↓
API → Postgres : ride_schedule_refusals (course, chauffeur)
  ↓
La réservation disparaît de sa liste « Disponibles », et ne lui sera jamais proposée,
pas même au départ de la course. Rien ne change pour le passager ni pour les autres chauffeurs.
```

**3. À l'heure de partir**

Point 10 de « À valider » : le chauffeur engagé ne reçoit pas d'offre de 15 s, la course est déjà à lui. Il doit être en ligne 30 min avant, puis il part quand il veut, au plus tard 10 min avant la prise en charge. Deux heures fixes, aucun calcul de trajet (point 11 de « À valider »).

Le serveur relit chaque minute les réservations, et une fois à son démarrage. Elles sont lues dans Postgres : un redémarrage du serveur n'en perd aucune, et une annulation n'a rien d'autre à nettoyer.

Sans chauffeur engagé, rien ne change :

```text
Demain 4 h 30 → la course passe en SEARCHING_DRIVER, comme une commande immédiate
              → push au passager : « Votre réservation commence : nous cherchons votre taxi. »
              → chauffeurs libres à moins de 5 km, un à la fois, 15 s
              → personne : « Aucun taxi disponible », comme aujourd'hui
```

Avec un chauffeur engagé :

```text
Demain 4 h 15 (45 min avant)
  API → FCM → chauffeur : « Votre réservation de 05:00 : passez en ligne avant 04:30. »
  ↓
Demain 4 h 30 (30 min avant, l'heure limite)
  API → Postgres : ride_schedules dont pickupAt est dans 30 min ou moins, encore BOOKED,
                   verrouillées avec FOR UPDATE SKIP LOCKED
  API → Firebase : le chauffeur engagé est-il en ligne (drivers/<uid>) ?
  ├─ oui, libre ou en course → la course passe en DRIVER_ASSIGNED : elle est à lui
  │                            il ne reçoit plus aucune course immédiate jusqu'à la fin de la réservation
  │                            push au chauffeur : « Réservation de 05:00 : appuyez sur « Je pars » avant 04:50. »
  └─ non → il est retiré (ride_schedule_withdrawals)
           push au chauffeur : « Réservation de 05:00 confiée à un autre taxi. »
           push au passager : « Votre chauffeur n'est pas disponible. Nous cherchons un autre taxi. »
           la course passe en SEARCHING_DRIVER, comme sans chauffeur engagé
  ↓
Chauffeur : « Je pars », dans l'onglet « Acceptées », quand il veut avant 4 h 50
  App → API : POST /v1/rides/:rideId/booking/depart
  API : la course passe en DRIVER_EN_ROUTE, comme une offre acceptée
  API → FCM → passager : « Votre taxi arrive » (avec rideId : l'app ouvre la course)
  App du chauffeur : ouvre l'écran « aller chercher le client », comme après une offre acceptée
  ↓
La suite est la course actuelle : approche, code de montée, course, fin.
Une fois parti, il n'est plus surveillé : la course ne lui est jamais retirée.
```

S'il n'est pas parti à temps :

```text
Demain 4 h 50 (10 min avant), course encore en DRIVER_ASSIGNED
  → il est retiré, comme un désistement ; push au chauffeur : « Réservation de 05:00 confiée à un autre taxi. »
  → push au passager : « Votre chauffeur n'est pas disponible. Nous cherchons un autre taxi. »
  → la course passe en SEARCHING_DRIVER, chauffeurs libres à moins de 5 km, sans lui
```

Si l'app du passager est ouverte à ce moment, la notification ne s'affiche pas : l'app lit alors `rideId` dans la notification reçue à l'écran, et ouvre la course.

**4. Annuler ou se désister**

```text
Passager annule avant 4 h 30 → course CANCELLED, push au chauffeur engagé
Chauffeur se désiste avant 4 h 30 → sa ligne passe de ride_schedule_drivers à ride_schedule_withdrawals,
                                   la réservation redevient disponible, push au passager
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS, comme toujours ; iOS préparé et non testé |
| Tarif par défaut (validé par le user, 2026-11-03) | Pour que les recruteurs testent l'app d'où ils sont : une position sans tarif en base, en France comme à l'étranger, prend le tarif du département de `FALLBACK_TARIFF_DEPARTMENT`. Vaut aussi pour la commande immédiate |
| Activation du tarif par défaut (validé par le user, 2026-11-03) | Seulement si la variable d'environnement est présente : sur l'environnement de démo, avec `67`, jamais en vraie production, où un client parisien verrait sinon un prix réglementé faux |
| Modèle (validé par le user, 2026-11-03) | Un chauffeur s'engage à l'avance depuis l'onglet « Réservations » ; sinon, la course part en commande immédiate 30 min avant |
| Quand réserver | Déjà dans l'app : de maintenant + 30 min à aujourd'hui + 30 jours, par créneaux de 15 min. L'API refuse tout autre horaire |
| Départ | La position du passager au moment de réserver, comme une commande immédiate |
| Prix | Calculé à l'heure de prise en charge : tarif de jour ou de nuit, jours fériés, trafic prévu par Mapbox. Il n'est jamais recalculé ensuite |
| Validité du prix | 5 min pour appuyer sur « Réserver », comme pour commander |
| Chauffeur libre à l'estimation | Pas exigé pour une réservation : personne n'a besoin d'être en ligne la veille |
| Départ de la course (validé par le user, 2026-11-03) | 30 min avant l'heure de prise en charge, par le serveur : le temps qu'un taxi à 5 km arrive, et qu'un secours soit trouvé si le chauffeur engagé manque. Plus court, le secours arrive trop tard ; plus long, le chauffeur est bloqué trop tôt. Une constante, facile à changer |
| Attente du client (validé par le user, 2026-11-03) | Les 5 min avant « Client absent » comptent depuis l'heure de prise en charge si le chauffeur est en avance, depuis son arrivée s'il est en retard. Comme l'arrêté national le prévoit pour Paris (article 10) : un chauffeur arrivé à 4 h 45 ne peut pas déclarer le client absent à 4 h 50 |
| Supplément de réservation (validé par le user, 2026-11-03) | Aucun pour l'instant : l'arrêté du Bas-Rhin n'a pas pu être lu. À revoir avec son texte |
| Type de course | `rides.kind` : `IMMEDIATE` ou `SCHEDULED`, fixé à l'estimation et jamais modifié. Le statut dit l'étape, le type dit la nature : une réservation partie reste `SCHEDULED` |
| Planification | Une tâche lancée chaque minute et au démarrage par `@nestjs/schedule`, qui relit `ride_schedules` dans Postgres. Écartés : file de tâches Postgres (pg-boss, qui demande Node 22.12 alors que le projet fixe Node 20.1), file Redis (BullMQ, un serveur de plus), service cloud (Cloud Tasks, hébergement non choisi), moteur de workflows (Temporal, `@nestjs/workflows`, surdimensionnés). Ils relisent eux aussi une table, et doublent l'état de la réservation |
| Garde-fous de la planification | Index sur `ride_schedules.pickupAt` ; lignes verrouillées avec `FOR UPDATE SKIP LOCKED`, ce qui permet plusieurs serveurs ; départ seulement si la course est encore `BOOKED`, donc une réservation annulée ou déjà partie est ignorée ; passage au démarrage pour rattraper celles dues pendant un arrêt |
| Plus tard | Décision du user, 2026-11-03 : la relecture de Postgres est une solution temporaire. Il faudra passer à une vraie file de tâches, BullMQ ou équivalent (pg-boss), le jour où l'app aura plusieurs actions à heure fixe : rappels, expiration des offres (aujourd'hui en mémoire, perdue au redémarrage), nettoyage des estimations abandonnées. Ce jour-là, l'état de chaque tâche devra suivre celui de la réservation : une annulation ou un désistement supprime ou modifie sa tâche. Précisé le 2026-11-04 : BullMQ apporte la précision (une tâche à l'heure exacte, au lieu de la minute qui suit) et un code plus clair, pas une économie. La relecture de Postgres coûte une requête indexée par minute, et les lectures Firebase quelques octets ; le seul vrai coût aurait été Mapbox, pour le calcul du retard, écarté depuis. Il ajoute même un serveur Redis à héberger ([doc BullMQ, tâches différées](https://docs.bullmq.io/guide/jobs/delayed)) |
| Réservations visibles (validé par le user, 2026-11-03) | Sans chauffeur, départ à moins de 20 km de la position du chauffeur, la plus proche dans le temps d'abord |
| Refuser une réservation (validé par le user, 2026-11-04) | Bouton « Refuser » à côté de « Accepter » : le user s'attend à voir les deux. Personne n'attendait sa réponse, donc personne n'est prévenu : la réservation disparaît de sa liste, pour de bon, et elle n'est jamais proposée à ce chauffeur, pas même au départ, quand elle passe aux chauffeurs libres autour. Pour une réservation qu'il a acceptée, c'est « Se désister » |
| Départ vu par le passager (validé par le user, 2026-11-04) | Au départ, une notification « Votre réservation commence : nous cherchons votre taxi. », qui porte l'identifiant de la course. L'app ouvre directement l'écran de cette course, ouverte, en arrière-plan ou fermée, et le passager voit la recherche, puis le taxi en route ou « Aucun taxi disponible ». Les autres notifications de course du passager, envoyées à partir du départ (taxi en route, taxi arrivé, aucun taxi, nouveau chauffeur), portent aussi cet identifiant, pour que leur toucher ouvre la même course. Validé par le user le même jour : « Réservation confirmée » et « chauffeur désisté » n'en portent pas, car avant le départ il n'y a rien à suivre, et leur toucher ouvre l'accueil comme aujourd'hui. Une vieille notification touchée après la fin ouvre l'état final de la course, avec un nouvel état « Course annulée » et « Retour ». Détail au point 9 de « À valider » |
| Départ du chauffeur engagé (validé par le user, 2026-11-04) | Pas d'offre de 15 s, qui piégeait un chauffeur qui ne guette pas son téléphone. Il doit être en ligne à l'heure limite, 30 min avant la prise en charge ; la course passe alors en `DRIVER_ASSIGNED`, à lui, libre ou en course. Il appuie lui-même sur « Je pars » dans « Acceptées », à partir de l'heure limite. Remplace l'offre au chauffeur engagé de l'étape 4 et la recherche à 20 km |
| Rappel au chauffeur engagé (validé par le user, 2026-11-04) | 45 min avant la prise en charge, 15 min avant l'heure limite : « Votre réservation de 12:37 : passez en ligne avant 12:07. » Une seule fois, même s'il est déjà en ligne |
| Heure de départ au plus tard (validé par le user, 2026-11-04) | Toujours 10 min avant la prise en charge, une constante : assez tard pour que le chauffeur parte, assez tôt pour qu'un taxi de secours à 5 km arrive à peu près à l'heure. À l'attribution, il reçoit « Réservation de 12:37 : appuyez sur « Je pars » avant 12:27. ». Encore en `DRIVER_ASSIGNED` à cette heure : retiré, comme hors ligne à l'heure limite. C'est la sortie de l'état `DRIVER_ASSIGNED` : sans elle, un chauffeur qui n'appuie jamais laisserait le passager sans taxi ni message, et la course bloquée pour toujours |
| Après « Je pars » (validé par le user, 2026-11-04) | Plus aucune surveillance : la course ne lui est jamais retirée. Un chauffeur en route avec un peu de retard arrive souvent avant un taxi de secours. Le passager voit l'heure d'arrivée du taxi en direct, et peut annuler gratuitement |
| Calcul du retard (écarté par le user, 2026-11-04) | Codé puis retiré : « Partez maintenant » et la règle de retard (trajet calculé par Mapbox chaque minute, deux notifications à 2 min d'écart, puis course retirée). Trop de cas pour une v1 : chaque réponse en ouvrait un autre. Voir « Hors périmètre » |
| Chauffeur engagé hors ligne à l'heure limite (validé par le user, 2026-11-04) | Retiré comme un désistement, puis la course part aux autres chauffeurs à 5 km, sans lui. Le passager reçoit « Votre chauffeur n'est pas disponible. Nous cherchons un autre taxi. », avec l'identifiant de la course ; le chauffeur, « Réservation de 12:37 confiée à un autre taxi. » Même chose s'il n'est pas parti 10 min avant |
| Chauffeur attribué (validé par le user, 2026-11-04) | À l'heure limite, il est caché des taxis libres de la carte du passager (`markDriverBusy`), puis réaffiché s'il est retiré ou si le passager annule. Aucune notification au passager à ce moment : il voit déjà son chauffeur dans « À venir » |
| Chauffeurs exclus du secours (validé par le user, 2026-11-04) | Ceux qui ont refusé la réservation, et tous ceux qui en ont été retirés, désistés d'eux-mêmes ou par le serveur |
| Courses en attendant (validé par le user, 2026-11-04) | Choix A : à partir de l'heure limite et jusqu'à la fin de la réservation, plus aucune course immédiate pour lui. Avant l'heure limite, il en reçoit normalement. À faire à terme (choix B, décision du user) : ne lui proposer que les courses qui ne le mettront pas en retard, ce qui demande d'estimer la fin de chaque course. Voir « Hors périmètre » |
| Offre d'une réservation chez le chauffeur (validé par le user, 2026-11-04) | Constaté par le user : la fiche de l'offre affiche « Course immédiate » au départ d'une réservation. Elle affiche « Réservation pour 11:56 », l'heure de prise en charge en heure française. L'offre écrite dans `rideOffers/<driverId>` porte pour cela le type de course et, pour une réservation, son heure de prise en charge |
| Démarrage de l'app passager (validé par le user, 2026-11-04) | Constaté par le user : au toucher d'une notification, l'app montre l'accueil un instant avant d'ouvrir la course, et un appui rapide peut emmener ailleurs. Au démarrage, l'app affiche un écran de chargement tant qu'elle ne sait pas s'il y a une course à rouvrir (celle de la notification, ou la course en cours), puis ouvre directement la course ou l'accueil. Si l'accueil ne peut pas se charger, le message d'erreur habituel avec « Réessayer » remplace le chargement. App déjà ouverte ou en arrière-plan : rien ne change, le passager voit son écran du moment puis la course |
| Indicateurs de chargement (validé par le user, 2026-11-04) | Chaque bouton qui appelle l'API affiche une roue et ne réagit plus pendant l'envoi, pour qu'un double appui n'envoie pas deux fois. « Annuler » dans « À venir » n'en avait pas, et un échec y remplaçait toute la liste par l'erreur : la liste reste affichée, avec le message dessous |
| Engagements d'un chauffeur (validé par le user, 2026-11-03) | Plusieurs, à au moins 1 h d'écart entre deux prises en charge |
| Texte de la feuille d'horaire (validé par le user, 2026-11-03) | « Annulation gratuite » tout court, au lieu de « jusqu'à 1 h avant » ; la phrase sur le supplément de réservation est retirée, puisqu'il n'y en a pas |
| Prix de l'approche (validé par le user, 2026-11-03) | Le chauffeur n'est pas connu à l'estimation : le bas de la fourchette sans approche, le haut avec 5 km d'approche au tarif A ou B, la distance maximale d'un taxi appelé |
| Annulation par le passager | Gratuite et possible jusqu'au départ de la course : l'app ne prend aucun paiement |
| Désistement du chauffeur | Possible jusqu'à l'heure limite, 30 min avant ; la réservation redevient disponible. Ensuite, plus de « Se désister » : une fois parti, il a l'annulation actuelle d'une course en route |
| Course de secours | Mêmes règles qu'une commande immédiate : 5 km, un chauffeur à la fois, 15 s |
| Notifications | Réservation confirmée, chauffeur désisté, réservation annulée, départ de la course ; au chauffeur engagé : passer en ligne, appuyer sur « Je pars » avant l'heure, réservation confiée à un autre taxi ; au passager : chauffeur indisponible ; les 6 actuelles restent |
| Annulation par le passager après l'heure limite | Gratuite, depuis `DRIVER_ASSIGNED` comme depuis `BOOKED`, avec la notification au chauffeur ; une fois le chauffeur parti, c'est l'annulation actuelle d'une course en route |
| Après le départ | Rien de nouveau : c'est le parcours actuel de la course |

### Règles

| Cas | Résultat | Code |
|---|---|---|
| Position sans tarif, `FALLBACK_TARIFF_DEPARTMENT` absente | Refus 422, comme aujourd'hui | `RIDE.AREA_NOT_SERVED` |
| Position sans tarif, `FALLBACK_TARIFF_DEPARTMENT` présente | Estimation au tarif de ce département | Aucun |
| Ce département n'a pas non plus de tarif | Refus 422 | `RIDE.AREA_NOT_SERVED` |
| geo.api.gouv.fr en panne | Erreur, comme aujourd'hui : le tarif par défaut ne sert qu'à une position sans tarif, pas à une panne, qui donnerait sinon le tarif du Bas-Rhin à un client d'un département connu | Inchangé |
| `pickupAt` à moins de 30 min ou à plus de 30 jours | Refus 400 | `RIDE.PICKUP_TIME_NOT_BOOKABLE` |
| Réserver une course qui n'est pas estimée pour plus tard | Refus 409 | `RIDE.WRONG_STEP` |
| Commander tout de suite une course estimée pour plus tard | Refus 409 | `RIDE.WRONG_STEP` |
| Prix trop ancien au moment de réserver | Refus 422 | `RIDE.ESTIMATE_EXPIRED` |
| Accepter une réservation déjà prise | Refus 409 | `RIDE.BOOKING_TAKEN` |
| Refuser une réservation qu'on a acceptée | Refus 409 : il faut se désister | `RIDE.WRONG_STEP` |
| Refuser une réservation partie ou annulée | Refus 409 | `RIDE.WRONG_STEP` |
| Refuser deux fois la même réservation | 204, rien de plus n'est écrit | Aucun |
| Départ d'une réservation refusée par un chauffeur | Ce chauffeur n'est pas candidat, même libre et proche | Aucun |
| Accepter à moins de 1 h d'un autre engagement | Refus 409 | `RIDE.BOOKING_OVERLAP` |
| Accepter, se désister ou annuler après le départ de la course | Refus 409 | `RIDE.WRONG_STEP` |
| Chauffeur engagé hors ligne à l'heure limite | Retiré ; course proposée aux autres chauffeurs, sans lui | Aucun |
| Chauffeur engagé en ligne et en course à l'heure limite | La course est à lui (`DRIVER_ASSIGNED`) ; « Je pars » seulement une fois sa course finie ; pas parti 10 min avant, il est retiré | Aucun |
| « Je pars » avant l'heure limite, ou par un autre chauffeur | Refus 409 | `RIDE.WRONG_STEP` |
| « Je pars » pendant une autre course | Refus 409 ; aucun code n'existait, un chauffeur occupé ne recevant jamais d'offre (validé par le user, 2026-11-04) | `RIDE.DRIVER_BUSY` |
| « Se désister » après l'heure limite | Refus 409 | `RIDE.WRONG_STEP` |
| Pas de « Je pars » 10 min avant la prise en charge | Retiré ; course proposée aux autres chauffeurs, sans lui | Aucun |
| « Je pars » après ce retrait | Refus 403 : la course n'est plus à lui | `RIDE.NOT_ASSIGNED_TO_DRIVER` |
| Offre immédiate à un chauffeur qui a une course en `DRIVER_ASSIGNED` | Jamais : il n'est pas candidat | Aucun |
| « Client absent » avant 5 min après l'heure de prise en charge, chauffeur arrivé en avance | Refus 409, comme un « Client absent » trop tôt aujourd'hui | Code actuel du client absent trop tôt |

### Prix

Le calcul est celui d'aujourd'hui, avec deux changements :

- **Heure** : le tarif et chaque tronçon sont pris à l'heure de prise en charge, pas à l'heure de la demande. `estimateFare` reçoit déjà une heure de départ.
- **Trafic** : Mapbox reçoit `depart_at`. Sa documentation indique que, pour le profil `driving-traffic`, la durée vient de l'historique du trafic, mélangé au trafic réel seulement quand l'heure est proche.

Reste l'approche : aujourd'hui elle est calculée depuis le taxi libre le plus proche, qui n'existe pas encore pour une réservation (voir le point 7 de « À valider »). Aucun supplément de réservation n'est ajouté : l'arrêté du Bas-Rhin n'a pas pu être lu.

### API

| Route | Rôle | Réponse |
|---|---|---|
| `POST /v1/rides` | Passager | Comme aujourd'hui, avec `pickupAt` facultatif |
| `POST /v1/rides/:rideId/book` | Passager | 204 |
| `POST /v1/rides/:rideId/cancel` | Passager | 204, aussi depuis `BOOKED` |
| `GET /v1/rides/booked` | Passager | Ses réservations, la plus proche d'abord |
| `GET /v1/bookings/available?latitude=…&longitude=…` | Chauffeur | Réservations sans chauffeur autour de lui |
| `GET /v1/bookings/accepted` | Chauffeur | Ses engagements, le plus proche d'abord |
| `POST /v1/rides/:rideId/booking/accept` | Chauffeur | 204 |
| `POST /v1/rides/:rideId/booking/withdraw` | Chauffeur | 204 |
| `POST /v1/rides/:rideId/booking/refuse` | Chauffeur | 204 |
| `POST /v1/rides/:rideId/booking/depart` | Chauffeur | 204 : « Je pars », la course passe en `DRIVER_EN_ROUTE` |

Une réservation, côté passager :

```json
{
  "id": "…",
  "originName": "12 Rue du Général de Gaulle, 67300 Schiltigheim",
  "destinationName": "Aéroport Strasbourg-Entzheim",
  "pickupAt": "2026-11-04T04:00:00.000Z",
  "estimatedPriceMinCents": 3800,
  "estimatedPriceMaxCents": 5200,
  "driverFirstName": "Jean"
}
```

`GET /v1/rides/booked` et `GET /v1/bookings/accepted` gardent une réservation en `DRIVER_ASSIGNED` jusqu'à « Je pars » ; côté chauffeur, la réponse dit si « Je pars » est possible, et l'app montre alors ce bouton à la place de « Se désister ».

`driverFirstName` vaut `null` tant que personne ne s'est engagé. Côté chauffeur, la même réservation donne le prénom du passager et la distance du trajet, sans son téléphone : il ne le reçoit qu'au départ de la course, comme aujourd'hui.

### Nouveaux éléments

**API** : variable `FALLBACK_TARIFF_DEPARTMENT`, facultative, dans `env.validation.ts` et `.env.example`, lue par `EstimateRideService` ; enum `RideKind` et `RideEntity.kind`, statut `BOOKED`, étape `booked` dans `RideStep`, `RideEntity.book()`, `acceptBooking()`, `withdrawFromBooking()`, `refuseBooking()` et `startBooking()`, `pickupAt` dans l'estimation, `depart_at` dans l'adaptateur Mapbox, `BookingStarter` lancé chaque minute par `@nestjs/schedule`, quatre notifications dans `RideNotifier`, et les routes ci-dessus. Les dates des nouveaux calculs utilisent `date-fns`. Pour le départ du chauffeur engagé (étapes 6.5 et 6.7) : statut `DRIVER_ASSIGNED`, `RideEntity.remindToGoOnline()`, `startBooking()` revu, `departForBooking()` et le retrait 10 min avant, table `ride_schedule_alerts`, présence par `findOnlineDriver` dans le port Firebase des chauffeurs existant, quatre notifications de plus dans `RideNotifier` (passer en ligne, appuyer sur « Je pars », réservation confiée à un autre taxi, chauffeur indisponible), erreur `RIDE.DRIVER_BUSY`.

**Mobile** : vraies sources pour `RideBookingRemoteDataSource` et `DriverBookingRemoteDataSource`, `pickupAt` envoyé à l'estimation, onglet « À venir » réel, onglet « Réservations » réel, « Refuser » dans « Disponibles », désistement depuis « Acceptées », roue de chargement sur « Annuler » dans « À venir ». Étape 6.6 : bouton « Je pars » dans « Acceptées », qui ouvre l'écran « aller chercher le client ».

### Tables touchées

La structure suit l'héritage par tables de classe ([Martin Fowler](https://martinfowler.com/eaaCatalog/classTableInheritance.html)) : `rides` porte ce qui est commun à toutes les courses, `ride_schedules` ajoute ce qui est propre aux réservations, avec la même clé. `rides.kind` dit s'il faut y chercher.

```text
rides                          kind : IMMEDIATE | SCHEDULED, status : … BOOKED …
  └── ride_schedules           rideId (clé), pickupAt, tripMeters
        ├── ride_schedule_drivers       rideId (clé), driverId, acceptedAt
        ├── ride_schedule_withdrawals   id (clé), rideId, driverId, acceptedAt, withdrawnAt
        ├── ride_schedule_refusals      (rideId, driverId) (clé), refusedAt
        └── ride_schedule_alerts        (rideId, driverId, kind) (clé), sentAt
```

| Table | Opération | Quand |
|---|---|---|
| `rides` | Nouvelle colonne `kind` (enum `RideKind`), nouveau statut `BOOKED` | À l'estimation, et à la réservation |
| `ride_schedules` | Nouvelle table, écrite dès l'estimation | `rideId` (clé, liée à `rides`), `pickupAt` (indexé), `tripMeters` (longueur du trajet, montrée aux chauffeurs). `bookedAt` est retiré : la ligne existe dès l'estimation, avant toute réservation, et la colonne aurait été vide jusque-là |
| `ride_schedule_drivers` | Nouvelle table | `rideId` (clé, liée à `ride_schedules`), `driverId` (indexé, pour l'onglet « Acceptées » et la règle d'écart), `acceptedAt` : le chauffeur engagé maintenant |
| `ride_schedule_withdrawals` | Nouvelle table | `id`, `rideId`, `driverId`, `acceptedAt`, `withdrawnAt` : un désistement |
| `ride_schedule_refusals` | Nouvelle table, migration à part | `rideId` et `driverId` (clé composée : un chauffeur refuse une fois une réservation), `refusedAt` ; liée à `ride_schedules` et à `drivers` |
| `rides` | Nouveau statut `DRIVER_ASSIGNED`, migration de l'étape 6.5 | À l'heure limite, chauffeur engagé en ligne |
| `ride_schedule_alerts` | Nouvelle table, migration de l'étape 6.5 | `rideId`, `driverId`, `kind` (enum `RideScheduleAlertKind`), clé composée des trois, `sentAt` : le rappel n'est envoyé qu'une fois au chauffeur engagé. À l'étape 6.7, l'enum ne garde que `GO_ONLINE` : `LEAVE_NOW`, `LATE_FIRST` et `LATE_SECOND` partent avec le calcul du retard. La table reste, avec sa colonne `kind`, pour un autre rappel plus tard ; remplace `ride_schedule_reminders`, jamais créée |

Ce que la structure garantit seule :

- **Un seul chauffeur engagé par réservation** : `rideId` est la clé de `ride_schedule_drivers`. Aucun index partiel : Postgres n'en accepte que sur les colonnes de leur propre table, donc pas un qui dépendrait des désistements.
- **Un désistement garde son historique** : la ligne passe de `ride_schedule_drivers` à `ride_schedule_withdrawals` dans la même transaction, sans colonne nullable.
- **Une réservation appartient à une course** : clé étrangère vers `rides`.

Ce qu'elle ne garantit pas, et que vérifie `RideEntity` comme pour les autres sous-tables : qu'une course `SCHEDULED` a bien sa ligne dans `ride_schedules`, et qu'une course `IMMEDIATE` n'en a pas ; que les statuts `BOOKED` et `DRIVER_ASSIGNED` n'existent que pour une course `SCHEDULED`. Une contrainte CHECK sur `kind` et `status` l'aurait garanti en base ; écartée par le user le 2026-11-04, qui évite tout ce que Prisma ne sait pas écrire dans `schema.prisma`. Toutes les écritures passent par `RideEntity` et le repository, qui suffisent. Une course immédiate n'a pas d'attente entre l'attribution et le départ : le chauffeur part dès qu'il accepte l'offre, de `SEARCHING_DRIVER` à `DRIVER_EN_ROUTE`. Il faudrait un trigger, écarté comme ailleurs dans le projet.

`rides.kind` n'a pas de valeur par défaut : une réservation créée sans préciser son type deviendrait sinon une course immédiate, sans erreur. La table `rides` est donc vidée avant la migration, avec `DELETE FROM rides;` : elle ne contient que des courses de test, et aucune production n'existe. Le `DELETE` retire aussi les offres et les sous-tables en cascade, et garde les comptes, le tarif et les types de documents, comme pour la notation.

L'héritage intégré de Postgres (`INHERITS`) est écarté : sa documentation précise que l'unicité et les clés étrangères ne s'appliquent pas aux tables filles, et Prisma ne le gère pas.

« Je pars » mène la course là où mène une offre acceptée, `DRIVER_EN_ROUTE`, avec les mêmes écritures (chauffeur occupé, code de montée, `rides/<id>` dans Firebase). Tout ce qui suit fonctionne donc sans changement : code de montée, arrivée, course, fin, note. Les engagements ne sont pas des offres : une offre acceptée rend le chauffeur occupé, ce qui le bloquerait jusqu'au jour de la réservation. Jusqu'au 2026-11-04, le chauffeur engagé recevait une offre ordinaire au départ ; remplacé, voir point 10 de « À valider ».

### Hors périmètre

- Choisir un autre point de départ que sa position : un passager qui réserve depuis son bureau un taxi pour chez lui ne peut pas encore le faire.
- Modifier une réservation : il faut l'annuler et en refaire une.
- Réservations récurrentes, plusieurs passagers, bagages, véhicule adapté : les lignes « 2 bagages » et « Taxi Accès demandé » du chauffeur restent simulées.
- Rappel au passager la veille ou une heure avant.
- Interrupteur « Recevoir les réservations » : il reste simulé.
- Frais d'annulation ou de non-présentation : l'app ne prend aucun paiement.
- **À faire à terme, décision du user, 2026-11-04 (choix B)** : après l'heure limite, proposer au chauffeur engagé les courses immédiates qui ne le mettront pas en retard, celles qui ne chevauchent pas la réservation. Il faudra estimer la fin de chaque course et le trajet de là au départ de la réservation. En attendant, choix A : aucune.
- Sanctions : retirer les réservations à un chauffeur après des absences ou des retraits répétés. Les retraits sont gardés dans `ride_schedule_withdrawals`, sans dire s'ils viennent du chauffeur ou du serveur.
- « Je pars » avant l'heure limite, pour un chauffeur à plus de 30 min du départ.
- Recherche prolongée, décision du user, 2026-11-04 : pas pour la v1. Constaté par le user : un chauffeur qui se désiste après « Je pars » donne « Aucun taxi disponible » au passager tout de suite, faute d'autre chauffeur, alors qu'il reste 30 min. Plus tard, pour une réservation seulement : relancer la recherche chaque minute jusqu'à l'heure de prise en charge, le passager voyant « Nous cherchons un autre taxi », et le même message « Votre chauffeur n'est pas disponible » pour un désistement que pour un retrait. Avec peu de chauffeurs, comme en démo, elle ne trouverait personne de plus.
- Calcul du retard, décision du user, 2026-11-04 : pas pour la v1, trop de cas. Plus tard : temps de trajet du chauffeur engagé par Mapbox, « Partez maintenant » pour arriver 5 min en avance, notifications de retard, et course confiée à un autre taxi seulement à la demande du passager une fois le chauffeur parti. À prévoir alors : le chauffeur en course à l'heure limite (sa course en cours allonge son trajet), le taxi de secours (toujours « en retard »), le coût Mapbox (100 000 requêtes gratuites par mois, puis 2 $ les 1 000, [mapbox.com/pricing](https://www.mapbox.com/pricing), lu le 2026-11-04 ; une colonne « prochaine vérification à » ramènerait 30 à 40 appels par réservation à 4 ou 5), et l'écran d'un chauffeur à qui le serveur retire la course.

### Limites connues

- **Chauffeur engagé mais absent** : la course part quand même en commande immédiate, mais à 4 h 30 il peut n'y avoir personne en ligne. Le passager le saura seulement 30 min avant. Atténué par le rappel 45 min avant, et par le message au passager.
- **Chauffeur parti trop tard** : une fois « Je pars » appuyé, rien ne le surveille. S'il arrive en retard, personne n'est prévenu ; le passager voit l'heure d'arrivée du taxi en direct, et peut annuler gratuitement.
- **En ligne à l'heure limite** : `drivers/<uid>` lu une fois dans Firebase, à l'heure limite. Il n'existe que si l'app du chauffeur est connectée ; Firebase le supprime à la déconnexion (`onDisconnect`). Realtime Database facture les données téléchargées, pas les lectures ([doc officielle](https://firebase.google.com/docs/database/usage/billing)) : quelques centaines d'octets par réservation.
- **Aucun taxi au départ, app du passager ouverte** : corrigé à l'étape 6.2. La notification porte l'identifiant de la course : reçue app ouverte, elle ouvre l'écran de la course, qui affiche « Aucun taxi disponible » (vérifié par le user le 2026-11-04, depuis « Mes courses »).
- **Carte de réservation pas à jour, app du passager ouverte** : après « Réservation confirmée » ou « chauffeur désisté », « À venir » garde l'ancien état jusqu'au prochain rechargement. Traité dans `docs/specs/mes-courses-a-jour.md`.
- **Une minute de retard au plus** : la course part entre 30 et 31 min avant l'heure, selon le passage de la tâche.
- **Solution temporaire** : la relecture de Postgres sera remplacée par une file de tâches, BullMQ ou équivalent, quand d'autres actions à heure fixe arriveront (voir « Plus tard » dans les décisions).

## À valider

1. **Modèle de réservation.** Je propose l'engagement à l'avance, avec la commande immédiate en secours. C'est ce que promettent les écrans existants, et c'est la seule façon de rassurer le passager de 5 h du matin. L'autre option est plus simple : aucune liste chez le chauffeur, la course part toute seule en commande immédiate 30 min avant, mais rien ne garantit un taxi.
2. **Arrêté du Bas-Rhin. Tranché par le user, 2026-11-03 : sans supplément pour l'instant.** À revoir avec le PDF « Arrêté tarifs courses taxi 26.01.26 », sur la page « Professions réglementées de la route » de bas-rhin.gouv.fr, que le site bloque en téléchargement automatique, pour savoir :
   - s'il existe un supplément de réservation, et son montant ;
   - comment se paie l'approche d'une réservation à l'avance.

   Le décret du 7 octobre 2015 prévoit un supplément de réservation, mais l'arrêté national n'en fixe les montants que pour Paris, Lyon, Nice, Cannes, Antibes et Toulouse : pour Strasbourg, c'est l'arrêté préfectoral qui décide.
3. **Texte de l'app.** La feuille de choix d'horaire promet « Annulation gratuite jusqu'à 1 h avant » et un « Supplément de réservation selon le tarif de la ville ». **Validé par le user, 2026-11-03 :** « Annulation gratuite » tout court, et la phrase sur le supplément retirée.
4. **Distance des réservations visibles. Validé par le user, 2026-11-03 :** 20 km autour du chauffeur. 5 km, la limite d'une commande immédiate, cacherait presque tout au chauffeur qui regarde depuis chez lui.
5. **Écart entre deux engagements. Validé par le user, 2026-11-03 :** 1 h minimum. Sans règle, un chauffeur peut accepter deux réservations à la même heure.
6. **Départ à 30 min. Validé par le user, 2026-11-03**, avec l'attente du client comptée depuis l'heure de prise en charge.
7. **Approche d'une réservation. Validé par le user, 2026-11-03.** Le chauffeur n'est pas connu à l'estimation, donc ni la longueur ni le prix de son approche. Retenu : le bas de la fourchette sans approche, le haut avec une approche de 5 km au tarif A ou B, la distance maximale d'un taxi appelé. La fourchette reste honnête sans inventer de chauffeur.
8. **Obligations légales.** Avec de vraies réservations, l'app devient sans doute une centrale de réservation au sens du code des transports. C'est déjà noté comme question ouverte du produit : à vérifier avant la mise en prod, pas pour coder.
9. **Le passager ne sait pas ce que devient sa réservation. Validé par le user, 2026-11-04**, sans le filet de sécurité. Constaté par le user le 2026-11-04 : au départ, sans taxi, la réservation disparaît de « À venir » au rafraîchissement, sans aucune information. Retenu :
   - au départ, une notification au passager : « Votre réservation commence : nous cherchons votre taxi. » ;
   - la notification porte l'identifiant de la course (`rideId`, en données FCM), et l'app ouvre directement l'écran de cette course : app ouverte, par `onMessage` ; app en arrière-plan ou fermée, au toucher, par `onMessageOpenedApp` et `getInitialMessage` (doc officielle de `firebase_messaging` 16.7.1 à relire avant) ;
   - la suite est l'écran actuel, qui lit le statut dans `rides/<id>` : recherche, puis taxi en route, ou « Aucun taxi disponible » avec « Retour ».

   Pourquoi l'identifiant et pas `GET /v1/rides/current` : sans candidat, la recherche finit en quelques millisecondes (10:12:52 le 2026-11-04), avant que l'app ne reçoive le push. La route ne renvoie pas `NO_DRIVER_FOUND`, l'app aurait un 404 et n'ouvrirait rien.

   Côté API : une notification de plus dans `RideNotifier`, envoyée par `BookingStarter` après l'enregistrement et la publication, et des données `rideId` dans le port d'envoi. Côté mobile : lire `rideId` dans les trois cas et ouvrir la course. Limites : l'écran de la course passe devant une autre commande en cours ; un push perdu laisse l'app ouverte sans nouvelle (filet possible, non retenu : rafraîchir « À venir » à chaque ouverture de l'app). Hors de cette proposition : une entrée « Réservation sans taxi » dans « Passées ».
10. **Départ d'une réservation pour le chauffeur engagé. Ouvert, 2026-11-04.** Constaté par le user : l'offre de 15 s au départ (code actuel, étape 4) piège le chauffeur engagé, qui ne guette pas son téléphone 30 min avant.

   **Validé par le user, 2026-11-04 :** en ligne à l'heure limite (30 min avant), course attribuée sans offre, rappel 45 min avant, bouton « Je pars », « Partez maintenant », règle de retard (deux notifications puis course confiée à un autre taxi). Courses en attendant : choix A (aucune) pour le moment, choix B (seulement celles qui ne le mettent pas en retard) à faire à terme. Remplace l'offre au chauffeur engagé de l'étape 4 et l'ancienne étape 6.5. Voir « Comment ça marche », décisions et étapes 6.5 et 6.6. « Partez maintenant » et la règle de retard sont retirés ensuite, au point 11.
11. **Simplifier le départ du chauffeur engagé. Validé par le user, 2026-11-04.** Constaté par le user pendant les tests : la règle des 2 min (trajet calculé par Mapbox, deux notifications, course retirée) ouvre un nouveau cas à chaque réponse ; et retirer la course à un chauffeur déjà parti est souvent pire que son retard. Retenu pour la v1, deux heures fixes, sans calcul de trajet :
   - 30 min avant : en ligne, la course est à lui, avec « appuyez sur « Je pars » avant … » ; hors ligne, elle part à un autre taxi (déjà codé) ;
   - 10 min avant, toujours 10 min : pas encore parti, elle part à un autre taxi, et le passager comme lui sont prévenus. C'est la sortie de l'état `DRIVER_ASSIGNED`, sans laquelle une course resterait bloquée ;
   - une fois parti, plus aucune surveillance.
   Retirés : le calcul Mapbox chaque minute, « Partez maintenant », les deux notifications de retard, et la correction mobile du chauffeur retiré en route, qui ne sert plus. Voir l'étape 6.7.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Exception demandée par le user le 2026-11-03 : les étapes 1 à 6 sont codées d'un coup, et il teste tout à l'étape 7.

### Étape 0 : tarif par défaut pour la démo (API)

- [x] Ajouter `FALLBACK_TARIFF_DEPARTMENT`, facultative, à `env.validation.ts` et à `.env.example`
- [x] Dans `EstimateRideService`, prendre le tarif de ce département quand la position n'en a pas, y compris un département français sans tarif ; une panne de geo.api.gouv.fr lève toujours une erreur
- [x] À faire par le user : ajouter `FALLBACK_TARIFF_DEPARTMENT=67` à son `.env`, puis relancer `npm run start:dev`
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles)
- [x] Vérification par le user : `npm run deps:validate`, resté à ses 5 erreurs habituelles
- [ ] Test par le user, reporté à l'étape 7 : une position simulée hors du Bas-Rhin (émulateur à Paris ou à Londres) donne un prix ; sans la variable, l'erreur revient

Les étapes 1 à 6 ont été codées d'un coup. Une seule migration couvre les étapes 1 et 2, au lieu de deux.

### Étape 1 : estimer pour plus tard (API)

- [x] Lire la doc officielle de `depart_at` (Directions API) : format `YYYY-MM-DDThh:mm:ssZ`, durée tirée de l'historique du trafic loin de l'heure actuelle
- [x] `schema.prisma` : enum `RideKind` et colonne `rides.kind`, obligatoire et sans valeur par défaut
- [x] À exécuter par le user : `DELETE FROM rides;`
- [x] Commandes à lancer par le user, une fois pour les étapes 1 et 2 : `npm run migration:dev -- --name ride_schedules`, puis `npm run prisma:generate` (migration `20261103130337_ride_schedules`)
- [x] Ajouter `pickupAt` facultatif à l'estimation, refusé hors de 30 min à 30 jours ; avec lui, la course est `SCHEDULED`
- [x] Prix au tarif de l'heure de prise en charge, arrêté en vigueur ce jour-là, jours fériés de son année, `depart_at` dans l'adaptateur Mapbox
- [x] Approche : bas de la fourchette sans, haut avec 5 km au tarif A ou B ; aucun supplément de réservation
- [x] Ne plus exiger de chauffeur libre pour une estimation à l'avance
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles) ; `deps:validate` lancé par le user, sortie non relue

### Étape 2 : réserver et annuler (API)

- [x] `schema.prisma` : statut `BOOKED`, tables `ride_schedules` (index sur `pickupAt`), `ride_schedule_drivers` (index sur `driverId`), `ride_schedule_withdrawals`
- [x] Étape `booked` de `RideStep`, `RideEntity.book()`, annulation depuis `BOOKED`
- [x] Commande `book-ride`, requête `find-my-bookings`, routes
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles) ; `deps:validate` lancé par le user, sortie non relue

### Étape 3 : engagement du chauffeur (API)

- [x] `acceptBooking()` et `withdrawFromBooking()`, avec les règles d'écart et de course déjà prise ; le désistement déplace la ligne dans la même transaction
- [x] Deux chauffeurs à la fois : l'engagement est créé, pas remplacé, et la clé refuse le second, traduit en `RIDE.BOOKING_TAKEN`
- [x] Requêtes `find-available-bookings` et `find-accepted-bookings`, commandes `accept-booking` et `withdraw-from-booking`, routes
- [x] Notifications : réservation confirmée, chauffeur désisté, réservation annulée
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles) ; `deps:validate` lancé par le user, sortie non relue

### Étape 4 : départ de la course (API)

- [x] Lire la doc officielle de `@nestjs/schedule` : la version 5 demande NestJS 10, le projet est en 9.4, donc la 4.1.2, qui a `@Interval`
- [x] Commande à lancer par le user : `npm install @nestjs/schedule@^4.1.2`
- [x] `BookingStarter`, chaque minute et au démarrage : lecture avec `FOR UPDATE SKIP LOCKED`, départ seulement si encore `BOOKED`
- [x] `RideEntity.startBooking()` passe la course en `SEARCHING_DRIVER` ; l'offre va d'abord au chauffeur engagé, cherché à 20 km, puis aux autres à 5 km. Remplacé pour le chauffeur engagé à l'étape 6.5
- [x] Notification de départ au chauffeur : « Votre réservation commence » ; le passager reçoit « Votre taxi arrive » à l'acceptation, comme aujourd'hui. Remplacé à l'étape 6.5
- [x] « Client absent » d'une réservation : 5 min après l'heure de prise en charge, ou après l'arrivée si le chauffeur est en retard
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles) ; `deps:validate` lancé par le user, sortie non relue

### Étape 5 : réservations du passager (mobile)

- [x] Test d'abord : aucune règle métier nouvelle côté app, donc aucun test ; la règle des 30 min à 30 jours est dans l'API et dans `GetPickupDaysUseCase`, déjà là
- [x] Envoyer `pickupAt` à l'estimation, et recalculer le prix quand l'heure change sur l'écran du choix du taxi
- [x] Vraie `RideBookingRemoteDataSource` : réserver, annuler, lister
- [x] Onglet « À venir » : chauffeur engagé ou « En attente d'un chauffeur »
- [x] Feuille d'horaire : « Annulation gratuite », sans la phrase sur le supplément
- [x] Choix du taxi : pas de « à N min » pour une réservation, texte sur le prix à l'heure de prise en charge
- [x] Une notification reçue app ouverte fait vérifier la course en cours, pour ouvrir une réservation qui vient de démarrer
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni warning, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6 : réservations du chauffeur (mobile)

- [x] Vraie `DriverBookingRemoteDataSource` : disponibles autour de sa position, acceptées, accepter, se désister
- [x] Bouton « Se désister » dans « Acceptées »
- [x] Passagers et bagages : valeurs fixes (1 passager, 0 bagage) dans le modèle, comme pour une offre en direct ; la longueur du trajet est la vraie
- [x] Mêmes vérifications qu'à l'étape 5

Numérotation des étapes ajoutées après coup : 6.1 à 6.6, à la place de 6 bis à 6 septies (demande du user, 2026-11-04).

### Étape 6.1 : refuser une réservation, indicateurs de chargement (API et mobile)

Ajoutée après les retours du user, le 2026-11-04.

- [x] `schema.prisma` : table `ride_schedule_refusals`, clé composée `rideId` et `driverId`
- [x] Commandes à lancer par le user : `npm run migration:dev -- --name ride_schedule_refusals`, puis `npm run prisma:generate` (migration `20261104090043_ride_schedule_refusals`)
- [x] `RideEntity.refuseBooking(driverId, now)` : refus 409 si la réservation n'est plus `BOOKED` ou s'il l'a acceptée, rien de plus s'il l'avait déjà refusée
- [x] Au départ, les chauffeurs qui l'ont refusée sont retirés des candidats, comme ceux qui ont refusé une offre en direct
- [x] Commande `refuse-booking`, route, filtre dans `find-available-bookings`
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur (les 9 habituelles) ; `deps:validate` par le user, sortie non relue
- [x] Refus et désistements écrits en une requête chacun (`createMany` avec `skipDuplicates`, doc Prisma v7), et non une par ligne
- [x] Mobile : `refuseBooking` dans la source et le dépôt, `RefuseBookingUseCase`, événement `DriverBookingRefused`, bouton « Refuser » avec sa roue ; pendant une réponse, aucun bouton de la liste ne réagit
- [x] Mobile : « Annuler » dans « À venir » avec une roue et sans réaction pendant l'envoi ; en cas d'échec, la liste reste affichée avec le message
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni remarque sur les fichiers touchés, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6.2 : le passager voit le départ de sa réservation (API et mobile)

Ajoutée après le constat du user, le 2026-11-04 (point 9 de « À valider »).

- [x] Lire la doc officielle : `data` de l'Admin SDK, typé `[key: string]: string` dans `firebase-admin` 13.10.0 installé ; `onMessage`, `onMessageOpenedApp` et `getInitialMessage` (lu une seule fois, puis retiré) dans la doc FlutterFire
- [x] API : données facultatives (`PushData`) dans `PushSenderPort`, `SendPushCommand` et l'adaptateur Firebase
- [x] API : `rideId` dans les notifications de course du passager envoyées à partir du départ, pas dans « Réservation confirmée » ni « chauffeur désisté » ; nouvelle notification de départ, envoyée par `BookingStarter` après l'enregistrement et la publication de la course, avant la recherche
- [x] Mobile : lire `rideId` dans un message reçu app ouverte, touché app en arrière-plan (`WatchPushedRidesUseCase`), ou qui a lancé l'app (`LoadCurrentRideUseCase`, avant la course en cours) ; ouvrir cette course, sinon garder la vérification de la course en cours ; une course déjà suivie reste à l'écran
- [x] Mobile : n'écouter ces messages qu'une fois l'accueil chargé, l'écran de la course ayant besoin de la position, et une seule fois
- [x] Mobile : « Mes courses » se recharge à chaque sortie de l'écran d'une course ; après « Retour » sur « Aucun taxi disponible », la réservation partie restait dans « À venir », constaté par le user le 2026-11-04 ; corrigé et vérifié par le user le même jour, après un refus du chauffeur (offre refusée à 11:55:58, « Aucune course réservée » après « Retour »)
- [x] Mobile : la carte de l'écran de la course place sa caméra sur le passager dès sa création ; sans itinéraire (aucun taxi trouvé), elle restait sur le globe, constaté par le user le 2026-11-04
- [x] Mobile : état « Course annulée » sur l'écran de la course, avec « Retour », pour une vieille notification touchée après une annulation ; l'app ne connaissait pas ce statut et l'écran attendait sans fin
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur ; `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni warning, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6.3 : écran de chargement au démarrage (mobile)

Ajoutée après le constat du user, le 2026-11-04.

- [x] Nouvel état de départ du parcours passager, `PassengerFlowStarting`, montré par un écran de chargement à la place de l'accueil ; le retour arrière n'y fait rien
- [x] Une fois l'accueil chargé et la course cherchée : la course si elle existe, sinon l'accueil ; un échec de la recherche de course mène aussi à l'accueil
- [x] Accueil impossible à charger : son message d'erreur et « Réessayer » à la place du chargement (`PassengerHomeFailed`) ; une fois l'accueil chargé, la course est cherchée à nouveau
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni remarque sur les fichiers touchés, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6.4 : l'offre d'une réservation dit que c'en est une (API et mobile)

Ajoutée après le constat du user, le 2026-11-04.

- [x] API : `kind` et, pour une réservation, `pickupAt` (en millisecondes, comme `offeredAt`) dans l'offre écrite dans `rideOffers/<driverId>` (`RideRealtimePort`, `RidePublisher`, adaptateur Firebase) ; `pickupAt` est absent pour une course immédiate
- [x] Mobile : `pickupAt` lu dans le modèle de l'offre ; la fiche affiche « Réservation pour 11:56 », à l'heure du téléphone, au lieu de « Course immédiate »
- [x] Vérifications : `tsc` OK, lint sans nouvelle erreur ; `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni remarque sur les fichiers touchés, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6.5 : départ du chauffeur engagé (API)

Ajoutée après le constat du user, le 2026-11-04 (point 10 de « À valider »). Remplace l'ancienne version de cette étape (rappel et offre de 15 s), jamais codée.

- [x] Relire la doc officielle : Mapbox Directions `driving-traffic`, déjà suivie par l'adaptateur ; Prisma v7, `@@id` accepte une clé de plusieurs champs, enum compris ([référence du schéma](https://www.prisma.io/docs/orm/v7/reference/prisma-schema-reference))
- [x] `schema.prisma` : statut `DRIVER_ASSIGNED`, enum `RideScheduleAlertKind`, table `ride_schedule_alerts`
- [ ] Commandes à lancer par le user : `npm run migration:dev -- --name ride_schedule_alerts`, puis `npm run prisma:generate`
- [x] Rappel 45 min avant : `BookingStarter` lit les réservations engagées concernées, sans alerte `GO_ONLINE`, avec `FOR UPDATE SKIP LOCKED` (`lockNextBookingToRemind`) ; `RideEntity.remindToGoOnline()`, alerte enregistrée, puis notification
- [x] Heure limite : `RideEntity.startBooking(isCommittedDriverOnline, now)` renvoie l'issue (`BookingStart`) : attribuée (`DRIVER_ASSIGNED`), recherche, ou chauffeur retiré puis recherche sans lui, avec les notifications au chauffeur et au passager. Pas d'`assignBooking()` à part : une seule méthode pour l'heure limite. Position lue par `findOnlineDriver`, nouveau dans le port des chauffeurs
- [x] Plus d'offre au chauffeur engagé ni de recherche à 20 km : `committedDriverToAsk` et `dispatchRadiusMeters` retirés ; les chauffeurs retirés, d'eux-mêmes ou par le serveur, ne sont plus candidats
- [x] Un chauffeur avec une course en `DRIVER_ASSIGNED` n'est candidat à aucune offre immédiate (choix A, dans `findBusyDriverIds`) ; caché des taxis libres à l'attribution, réaffiché à son retrait ou à l'annulation. La règle d'écart d'1 h compte aussi ses réservations attribuées
- [x] Chaque minute, pour les courses `DRIVER_ASSIGNED` et les réservations en `DRIVER_EN_ROUTE` avec leur chauffeur engagé (pas un taxi de secours) : `findWatchedBookings` en une requête, temps d'approche par `planTaxiRoute` hors transaction, puis `RideEntity.checkApproach()` sous verrou (`lockOneById`) : alertes `LEAVE_NOW`, `LATE_FIRST`, `LATE_SECOND`, puis retrait et recherche sans lui ; en route, l'offre acceptée passe en désistée comme aujourd'hui. Un échec de Mapbox ou de Firebase n'arrête que cette réservation, jusqu'à la minute suivante. Retiré à l'étape 6.7
- [x] « Je pars » : commande `depart-for-booking`, `RideEntity.departForBooking()` vers `DRIVER_EN_ROUTE` avec une offre acceptée et un code de montée, sous verrou, publication dans Firebase, « Votre taxi arrive » au passager ; route `POST /v1/rides/:rideId/booking/depart` ; nouvelle erreur `RIDE.DRIVER_BUSY` s'il est en course
- [x] « Se désister » refusé après l'heure limite (déjà le cas : seulement depuis `BOOKED`) ; annulation du passager possible depuis `DRIVER_ASSIGNED`
- [x] `find-my-bookings` et `find-accepted-bookings` gardent `DRIVER_ASSIGNED` ; `canDepart` dans la réponse du chauffeur
- [ ] Vérifications : lint sans nouvelle erreur (les 9 habituelles) ; `tsc` n'a que les 3 erreurs attendues tant que le client Prisma n'est pas régénéré (`DRIVER_ASSIGNED` inconnu), à relancer après ; `deps:validate` par le user

### Étape 6.6 : « Je pars » (mobile)

- [x] `departForBooking` dans la source (POST, puis lecture de `rides/<id>` comme après une offre acceptée) et le dépôt des réservations du chauffeur, `DepartForBookingUseCase`, événement `DriverBookingDeparted` avec sa roue ; `RIDE.DRIVER_BUSY` donne « Terminez d'abord votre course en cours. »
- [x] Onglet « Acceptées » : « Je pars » à la place de « Se désister » quand l'API le permet (`canDepart`)
- [x] Après « Je pars » : nouvel état `DriverBookingsDeparted`, que l'accueil transforme en `DriverRideAccepted`, le chemin d'une offre acceptée ; les listes se rechargent
- [x] Chauffeur retiré par le serveur pendant son approche : son écran « aller chercher le client » doit le voir. Codé le 2026-11-04 : `data: { rideId }` dans `bookingReassigned` ; côté mobile, la règle « cette course n'est plus la sienne » est dans un cas d'usage, `WatchRideTakenAwayUseCase` (notifications de `PushRegistrationRepository`, puis `getCurrentRide`), et non dans le bloc ; `DriverFlowBloc` l'écoute une fois (`DriverPushesWatched`) et revient à l'accueil seulement si l'écran montre encore cette course. Retiré à l'étape 6.7 : le serveur ne retire plus la course à un chauffeur parti. Relu le 2026-11-04 : l'app n'écoute que `rides/<id>/status` pour l'annulation du passager, et une fois `driverId` vidé, les règles Firebase (dans la console) lui retirent sans doute la lecture ; la doc FlutterFire ne dit pas ce que reçoit alors l'écoute. **Validé par le user, 2026-11-04 :**
  - API : « Réservation retirée » porte l'identifiant de la course (`data: { rideId }`), comme les notifications du passager ;
  - mobile : pendant l'approche ou l'attente au point de départ, une notification reçue app ouverte, ou touchée, pour cette course fait redemander la course en cours (`LoadCurrentDriverRideUseCase`, `GET /v1/rides/current`), avec `WatchPushedRidesUseCase`, déjà utilisé côté passager ; si ce n'est plus la sienne, retour à l'accueil avec « Course confiée à un autre taxi. »
  - limite : une notification perdue laisse l'écran affiché, et ses boutons sont refusés par le serveur
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni remarque nouvelle, 89 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6.7 : départ du chauffeur engagé simplifié (API et mobile)

Ajoutée après les tests du user, le 2026-11-04 (point 11 de « À valider »).

- [x] API, entité : retirer `checkApproach()`, `checkLeaveTime()`, `checkLateness()`, `isCommittedDriverComing`, `bookingEarlyArrivalMinutes` et `lateAlertGapMinutes` ; ajouter le retrait 10 min avant (`bookingDepartureDeadlineMinutes = 10`), par `RideEntity.removeDriverNotLeft()`, qui ne retire que depuis `DRIVER_ASSIGNED`
- [x] API, `BookingStarter` : remplacer la surveillance de chaque minute (`findWatchedBookings`, Mapbox) par `lockNextBookingNotLeft`, les réservations encore en `DRIVER_ASSIGNED` 10 min avant, verrouillées avec `FOR UPDATE SKIP LOCKED` comme à l'heure limite ; `lockOneById` gardé pour « Je pars », qui attend le verrou puis est refusé si la course vient d'être retirée
- [x] API, notifications : `leaveBy`, « Réservation de 12:37 / Appuyez sur « Je pars » avant 12:27. », à l'attribution ; `leaveNow`, `lateFirst`, `lateSecond` et le `rideId` de « Réservation retirée » retirés
- [x] API, schéma : l'enum `RideScheduleAlertKind` ne garde que `GO_ONLINE` ; `ApproachOutcome` retiré des types
- [x] Commandes à lancer par le user : `npm run migration:dev -- --name ride_schedule_alert_go_online_only`, puis `npm run prisma:generate` (migration `20261104202443_ride_schedule_alert_go_online_only`, enum à `GO_ONLINE` seul en base)
- [x] Mobile : `WatchRideTakenAwayUseCase`, `DriverPushesWatched`, `_DriverRideTakenAway` et leur câblage retirés
- [x] Vérifications : `tsc` OK, lint à ses 9 erreurs habituelles ; `dart format` sur les fichiers touchés, `flutter analyze` sans remarque nouvelle, 89 tests verts, lint Bloc à ses 6 alertes habituelles ; `deps:validate` par le user

### Étape 7 : test à deux émulateurs (par le user)

Décision du user, 2026-11-04 : les tests non cochés de l'étape 6.7 (notification « Je pars avant … », retrait 10 min avant, chauffeur parti en retard) ne sont pas faits, faute de temps ; un défaut trouvé plus tard sera corrigé alors.

- [ ] Réserver à 30 min : la réservation apparaît dans « À venir », le prix tient compte de l'heure
- [ ] Annuler une réservation : la roue tourne, la réservation disparaît, la course est `CANCELLED` en base (vérifié le 2026-11-04 : annulée avant son départ, aucune offre partie)
- [x] Le chauffeur refuse une réservation : elle disparaît de sa liste, et ne lui est pas proposée au départ (vérifié le 2026-11-04 : refus en base, départ à 10:12:52 sans aucune offre, puis `NO_DRIVER_FOUND`, le seul chauffeur l'ayant refusée)
- [ ] Départ sans taxi, app du passager ouverte, puis en arrière-plan, puis fermée : l'écran de la course s'ouvre et affiche « Aucun taxi disponible » (app fermée vérifiée le 2026-11-04 : départ à 10:56:44, les deux notifications affichées, le toucher ouvre la course sur « Aucun taxi disponible » ; app ouverte sur « Mes courses » vérifiée le même jour : la course s'ouvre seule, mais sa carte restait sur le globe, corrigé dans `RideMap` comme pour l'accueil, à revérifier ; reste app en arrière-plan)
- [x] App fermée, toucher une notification : écran de chargement, puis directement la course, sans passer par l'accueil (vérifié par le user le 2026-11-04)
- [x] Départ avec un chauffeur en ligne, non engagé : il reçoit l'offre, la laisse expirer, la course passe en « Aucun taxi disponible » (vérifié le 2026-11-04 : départ 11:26:44, offre 11:26:45, expirée 11:27:00) ; sa fiche affichait « Course immédiate », corrigé à l'étape 6.4 et vérifié par le user le même jour : « Réservation pour 12:18 »
- [ ] Le chauffeur la voit et l'accepte : le passager reçoit « Réservation confirmée »
- [x] 30 min avant, chauffeur engagé en ligne : pas d'offre, « Je pars » apparaît dans « Acceptées » ; il appuie, son écran « aller chercher le client » s'ouvre, le passager reçoit « Votre taxi arrive » et suit la course (vérifié par le user le 2026-11-04 vers 17:01, réservation de 17:37 : navigation à 12 min, code de montée chez le passager)
- [ ] À l'attribution, le chauffeur reçoit « appuyez sur « Je pars » avant … »
- [ ] Chauffeur qui n'appuie pas sur « Je pars » : 10 min avant la prise en charge, course confiée à un autre taxi, lui et le passager prévenus
- [ ] Chauffeur parti en retard : plus aucune notification, la course reste à lui
- [x] Chauffeur hors ligne au départ : la course part en commande immédiate (vérifié le 2026-11-04 : chauffeur engagé à 12:06:26, hors ligne au départ, aucune offre envoyée, puis `NO_DRIVER_FOUND` à 12:07:49 faute d'autre chauffeur). Constaté au passage : app du passager ouverte sur « Mes courses », la carte de la réservation reste « En attente d'un chauffeur » après « Réservation confirmée », jusqu'au prochain rechargement
- [ ] Chauffeur engagé : rappel « Passez en ligne » 45 min avant la prise en charge, une seule fois
- [ ] Chauffeur engagé hors ligne à l'heure limite : il reçoit « confiée à un autre taxi », le passager « Votre chauffeur n'est pas disponible »
- [ ] Désistement du chauffeur, puis annulation du passager : notifications et listes à jour
- [ ] Redémarrer l'API entre la réservation et le départ : la course part quand même

### Fin de feature

- [x] Mettre à jour `.aimemory` dans les deux dépôts et compresser `done.md`
- [x] Commiter les deux dépôts quand le user le demande

## Sources

- [Décret n° 2015-1252 du 7 octobre 2015 relatif aux tarifs des courses de taxi, article 2](https://legifrance.gouv.fr/affichTexteArticle.do?categorieLien=id&cidTexte=JORFTEXT000031285847&dateTexte=29990101&idArticle=JORFARTI000031285854)
- [Arrêté du 22 janvier 2024 relatif aux tarifs des courses de taxi](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000049040513)
- [Arrêté du 24 décembre 2025 relatif aux tarifs des courses de taxi pour 2026](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000053228231/)
- [Professions réglementées de la route, préfecture du Bas-Rhin](https://www.bas-rhin.gouv.fr/Actions-de-l-Etat/Activites-et-professions-reglementees/Professions-reglementees-de-la-route)
- [Mapbox Directions API](https://docs.mapbox.com/api/navigation/directions/)
- [NestJS, Task Scheduling](https://docs.nestjs.com/techniques/task-scheduling)
- [PostgreSQL, SELECT et FOR UPDATE SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html)
- [PostgreSQL, index partiels](https://www.postgresql.org/docs/current/indexes-partial.html)
- [PostgreSQL, limites de l'héritage](https://www.postgresql.org/docs/current/ddl-inherit.html)
- [Martin Fowler, Class Table Inheritance](https://martinfowler.com/eaaCatalog/classTableInheritance.html)
- [Crunchy Data, files de messages en PostgreSQL](https://www.crunchydata.com/blog/message-queuing-using-native-postgresql)
- Écartés pour la planification : [pg-boss](https://timgit.github.io/pg-boss/api/jobs), [BullMQ](https://docs.bullmq.io/guide/jobs/delayed), [Google Cloud Tasks](https://docs.cloud.google.com/tasks/docs/create-tasks), [Temporal](https://docs.temporal.io/develop/typescript/workflows/timers), [`@nestjs/workflows`](https://docs.nestjs.com/reliability/workflows)
