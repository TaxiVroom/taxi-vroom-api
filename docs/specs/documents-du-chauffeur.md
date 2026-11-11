# Les documents du chauffeur

> Statut : feature close le 2026-11-10 à la demande du user, non commitée. Testée sur Android avec C7 (dates, « à renouveler », bloqué, renouvellement, « Document validé »). Non testé : l'appui sur « Dossier validé » avec un nouveau chauffeur, l'expiration pendant une course, un nouveau type dans le seed. Règles Firebase pas encore publiées par le user.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

Elle prend la suite de `inscription-chauffeur.md`, qui recopie les documents validés à l'inscription dans la table `documents`. Elle couvre leur vie ensuite, pendant des années : expiration, nouveau document demandé par la loi, renouvellement, blocage.

## Spec

### Besoin

Demandé et expliqué par le user le 2026-11-07. L'écran « Vos documents » de l'app chauffeur montre aujourd'hui des données inventées (« 5 sur 6 validés », ADS n° 118, GH-482-KZ, taximètre « à renouveler ») et ne demande rien à l'API.

Ce que le user veut en faire : un **contrôle de conformité piloté par la table des types de documents** (`document_types`).

- **Un nouveau document obligatoire.** Si la loi en demande un nouveau, l'admin ajoute un type, et tous les chauffeurs doivent le fournir, sans mettre l'app à jour.
- **Un document qui expire.** Le chauffeur doit envoyer le nouveau.
- **Un délai pour s'y conformer.** Ne pas couper du jour au lendemain un chauffeur qui travaille.
- **Ne jamais couper une course en cours.** Crainte exprimée par le user.

Aujourd'hui, rien de tout cela n'existe : `documents.expiresAt` n'est jamais rempli, rien ne lit la table, et l'app connaît une liste fixe de 6 documents (`DriverDocumentKind`), contraire à des types ajoutés par l'admin.

### Comment ça marche

**1. Un document validé, et ses jobs programmés**

```text
Chauffeur : photo + date d'expiration (11 mars), à l'inscription ou en renouvelant
Admin → API : valide le document (il peut corriger la date)
  API → Postgres, dans une même transaction :
    documents : le document, expiresAt = 11 mars (un fait, saisi ; aucun état enregistré)
    graphile_worker (la file de tâches) : les jobs du document, chacun avec sa clé
      9 février (J-30) → notification
      4 mars    (J-7)  → notification
      10 mars   (J-1)  → notification
      11 mars   (J)    → notification + hors ligne s'il n'est pas en course
Nouveau document validé plus tard → mêmes clés : les jobs sont remplacés
```

Le worker, qui tourne dans le serveur NestJS, lit les jobs dus dans Postgres et lance notre code : il envoie la notification par `SendPushCommand` et, le jour J, retire l'autorisation en ligne dans Firebase. Un job qui échoue est relancé. Les jobs agissent, ils n'écrivent aucun état : l'état se calcule depuis les dates (point 13).

**2. Ce que voit le chauffeur (principe validé par le user)**

```text
App → API : GET /v1/drivers/me/documents → l'état de chaque type, calculé depuis deux dates (point 13) :
  expiresAt passée                        → expiré, bloquant
  expiresAt dans 30 jours ou moins        → à renouveler
  sinon, ou pas de date                   → en règle
  pas de document + requiredFrom à venir  → à fournir avant <date>
  pas de document + requiredFrom passée ou vide → manquant, bloquant
Appelée à l'ouverture de l'app sans course en cours, au retour dans l'app, à une notification de documents,
au refus de « Passer en ligne » et après l'envoi d'un document
  Tout en règle           → rien ; ses documents restent consultables dans l'onglet Compte
  À renouveler, à fournir → bandeau sur l'accueil « Carte professionnelle : expire le 11 mars · Renouveler »,
                            notifications ; il peut toujours passer en ligne
  Bloquant                → « Passer en ligne » ouvre l'écran « Vos documents », qui dit pourquoi
```

**3. Le passage en ligne (idée du user)**

```text
App → API : « Passer en ligne »
  API : un état bloquant ? → refus → l'app ouvre « Vos documents »
        sinon → API → Firebase : onlineAllowed/<uid> = true (seule l'API peut l'écrire)
App → Firebase : drivers/<uid> (sa présence et sa position, comme aujourd'hui)
  Règles de Firebase : présence acceptée seulement si onlineAllowed/<uid> existe
```

**4. Jamais pendant une course (règle du user)**

```text
Pendant une course : rien du tout ; l'app passager suit le taxi par drivers/<uid>
Le job « expiré » trouve le chauffeur en course → il ne touche pas à sa présence
Fin de course (terminer, annulation, absence, désistement) → l'API répond OK, puis, à part :
  un état bloquant ? → API → Firebase : retire onlineAllowed/<uid> et drivers/<uid>
                     → l'app passe hors ligne et ouvre « Vos documents »
Filet : le dispatch ne propose aucune course à un chauffeur bloqué, ni à un document dont la date est passée
```

**5. Un nouveau type de document (ajouté par le seed)**

```text
seed : « Contrôle technique », expire, obligatoire à partir du 1er mars
Les chauffeurs sans ce document le voient « à fournir avant le 1er mars » (calculé, rien à écrire)
Le seed programme aussi les jobs du type (point 14), un par date et non un par chauffeur :
  30 jours, 7 jours, la veille → notifications aux chauffeurs qui ne l'ont pas ;
  le 1er mars → notification, et hors ligne ceux qui ne l'ont pas et ne sont pas en course
Inscription qui attend la validation sans ce document → revient à DOCUMENTS
  + « Un nouveau document est demandé » ; l'app rouvre « Mes documents » de l'inscription
```

**6. Les réservations à l'avance (validé par le user)**

```text
Liste des réservations disponibles
  → celles après l'expiration d'un de ses documents ne lui sont pas proposées
  → « 3 réservations après le 12 mars ne vous sont pas proposées : votre carte professionnelle expire le 11 mars »
  → elles reviennent quand le nouveau document est validé, pas pendant sa vérification
Réservation déjà acceptée et chauffeur bloqué à l'heure de prise en charge
  → avertissement avant ; puis retirée et proposée à un autre, comme s'il n'était pas en ligne à temps (BookingStarter)
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS ; iOS préparé et non testé, faute de Mac |
| Piloté par les données (demandé par le user, validé le 2026-11-07) | Les documents demandés sont ceux de `document_types` ; l'app affiche ce que l'API lui donne (nom, état, date), sans liste fixe : `DriverDocumentKind` disparaît |
| L'état d'un document (validé par le user, 2026-11-07, points 9, 11 et 13) | Jamais enregistré : il se calcule depuis deux faits, `documents.expiresAt` et `document_types.requiredFrom`, et la date du jour. La requête de l'écran fait ce calcul dans sa propre lecture, sans passer par le domaine (`readNeverDomain`) ; le côté écriture (passage en ligne, dispatch, fin de course, réservations) fait la même comparaison dans l'entité. Le seuil de 30 jours est une seule constante de configuration du module, hors du domaine, lue par la requête et par la programmation du job J-30 |
| Quand montrer l'écran (validé par le user, 2026-11-07 ; **remplacé le 2026-11-10**, voir « Écran à l'arrivée ») | Pas à chaque connexion : voir « Comment ça marche », 2. Comme les applis du marché, d'après leurs pages d'aide officielles : documents dans le compte avec leur date, document expiré parmi les raisons de ne pas pouvoir passer en ligne, chauffeur prévenu par message |
| Pendant un envoi (validé par le user, 2026-11-11) | Le bouton « Retour » ou « Plus tard » de « Vos documents » est désactivé tant qu'un document est en train d'être envoyé (rond sur sa carte), puis réactivé |
| Document en vérification à l'arrivée (validé par le user, 2026-11-11, précise « Écran à l'arrivée ») | « Vos documents » ne s'ouvre à l'arrivée que s'il reste un document à envoyer : à renouveler, à fournir, expiré ou manquant, et pas déjà envoyé. Un document envoyé et en vérification n'ouvre plus l'écran, même expiré : le chauffeur n'a rien à faire, l'écran le harcelait (vu par le user, carte d'identité « EN VÉRIFICATION »). Règle `DriverDocuments.hasDocumentToSend`, testée en TDD |
| Écran à l'arrivée (décision du user, 2026-11-10, remplace « Quand montrer l'écran ») | « Quand il arrive sur l'app à nouveau, y a cette page qui apparaît si y a un pépin avec un doc, un point c'est tout. » À chaque ouverture de l'app et à chaque retour dans l'app, si un document est à renouveler, à fournir, expiré ou manquant, « Vos documents » s'ouvre. Encore valable : « Plus tard » ramène à l'accueil, où le bandeau reste. Bloqué : pas de « Plus tard ». Jamais pendant une course : la course s'ouvre d'abord, comme avant. Le bandeau reste seulement hors ligne : ajouté aussi en ligne par Claude sans demande, retiré à la demande du user (2026-11-10, « je t'ai juste demandé d'afficher la page à la connexion et rien d'autre »). Codé le 2026-11-10 Sur l'écran, pas de gros bouton « Envoyer » (il en faudrait un par document) : comme à l'inscription, chaque document à envoyer porte une flèche et s'ouvre en touchant sa ligne, avec « Touchez un document à envoyer pour l'ajouter » ; un document en règle ou en vérification n'est pas cliquable du tout (demandé par le user, 2026-11-10). **Corrigé par le user le 2026-11-10** : la flèche ne suffit pas, l'écran doit ressembler **exactement** à « Mes documents » de l'inscription (cartes avec icône, étiquette en couleur, rond « + » ou ✓ à droite) et montrer **un indicateur de chargement pendant l'envoi**, comme l'inscription. Fait le 2026-11-10 après l'accord du user (règle `reuseFirst`) : la carte de l'inscription est devenue le composant partagé `DocumentCard` (`lib/core/widgets/document_card.dart`), utilisé par « Mes documents » de l'inscription (même rendu) et par « Vos documents » ; étiquettes À RENOUVELER, À FOURNIR, EXPIRÉ, MANQUANT avec « + », ENVOI... avec une roue de chargement sur la carte envoyée, EN VÉRIFICATION et EN RÈGLE avec ✓, non cliquables |
| Passage en ligne (validé par le user, 2026-11-07, point 8) | Voir « Comment ça marche », 3 et 4 |
| Jamais pendant une course (demandé par le user, validé le 2026-11-07) | Voir « Comment ça marche », 4 |
| File de tâches (validé par le user, 2026-11-07, point 12) | Graphile Worker, dans Postgres |
| Réservations (validé par le user, 2026-11-07) | Voir « Comment ça marche », 6 |
| L'ancien document | Reste valable jusqu'à sa date tant que le nouveau n'est pas validé : envoyer tôt ne fait rien perdre. Une appli du marché conseille dans son aide officielle d'envoyer le document renouvelé dès qu'on l'a |
| Règles | Dans le domaine de l'API, sans tests (règle `noBackendTests`) ; côté mobile, ce qui reste de règle d'affichage en TDD (règle `testsScope`) |
| Fin de validité (validé par le user, 2026-11-07 ; **à vérifier auprès d'un juriste**) | Un document qui « expire le 11 mars » reste valable toute la journée du 11 mars, heure de Paris : le blocage tombe le 12 mars à 00 h 00, heure de Paris, et les rappels se calent sur ce moment. Repris de la règle des délais du Code de procédure civile (article 642 : « Tout délai expire le dernier jour à vingt-quatre heures »), qui vise les délais de procédure et non la validité d'un document : aucun texte trouvé sur l'heure exacte de fin de validité d'une carte professionnelle ou d'un permis. Le chauffeur saisit le jour ; l'API garde l'instant de fin et rend aussi le dernier jour valable, pour l'affichage. Écarté : le blocage dès le début du 11 mars, qui ferait perdre au chauffeur sa dernière journée |
| Dates | Calculs et comparaisons avec date-fns (`subDays`, `isAfter`…), dans l'API et l'app (règle `dateFns`) |
| Lectures et écritures en nombre | L'état d'un chauffeur lu en une requête, jamais une par type ; les chauffeurs bloqués écartés du dispatch en une requête pour tous les candidats ; un nouveau type : les états de tous les chauffeurs écrits en une fois, et ses jobs programmés par type, pas par chauffeur (règle `noNPlusOne`) ; l'envoi groupé des notifications est à lire dans la doc de Firebase Cloud Messaging |
| Écrans | Construits avec `shadcn_flutter` et les composants de `lib/core/widgets` (règle `shadcnOnly`) ; la date avec le `DatePicker` de `shadcn_flutter` 0.0.51 (présent dans `lib/src/components/form/date_picker.dart`), doc lue avant de coder ; aucune nouvelle dépendance prévue, sinon `flutter pub add` lancé par le user (règle `depsCommands`) |
| État de l'app | Blocs à événements scellés, jamais de Cubit (règle `blocOnly`) ; l'écran « Vos documents » ouvert par un état du bloc et le `FlowBuilder`, jamais par `Navigator.push` (`CLAUDE.md` mobile) |

### Règles

| Cas | Résultat |
|---|---|
| Tous les documents valides, aucune expiration à moins de 30 jours | En règle : rien n'est affiché |
| J-30 avant l'expiration d'un document | À renouveler : bandeau, notifications à J-30, J-7, J-1 ; il roule |
| Jour de l'expiration | Bloquant : notification, plus de course proposée, hors ligne s'il n'est pas en course |
| Nouveau type, date limite pas encore passée | À fournir : bandeau, notifications à J-30, J-7, J-1 ; il roule |
| Nouveau type, date limite passée, pas de document validé | Bloquant |
| Document envoyé, l'ancien encore valable | « En vérification » affiché ; il roule jusqu'à la date de l'ancien |
| Document envoyé, l'ancien déjà expiré | Bloquant jusqu'à la validation |
| Type qui expire, document envoyé sans date ou avec une date passée | Refusé (422) |
| Type qui n'expire pas (carte grise) | Pas de date, jamais « à renouveler » |
| Un document expire pendant une course | La course continue ; hors ligne après la fin de course |
| Chauffeur bloqué qui appuie sur « Passer en ligne » | Refusé ; « Vos documents » s'ouvre |
| Réservation après l'expiration d'un document | Pas proposée ; message avec le nombre et la date |

### API

- `GET /v1/drivers/me/documents` : pour chaque type, son nom, l'état calculé depuis les dates (en règle, à renouveler, à fournir, expiré ou manquant), la date d'expiration ou la date limite, et si un document attend la vérification.
- `POST /v1/drivers/me/documents/:documentTypeId` : envoyer un document (recto, verso si demandé, date d'expiration si le type expire). 422 si la date manque ou est passée.
- `PATCH /v1/admin/driver-documents/:id/validate` : l'admin valide un document envoyé, avec la date corrigée s'il le faut ; il remplace l'ancien.
- `POST /v1/drivers/me/online` : vérifie l'état ; 409 `DRIVER.DOCUMENTS_BLOCKING` si bloqué, sinon écrit l'autorisation dans Firebase.
- `GET /v1/bookings/available` : sans les réservations après l'expiration d'un document, avec le nombre caché et la date.
- Inscription : l'envoi des documents prend la date d'expiration des types qui expirent ; la validation par l'admin peut la corriger.
- Firebase : `onlineAllowed/<uid>`, écrit et retiré par le serveur seulement ; `drivers/<uid>` accepté par les règles seulement avec lui.

### Nouveaux éléments

**Réutilisé, pas réécrit (règle `reuseFirst`)** :

- API : l'envoi des fichiers et leurs chemins (`StoragePort`, `drivers/<uid>/<type>/<side>`) et la façon de faire de `SubmitRegistrationDocumentsService` ; la route d'admin qui envoie la commande d'un autre module (`validate-registration-document.admin.http.controller.ts`) ; l'écart des chauffeurs occupés dans le dispatch (`findBusyDriverIds`), modèle pour les chauffeurs bloqués ; `BookingStarter` pour retirer une réservation ; `SendPushCommand` pour les notifications ; `FirebaseAdminService` pour écrire dans Firebase.
- Mobile : l'écran `driver_documents_page.dart` du chauffeur et son ouverture par `DriverFlowBloc` ; la photo et l'envoi de l'inscription (`driver_documents_page.dart` de l'inscription et son cas d'usage), repris pour le renouvellement ; l'entité `DriverDocuments` (« bloque la conduite », « à faire »), adaptée aux états de l'API ; `DriverPresenceRemoteDataSource` pour la présence, inchangée après l'autorisation.

**API** :

- Graphile Worker branché dans NestJS : le worker et ses tâches (rappel, expiration, date limite d'un type) ;
- l'entité de l'état des documents du chauffeur (module chauffeur) ;
- la requête de l'état et sa route ;
- l'envoi d'un document, sa route, sa validation par l'admin ;
- la route de passage en ligne et l'autorisation Firebase ;
- un événement de fin de course levé par `RideEntity` (point 15) et son gestionnaire ;
- le chauffeur bloqué écarté du dispatch et des réservations ;
- la date d'expiration dans l'inscription.

**Mobile** :

- « Vos documents » lu depuis l'API, sans liste fixe ;
- le bandeau de l'accueil ;
- « Passer en ligne » par l'API, et l'écran ouvert quand c'est refusé ;
- l'envoi d'un document, avec sa date ;
- la liste dans l'onglet Compte ;
- les réservations cachées avec leur message ;
- la date d'expiration dans l'écran « Mes documents » de l'inscription.

### Tables touchées

- `document_types` : `expires` (oui ou non, « non » par défaut) et `requiredFrom` (date limite, vide pour un type obligatoire tout de suite) (point 10).
- `documents` : `expiresAt`, déjà là, enfin rempli ; vide pour un type qui n'expire pas (point 10).
- `registration_documents` : la date d'expiration saisie à l'inscription, vide pour un type qui n'expire pas.
- Nouvelle table des documents envoyés en attente de l'admin, une par chauffeur et par type, pour ne pas mêler un document validé et une demande.
- Schéma `graphile_worker`, créé par la bibliothèque (point 12).

Contraintes exprimées dans `schema.prisma` seulement (règle `prismaOnlySchema`) ; la date obligatoire d'un type qui expire est vérifiée dans l'entité.

### Hors périmètre

- Un écran d'admin (point 5).
- Refuser un document envoyé (`documentReviewUnfinished` dans la mémoire de l'API), comme pour l'inscription.
- Lire la date d'expiration sur la photo.
- Un délai de prévenance par type (point 3).
- Passer `BookingStarter` sur la file de tâches.
- Suspendre un chauffeur pour une autre raison (`suspensionNotEnforced`).

## À valider

1. **Les documents à demander. Validé par le user, 2026-11-07** : les 4 types d'aujourd'hui pour construire la mécanique ; les autres ajoutés ensuite comme des données (`docs/a-faire.md`). Sources lues : la carte professionnelle a « une durée de validité de cinq ans » (arrêté du 28 juin 2018) et son renouvellement demande une formation continue 3 mois avant la fin ; un avis médical d'un médecin agréé ; le contrôle technique « 1 fois par an », sans rappel de l'État (service-public) ; la périodicité du taximètre reste à trouver.
2. **Les types qui expirent, et qui saisit la date. Validé par le user, 2026-11-07** : un indicateur « expire » par type, fixé par l'admin ; le chauffeur saisit la date à l'envoi, l'admin la vérifie sur la photo et peut la corriger ; l'inscription la demande aussi (noté dans `inscription-chauffeur.md`). Écarté : la date saisie par l'admin seul.
3. **Quand prévenir. Validé par le user, 2026-11-07** : « à renouveler » à J-30 pour tous les types en v1 ; notifications à J-30, J-7, J-1 et le jour J. 30 jours : le temps réaliste d'un rendez-vous et de la validation ; aucune source du marché ne donne de délai. Plus tard : un délai par type.
4. **La date limite d'un nouveau type. Validé par le user, 2026-11-07** : une date fixée par l'admin (« obligatoire à partir du 1er mars »), pour coller à la loi ; avant, « à fournir » et notifications au rythme du point 3 ; après, bloquant ; les 4 types d'aujourd'hui sans date limite.
5. **Comment l'admin ajoute un type. Validé par le user, 2026-11-07** (« le temps de dév l'interface admin on ajoute juste dans la seed et c'est tout ») : dans `prisma/seed.ts`, puis `npm run db:seed` ; marche à suivre écrite à l'étape 2 du plan. Écartés : l'écriture à la main en base, une route ou un écran d'admin (il faut d'abord un vrai rôle admin).
6. **Les inscriptions en cours. Validé par le user, 2026-11-07, version revue** : un type ajouté est demandé aux inscriptions en cours et futures ; la date limite ne vaut que pour les chauffeurs inscrits. Une inscription qui attend la validation et à qui il manque le type revient à `DOCUMENTS` et reçoit « Un nouveau document est demandé » ; l'app rouvre « Mes documents » de l'inscription, avec ce message ; le type y apparaît avec « Ajouter ». Écartée : montrer le document manquant sur l'écran d'attente. Le moment où l'API repère ces inscriptions : point 14.
7. **Les chauffeurs de test sans documents. Validé par le user, 2026-11-07** : laissés bloqués ; un nouveau chauffeur sert aux essais ; les dates sont modifiées en base pour tester, avec l'accord du user. Écarté : leur recopier des documents par du SQL écrit à la main.
8. **Bloquer le passage en ligne. Validé par le user, 2026-11-07, version revue** (voir « Comment ça marche », 3 et 4) : « Passer en ligne » appelle l'API (idée du user), qui écrit l'autorisation `onlineAllowed/<uid>` ; les règles Firebase refusent la présence sans elle ; l'app écrit ensuite sa position comme aujourd'hui, sinon chaque position et chaque retour de réseau passerait par l'API. Pendant une course, rien : l'app passager suit le taxi par `drivers/<uid>` (`ride_remote_datasource.dart`). Après chaque fin de course, à part de la requête pour ne jamais la faire échouer, l'API retire l'autorisation d'un chauffeur bloqué. Écartés : le blocage par l'app seule ; retirer la présence en pleine course (figerait la carte du passager) ; une tâche quotidienne (pas précise).
9. **Partager une règle du domaine avec une lecture. Écarté par le user, 2026-11-07** : le `CLAUDE.md` a raison, une requête ne passe jamais par le domaine (règle `readNeverDomain`, dans `.aimemory/prefs.md`).
10. **Les colonnes vides. Validé par le user, 2026-11-07** : `documents.expiresAt` gardée, vide veut dire « n'expire pas » (choix du user, contre la règle `noNullableNoDuplicate`) ; `document_types.expires` (oui ou non) pour savoir s'il faut demander la date ; l'entité refuse un document sans date quand son type expire ; `document_types.requiredFrom`, vide pour un type obligatoire tout de suite. Écartés : les sous-tables `document_expiries` et `document_type_deadlines` ; la séparation en types et documents « qui expirent » et « permanents » pour que la base l'impose par sa structure, qui doublait les tables et les lectures.
11. **Comment la lecture obtient l'état. Validé par le user, 2026-11-07, puis revu au point 13** : d'abord un état enregistré, écrit par les jobs ; remplacé par l'état calculé depuis les dates (point 13). Écartée : une tâche quotidienne.
12. **La file de tâches. Validé par le user, 2026-11-07 : Graphile Worker.**
   - Le besoin : agir à une date précise, annuler ou reprogrammer quand le document est renouvelé, garder les tâches après un redémarrage, relancer celles qui échouent.
   - Postgres ne fait que garder la liste des tâches, comme un agenda ; le travail est fait par le worker, dans notre serveur NestJS, avec notre code.
   - **Graphile Worker** (retenu) : tâches dans Postgres, déjà là ; `runAt` (« A Date to schedule this task to run in the future ») ; une clé choisie par nous (`jobKey`) : reprogrammer avec la même clé remplace la tâche (mode `replace`, par défaut), `remove_job('clé')` l'annule ; 25 essais sur environ 3 jours par défaut ; PostgreSQL 12+ et Node 22.18+.
   - **pg-boss** (écarté) : aussi dans Postgres, mais une tâche s'annule par l'identifiant qu'il génère (`cancel(id)`), à garder en base ; sa `singletonKey` limite le débit, elle ne remplace pas.
   - **BullMQ** (écarté) : il couvre aussi le besoin (`jobId` choisi par nous, `changeDelay`, retrait), a le seul module NestJS officiel et la plus grande communauté ; ses avantages (vitesse et volume de Redis en mémoire, Redis souvent déjà là) pèsent pour d'autres projets. Chez nous : un volume minuscule, pas de Redis (un serveur de plus à installer, sauvegarder, surveiller), et surtout valider le document et programmer ses jobs doivent se faire dans la même transaction, ce que seule une file dans Postgres permet (même famille de problème que `validatedPushBeforeCommit`). Si le volume explosait, le passage à BullMQ garderait notre code de tâches.
   - Sources : [Graphile Worker](https://worker.graphile.org/docs), [addJob](https://worker.graphile.org/docs/library/add-job), [Job key](https://worker.graphile.org/docs/job-key), [Requirements](https://worker.graphile.org/docs/requirements) ; [pg-boss – Jobs API](https://github.com/timgit/pg-boss/blob/master/docs/api/jobs.md), [pg-boss](https://pgboss.io/) ; [NestJS – Queues](https://docs.nestjs.com/techniques/queues), [BullMQ – Delayed jobs](https://docs.bullmq.io/guide/jobs/delayed), [BullMQ – Job ids](https://docs.bullmq.io/guide/jobs/job-ids).
13. **L'état, calculé et non enregistré. Validé par le user, 2026-11-07** (« si la ligne n'est pas là c'est que le doc est manquant » ; « ça on peut le calculer non ? ») : aucune colonne ni table d'état. Un document manquant, c'est l'absence de ligne dans `documents` pour un type ; « à fournir » ou « manquant » se lit à `requiredFrom` (à venir, ou passée et vide) ; « à renouveler » et « expiré » à `expiresAt` ; « en vérification » à la présence d'un document en attente. Les faits, `requiredFrom` et `expiresAt`, sont gardés ; l'état, un résultat, n'est pas recopié : pas de doublon, et jamais faux si un job est en retard. Écartés : une table `driver_document_statuses` (une ligne par chauffeur et par type), puis une colonne `status` sur `documents` écrite par les jobs, et vider `requiredFrom` à la date limite (on perdait la date).
14. **Les jobs d'un type ajouté par le seed. Validé par le user, 2026-11-07, temporaire jusqu'à l'écran d'admin** : le nouveau type apparaît sur le téléphone et bloque à sa date limite sans rien faire, car l'état se calcule (point 13). Seuls les jobs (rappels à J-30, J-7, J-1 ; le jour de la date limite, notification et hors ligne de ceux qui ne l'ont pas et ne sont pas en course) doivent être programmés, et le seed écrit en base sans passer par l'API. Le seed les programme donc lui-même en ajoutant le type, par la fonction SQL `add_job` de Graphile Worker (à vérifier dans sa doc), un job par date pour le type et non par chauffeur, avec des clés fixes : relancer le seed ne double rien ; chaque job traite d'un coup tous les chauffeurs concernés (règle `noNPlusOne`). Le renvoi des inscriptions en attente sur « Mes documents » (point 6) se fera par ces jobs ou par le seed, à préciser après la doc. Les documents validés par l'admin passent par l'API, qui programme leurs jobs elle-même ; le futur écran d'admin fera de même pour les types, et cette partie du seed disparaîtra. Écarté : une vérification au démarrage du serveur, qui ne redémarre pas à chaque ajout en production.
15. **L'événement de fin de course. Tranché par Claude, choix technique, 2026-11-07, tel que proposé.** `RideEntity` ne lève aujourd'hui aucun événement de domaine. Proposé : un événement `RideEnded` levé par l'entité à chaque fin (terminée, annulée, absence, désistement), écouté par le module chauffeur, qui retire l'autorisation d'un chauffeur bloqué ; publié après l'écriture, comme le veut `CLAUDE.md`. Écarté : appeler la vérification depuis chaque commande de fin, quatre endroits à ne pas oublier.

16. **La table des documents en attente. Tranché par Claude, choix technique, 2026-11-07, tel que proposé.** Elle reprend les colonnes de `documents` (type, recto, verso vide pour la carte grise, date vide pour un type qui n'expire pas), ce que la règle `noNullableNoDuplicate` demande d'éviter. Proposé : la garder, car un document en attente n'est pas un document validé (l'admin peut le refuser plus tard, l'ancien reste valable en attendant), comme `registration_documents` et `documents` le font déjà ; le verso et la date vides suivent les choix existants et le point 10. Écarté : une colonne d'état dans `documents`, qui mêlerait le document valable et celui qui attend, et compliquerait la règle « l'ancien reste valable ».

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque ; ici, toutes d'un coup à la demande du user.

### Étape 1 : préparer Graphile Worker (API)

- [x] Doc officielle lue et citée : `run()` (`connectionString`, `taskList`, `concurrency`, `noHandleSignals`, `runner.stop()`), les tâches (`payload`, une erreur relance le job), `addJob` (`runAt`, `jobKey`, `jobKeyMode`), `add_job` et `remove_job` en SQL, `makeWorkerUtils().migrate()`. Les jobs sont ajoutés par `add_job` en SQL, par le client Prisma de la transaction en cours (`GraphileJobScheduler`) : ils n'existent que si la transaction est enregistrée
- [ ] Doc de Prisma : elle ne dit pas si `migrate` regarde un schéma qu'il ne gère pas (`graphile_worker`) ; la migration du 2026-11-07 est passée, mais le schéma n'existait pas encore : à revoir à la prochaine
- [x] Node relevé à 22.22.0 dans `volta` de `package.json` (le projet n'a pas de champ `engines`) ; la version du serveur de production reste à vérifier avec le user
- [x] Commande lancée par le user : `npm install graphile-worker` (2026-11-07)
- [x] `JobsModule` (`src/libs/jobs`) : `JobWorker` démarre avec l'application, chaque module y inscrit ses tâches, chaque job tourne dans son propre contexte de requête (comme `BookingStarter`)

### Étape 2 : base de données et seed (API)

- [x] `schema.prisma` : `expires` et `requiredFrom` sur `DocumentType` ; `expiresAt` sur `RegistrationDocument` ; un document par chauffeur et par type ; `driver_document_submissions` ; aucune colonne d'état
- [x] Commandes lancées par le user : `npm run migration:dev --name driver_documents`, puis `npm run prisma:generate` ; migration `20261107193044_driver_documents` appliquée
- [x] Seed relançable (il créait le passager de démo à chaque fois et plantait la deuxième fois) ; `expires` pour la carte professionnelle, le permis et la carte d'identité ; la marche à suivre pour ajouter un type en commentaire ; il installe le schéma de la file, puis programme les jobs d'un type **nouveau** seulement (point 14)
- [x] Commande lancée par le user : `npm run db:seed` ; vérifié en base : `expires` à oui sauf la carte grise, schéma `graphile_worker` créé (6 tables)

### Étape 3 : l'état et les jobs (API)

- [x] `driver-documents.config.ts` : le seuil de 30 jours, les rappels, les noms et les clés des jobs, lu aussi par le seed
- [x] `GetDriverDocumentStatesQuery` : l'état de chaque type pour un ou plusieurs chauffeurs, calculé dans la lecture (3 lectures pour tous), avec « bloqué » et « en règle jusqu'au » ; `GET /v1/drivers/me/documents`
- [x] Jobs : rappels J-30, J-7, J-1 et expiration (notification, puis hors ligne s'il n'est pas en course), rappels et date limite d'un nouveau type, nouveau type ajouté (dossiers en attente renvoyés sur « Mes documents ») ; aucun n'écrit d'état ; notifications groupées par `SendPushToUsersCommand` (les jetons en une lecture)
- [x] À la création du chauffeur : la date de chaque document recopiée, et ses jobs programmés dans la transaction du compte
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles, `npm run deps:validate` à ses 5 erreurs connues (le user, 2026-11-07). Deux erreurs de ce code corrigées : le gestionnaire de création du chauffeur passe par `ScheduleDocumentJobsCommand` au lieu d'appeler un service de l'application (l'outil classe en domaine tout fichier `domain-event-handler`), et `FindMyVehicleQuery` renvoie un modèle de lecture au lieu d'un DTO d'API

### Étape 4 : renouveler un document (API)

- [x] `POST /v1/drivers/me/documents/:documentTypeId` : fichiers rangés à part (`drivers/<uid>/<type>/renewal-<id>/`), le document valable reste ; `PATCH /v1/admin/driver-documents/:submissionId/validate` (date corrigeable), qui remplace le document et reprogramme ses jobs dans une transaction
- [x] Inscription : la date à l'envoi (obligatoire pour un type qui expire, 422 sinon), corrigeable à la validation (`expiresAt` dans le corps de la route d'admin) ; `GET registration-document-types` renvoie `expires`

### Étape 5 : en ligne et courses (API)

- [x] Doc officielle des règles lue : une règle peut lire une autre branche par `root.child(...)` et comparer `$uid` à `auth.uid`. Que le SDK Admin passe outre les règles n'y est pas écrit : à vérifier
- [x] `POST /v1/drivers/me/online` (409 `DRIVER.DOCUMENTS_BLOCKING`) et `onlineAllowed/<uid>` ; retrait groupé en un `update`
- [ ] Règles Firebase publiées par le user dans la console (texte ci-dessous)
- [x] `RideEnded` levé par `RideEntity` (terminée, annulée avec un chauffeur, absence, désistement) ; le module chauffeur passe hors ligne un chauffeur bloqué, la course qui vient de finir exclue
- [x] Dispatch : chauffeurs bloqués écartés en une lecture ; réservations : liste filtrée, acceptation refusée (`RIDE.DRIVER_DOCUMENTS_END_BEFORE`), `BookingStarter` traite un chauffeur bloqué comme hors ligne

Règles à ajouter dans la console Firebase, en gardant la lecture actuelle de `drivers` :

```json
"onlineAllowed": {
  "$uid": { ".read": "auth != null && auth.uid === $uid", ".write": false }
},
"drivers": {
  "$uid": {
    ".write": "auth != null && auth.uid === $uid && (!newData.exists() || root.child('onlineAllowed').child($uid).val() === true)"
  }
}
```

Retirer sa présence reste toujours permis (passer hors ligne, déconnexion).

### Étape 6 : les écrans (mobile)

- [x] Doc du `DatePicker` de `shadcn_flutter` 0.0.51 lue dans le paquet installé (`value`, `onChanged`, `mode`, `stateBuilder`) : `ExpiryDateField` (`lib/core/widgets`), seuls les jours après aujourd'hui
- [x] Tests d'abord (TDD) : `DriverDocuments` (8 tests : états, « à fournir », document en attente non redemandé, fin la plus proche) et `CheckRegistrationValidatedUseCase` (nouveau document demandé) ; 121 tests verts
- [x] « Vos documents » lu depuis l'API, sans liste fixe ; envoi d'un document avec sa date ; bandeau de l'accueil ; « Passer en ligne » par l'API et l'écran au refus ; hors ligne quand le serveur retire l'autorisation ; message des réservations cachées ; date dans « Mes documents » de l'inscription ; retour sur « Mes documents » quand un nouveau type est demandé. La case photo de l'inscription est devenue `DocumentPhotoSlot` (`lib/core/widgets`), reprise par le renouvellement
- [x] Vérifications : `dart format` et `flutter analyze` sur les fichiers touchés seulement (aucune erreur ni avertissement), 121 tests verts, lint Bloc à ses 6 alertes habituelles

- [x] Corrigé après un test du user (2026-11-08) : en rouvrant un document déjà envoyé à l'inscription, le champ « Date d'expiration » était vide alors que la date était bien en base (20 novembre). La liste des documents envoyés (`GET registration-flows/me/documents`) ne la rendait pas ; elle rend maintenant `lastValidDay`, et la feuille remplit le champ avec

### Étape 6 bis : prévenir le chauffeur quand son document est validé (validé par le user, 2026-11-10)

Constat au test de C7 : l'admin valide la carte renouvelée, mais l'app reste sur « EN VÉRIFICATION » et « Un document vous empêche de passer en ligne » ; aucune notification, l'écran ne se met pas à jour. Oubli de la spec. Ce que voit le chauffeur, validé par le user :

1. L'admin valide son document : il reçoit « Document validé », avec « vous pouvez de nouveau passer en ligne » s'il ne reste aucun document bloquant.
2. App ouverte sur « Vos documents » : l'écran se met à jour aussitôt ; plus aucun problème, l'accueil s'ouvre ; sinon il reste, avec le nouvel état.
3. Appui sur la notification : même résultat.
4. Sans notification (permission refusée) : l'écran se met à jour au retour dans l'app.

- [x] API : la validation programme le job `document-validated-push` dans sa transaction (comme « Dossier validé ») ; la tâche envoie « Document validé » avec l'étiquette `documents`, et « Vous pouvez de nouveau passer en ligne » ou « Un autre document reste à envoyer » selon l'état
- [x] Mobile : une notification de documents reçue (app ouverte) ou touchée relit les documents (`WatchDocumentNotificationsUseCase`) ; le retour dans l'app aussi, y compris depuis « Vos documents » ; ouvert pour un problème, l'écran laisse place à l'accueil quand il n'y en a plus ; ouvert depuis le Compte, il se met à jour et reste ; jamais pendant une course ni pendant un envoi
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles ; côté app, aucune erreur ni avertissement, tests verts, lint Bloc à ses 6 alertes
- [x] Testé par le user le 2026-11-10 (C7) : notification « Document validé » reçue, « Vos documents » laisse place à l'accueil

### Écarts faits en codant (à valider par le user)

- Le message des réservations ne compte pas les réservations cachées (« 3 réservations… ») : il dit la date et le document. La liste garde sa forme, l'app lit la date dans ses documents.
- Le bandeau se met à jour à l'ouverture de l'app, au refus de « Passer en ligne » et après un envoi ; pas encore au retour dans l'app ni à une notification de documents.
- La règle de la date (obligatoire, pas passée) est écrite dans l'entité de l'inscription et dans celle du renouvellement : un module n'importe jamais l'entité d'un autre.
- Le seed ne reprogramme pas les jobs si l'on change la date limite d'un type déjà en base.
- L'inscription garde sa propre prise de photo ; seule la case photo est partagée.

### Étape 7 : test (par le user, sur Android)

- [x] Nouveau chauffeur avec ses dates (C7, 2026-11-08) : 4 documents validés, recopiés avec leurs dates ; 11 jobs programmés aux bonnes heures de Paris (carte d'identité au 20 novembre : rappels J-7 et J-1, expiration le 21 à 00 h 00 ; J-30 déjà passé, pas programmé ; carte grise sans job)
- [x] « À renouveler » visible sur l'app (C7, 2026-11-10) : bandeau sur l'accueil, écran « Vos documents » (3 sur 4 en règle), message des réservations ; les réservations jusqu'au 20 novembre proposées. Au passage : l'onglet ne montre que les réservations proches, le chauffeur de test doit être placé à Strasbourg (émulateur à Mountain View par défaut)
- [x] « Bloquant » (C7, 2026-11-10) : carte d'identité passée en base au 9 novembre inclus, avec l'accord du user ; « Vos documents » s'ouvre à l'arrivée, « Expiré », sans « Plus tard » ; validé par le user
- [x] Renouvellement (C7, 2026-11-10) : carte envoyée depuis l'app (« EN VÉRIFICATION », fichiers rangés à part), validée par la route d'admin (200) ; elle remplace l'ancienne dans `documents`, la demande disparaît, les jobs sont reprogrammés sur la nouvelle date (rappel J-1 et expiration ; ceux du 21 novembre remplacés par les mêmes clés, le J-7 passé retiré)
- [ ] Bloqué : « Passer en ligne » refusé ; une course en cours continue et la carte du passager suit le taxi ; hors ligne après la fin
- [ ] Renouvellement validé : en règle, réservations revenues
- [ ] Nouveau type dans le seed : « à fournir », puis bloquant après la date limite ; inscription en attente renvoyée sur « Mes documents »

### Fin de feature

- [x] Mettre à jour `.aimemory` des deux dépôts (2026-11-10)
- [ ] Proposer au user, sans les écrire avant son accord, les lignes de `CLAUDE.md` : côté mobile, le chemin `onlineAllowed/{uid}` dans la liste des chemins Firebase ; côté API, le worker de Graphile Worker et son schéma dans « Commands »
- [ ] Commiter quand le user le demande

## Sources

Pages d'aide officielles de trois applis du marché, lues le 2026-11-07 ; leurs noms et leurs liens ne sont pas écrits ici (règle `noCompetitorNames`) :

- les documents sont listés dans le compte avec leur date d'expiration ; le chauffeur remplit la date « where applicable » ; il est conseillé d'envoyer le document renouvelé dès qu'on l'a ;
- un document expiré, ou à renvoyer, est une des raisons de ne pas pouvoir passer en ligne ; le chauffeur est prévenu par e-mail et dans l'app ;
- « Failing to update a required document before the expiration date results in temporary deactivation » ;
- aucune ne dit à combien de jours avant l'échéance prévenir, ni ne décrit un écran ouvert à chaque connexion.

Sources officielles françaises :

- [Arrêté du 28 juin 2018 relatif aux cartes professionnelles de conducteur de taxi](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000037161993/2023-12-01), article 2 : « Les cartes professionnelles ont une durée de validité de cinq ans à compter de la date de leur délivrance. »
- [Service-public – Devenir chauffeur de taxi](https://entreprendre.service-public.gouv.fr/vosdroits/F21907) : « Seul un médecin agréé peut faire ce contrôle » ; « 3 mois avant la fin de validité, vous devez effectuer une formation continue » ; « Le contrôle technique est obligatoire la 1re année de votre activité, puis 1 fois par an » ; « vous ne recevez aucun rappel »
- [Firebase – Message priority (Android)](https://firebase.google.com/docs/cloud-messaging/android/message-priority), pour la relecture de l'écran d'attente (`validation-du-dossier.md`, point 2)
