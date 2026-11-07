# Le vrai véhicule du chauffeur

> Statut : spec validée par le user le 2026-11-05, points 1 à 5 compris ; étapes 1 à 5 codées le 2026-11-05, à la suite à la demande du user, non commitées ; le test (étape 6) attend le user. Ajout du 2026-11-07 (point 7, étape 7) : plaque et numéro de taxi déjà pris refusés à la saisie ; codé le 2026-11-07 sur le « go » du user, non commité ; testé par le user le 2026-11-07.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

## Spec

### Besoin

Demandé par le user le 2026-11-05. Quand un chauffeur accepte, le passager voit « Toyota Corolla Touring noire », la plaque « GH-482-KZ » et « Taxi n° 118, Strasbourg » : tout est inventé, le même pour tous les chauffeurs (`simulated_driver_and_vehicle_json.dart`). C'est pourtant ce qui sert au passager à reconnaître son taxi et à monter dans le bon. L'onglet Compte du chauffeur montre aussi un véhicule inventé.

Aujourd'hui, l'inscription chauffeur demande le compte, l'e-mail, le nom, puis les documents (permis, carte grise, carte professionnelle, carte d'identité), validés un par un par l'admin. Rien du véhicule n'est saisi ni gardé.

### Comment ça marche

```text
Inscription chauffeur
  Compte → E-mail → Nom → « Votre taxi » (nouveau) → Documents → En attente de validation
                            ↓
  App → API : PUT /v1/registration-flows/me/vehicle
              { marque et modèle, couleur, plaque, numéro d'autorisation de stationnement, commune }
  API → Postgres : driver_registration_vehicles (le véhicule de l'inscription)
                            ↓
  Admin : compare la carte grise envoyée avec la plaque saisie, puis valide les documents
                            ↓
  Inscription terminée → le chauffeur est créé (UserCreated)
  API → Postgres : driver_vehicles (le véhicule du chauffeur), copié depuis l'inscription

Course
  Chauffeur accepte → API → Firebase : rides/<id>/driver/vehicle
                                       { marque et modèle, couleur, plaque, numéro, commune }
  App passager lit rides/<id> → « Renault Austral grise », plaque AB-123-CD, « Taxi n° 118, Strasbourg »

Compte chauffeur
  App → API : GET /v1/drivers/me/vehicle → le véhicule affiché, en lecture seule
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS ; iOS préparé et non testé, faute de Mac |
| Où le saisir (validé par le user, 2026-11-05) | Une étape « Votre taxi » à l'inscription, après le nom et avant les documents, qui existent déjà : le chauffeur saisit le véhicule puis envoie la carte grise qui le prouve, l'admin compare les deux |
| Ce qui est saisi | Marque et modèle (« Renault Austral »), couleur, plaque d'immatriculation, numéro de l'autorisation de stationnement (le « Taxi n° 118 ») et commune de rattachement (« Strasbourg ») : ce que le passager voit pour reconnaître le taxi |
| Couleur | Une liste fixe : noir, blanc, gris, argent, bleu, rouge, vert, beige, marron, autre. Écarté : le texte libre, qui donne « nr », « Noire mat »… |
| Plaque | Format actuel (SIV) « AB-123-CD », sans les anciennes plaques « 123 ABC 67 ». Saisie libre, gardée en majuscules avec des tirets ; refusée si elle n'a pas ce format |
| Commune | Choisie dans une liste de communes, par son code INSEE, pas tapée librement : la même commune s'écrit toujours de la même façon. Source à fixer (point 3) |
| Ce que voit le passager | Marque et modèle avec la couleur, la plaque, « Taxi n° <numéro>, <commune> ». Les données inventées sont retirées |
| Règles | Dans les entités de l'API (pas de tests côté API) ; côté mobile, le format de la plaque est une règle testée en TDD |

### Règles

| Cas | Résultat |
|---|---|
| Plaque saisie « ab123cd » | Gardée « AB-123-CD » |
| Lettres tapées en minuscules dans le champ de la plaque | Écrites en majuscules dès la frappe, quel que soit le clavier (demandé par le user, 2026-11-06) |
| Plaque sans le format « AB-123-CD » | Refusée : « Plaque au format AB-123-CD » |
| Plaque déjà enregistrée par un autre chauffeur ou une autre inscription (point 7) | Refusée à « Continuer » : « Cette plaque est déjà enregistrée » sous le champ |
| Numéro de taxi déjà enregistré dans la même commune, par un autre chauffeur ou une autre inscription (point 7) | Refusé à « Continuer » : « Ce numéro de taxi est déjà enregistré à <commune> » sous le champ |
| Le chauffeur enregistre à nouveau son propre véhicule | Accepté : sa propre inscription est ignorée, comme pour l'e-mail |
| Champ vide | « Continuer » reste grisé |
| Recherche de commune en cours | Une roue de chargement dans le champ, à droite, jusqu'à la réponse ; les résultats d'avant restent, grisés et impossibles à toucher, puis sont remplacés (demandé par le user, 2026-11-06 ; d'abord une roue au-dessus de la liste, qui la faisait sauter et laissait les anciens résultats l'air à jour). Fait avec les composants partagés `SearchTextField` et `SearchResults` (`lib/core/widgets`), repris par la recherche « Votre trajet » du passager |
| Commune cherchée hors de France (« London ») ou sans résultat | « Aucune commune trouvée en France » sous le champ (demandé par le user, 2026-11-06) : la liste ne connaît que les communes françaises, comme l'autorisation de stationnement |
| Retour depuis les documents | « Votre taxi » s'ouvre avec ce qui a été saisi |
| Véhicule saisi à nouveau avant validation | Il remplace le précédent |
| Inscription terminée | Le véhicule devient celui du chauffeur |
| Course acceptée | Le passager voit ce véhicule |

### API

- `PUT /v1/registration-flows/me/vehicle` : enregistre ou remplace le véhicule de l'inscription. 422 si un champ est invalide. 409 si la plaque (`REGISTRATION.VEHICLE_PLATE_TAKEN`) ou le numéro de taxi dans la commune (`REGISTRATION.VEHICLE_LICENCE_TAKEN`) est déjà pris (point 7).
- `GET /v1/registration-flows/me` : renvoie aussi le véhicule saisi, pour préremplir l'écran.
- `GET /v1/drivers/me/vehicle` : le véhicule du chauffeur, pour l'onglet Compte.
- Firebase `rides/<id>/driver/vehicle`, écrit par le serveur quand un chauffeur accepte, comme son nom et sa note aujourd'hui.

### Nouveaux éléments

**API** :

- l'étape `VEHICLE` dans `DriverRegistrationStep`, entre `NAME` et `DOCUMENTS` ;
- le véhicule dans l'entité d'inscription chauffeur (format de la plaque, couleur dans la liste) ;
- une commande pour enregistrer le véhicule de l'inscription, et sa route ;
- à la création du chauffeur, la copie du véhicule de l'inscription ;
- une requête pour le véhicule du chauffeur, et sa route ;
- le véhicule dans `findParticipants`, publié dans `rides/<id>/driver`.

**Mobile** :

- la page « Votre taxi » de l'inscription chauffeur, construite avec `shadcn_flutter` (règle `shadcnOnly`) ;
- la règle du format de la plaque (TDD) ;
- le véhicule lu dans `rides/<id>/driver/vehicle` par l'app passager, à la place des données inventées ;
- le véhicule réel dans l'onglet Compte du chauffeur ; le reste du compte reste simulé.

### Tables touchées

- Nouvelle `driver_registration_vehicles` : `driverRegId` (clé), marque et modèle, couleur, plaque, numéro d'autorisation, code et nom de la commune. Une sous-table plutôt que des colonnes vides sur `DriverRegistration` (règle `noNullableNoDuplicate`).
- Nouvelle `driver_vehicles` : `driverId` (clé, lié à `drivers`), les mêmes champs. Un véhicule par chauffeur.
- `DriverRegistrationStep` : la valeur `VEHICLE`.

Contraintes exprimées dans `schema.prisma` seulement (règle `prismaOnlySchema`) ; le format de la plaque est vérifié dans l'entité.

### Hors périmètre

- Changer de véhicule depuis l'onglet Compte (point 2).
- Plusieurs véhicules par chauffeur.
- L'année, le nombre de places, un taxi adapté aux fauteuils.
- La photo du véhicule.
- Lire la plaque sur la photo de la carte grise.

## À valider

1. **Les champs. Validé par le user, 2026-11-05, tel que proposé.** Proposé : marque et modèle en un seul champ libre, couleur dans une liste, plaque au format actuel, numéro d'autorisation de stationnement et commune de rattachement. Écarté pour la v1 : un catalogue de marques et de modèles, long à tenir à jour.
2. **Modifier le véhicule dans l'onglet Compte. Validé par le user, 2026-11-05, tel que proposé.** Le user pensait le permettre, ou non à cause de la carte grise. Proposé : en lecture seule pour la v1. Changer de véhicule demande une nouvelle carte grise et sa validation par l'admin, comme sur les applis du marché ; or l'admin ne peut encore que valider, pas refuser (`documentReviewUnfinished` dans la mémoire de l'API). À faire avec la revue des documents. Écarté : la modification libre, qui laisserait afficher au passager une plaque que personne n'a vérifiée.
3. **La liste des communes. Validé par le user, 2026-11-05, tel que proposé.** Proposé : l'API Découpage administratif de l'État (`geo.api.gouv.fr/communes`), déjà utilisée par le serveur pour trouver le département (`GeoApiTerritoryAdapter`), gratuite et sans clé ; sa doc officielle est à lire avant de coder. Mais elle a été instable (`geoApiUnstable` dans la mémoire de l'API) : à défaut, l'autocomplétion de la Géoplateforme, déjà utilisée pour les adresses.
4. **Le département sur la plaque. Validé par le user, 2026-11-05, tel que proposé.** L'écran du passager dessine une plaque avec le numéro de département à droite (« 67 »). Ce numéro est choisi par le propriétaire et n'est pas lié à la plaque. Proposé : le retirer du dessin, pour ne rien afficher d'inventé. Écarté : le demander au chauffeur, un champ de plus pour un détail.
5. **Les chauffeurs déjà inscrits. Validé par le user, 2026-11-05, tel que proposé.** Ce sont des comptes de test, sans véhicule. Proposé : le passager ne voit pas de bloc véhicule tant qu'il n'y en a pas, et les comptes de test refont l'inscription si le user veut voir un véhicule. Écarté : un écran de rattrapage au démarrage, du code pour des comptes qui n'existeront pas en production.

6. **Migrer les modèles du flux d'inscription (trouvé en codant l'étape 4, 2026-11-05). Validé par le user, 2026-11-05 : migrer, et coder toutes les étapes sans s'arrêter.** Pour lire l'étape `VEHICLE` et le véhicule, il faut toucher `DriverRegistrationFlowModel`, qui hérite encore de son entité ; le `CLAUDE.md` mobile demande de migrer un tel modèle quand on le touche. La source d'authentification renvoie le flux du passager comme du chauffeur, d'un même type : la migration prend aussi `PassengerRegistrationFlowModel`, la source réelle et la simulée, et le dépôt d'authentification, qui fait `toDomain()`. Environ 6 fichiers, sans règle nouvelle. Proposé : migrer. Écarté : ajouter les champs au modèle sans le migrer, contraire au `CLAUDE.md`.
7. **Plaque et numéro de taxi déjà pris (trouvé au test du 2026-11-07). Validé par le user, 2026-11-07 : choix 2.** Le chauffeur C5 a saisi le taxi n° 185 à Strasbourg, déjà celui du chauffeur 4 : rien ne l'a refusé à la saisie, et à la validation de son dernier document, la contrainte unique de `driver_vehicles` a fait échouer la création du compte (500, compte annulé, inscription restée `COMPLETE`). Demandé par le user : le refuser au moment de la saisie. Fait comme la vérification de l'e-mail (`CheckEmailAvailability`), qui regarde les comptes et les inscriptions en ignorant celle du demandeur. Choix 2 retenu : déjà pris par un chauffeur **ou par une inscription en cours**, ce qui empêche aussi deux inscriptions d'avoir le même numéro et donc l'échec à la fin. Écarté (choix 1) : les chauffeurs validés seulement, comme les applis du marché, pour qu'une inscription abandonnée ou fausse ne bloque pas le vrai propriétaire ; ce risque est noté dans `docs/a-faire.md`. La contrainte unique de `driver_vehicles` reste, en dernier filet.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : base de données (API)

- [x] `schema.prisma` : `VEHICLE`, l'énumération `VehicleColor`, `driver_registration_vehicles`, `driver_vehicles` (plaque unique, et un numéro d'autorisation unique par commune), tout exprimé dans `schema.prisma`
- [x] Commandes lancées par le user : `npm run migration:dev --name add_driver_vehicles`, puis `npm run prisma:generate` ; migration `20261105133620_add_driver_vehicles` appliquée, vérifiée en base le 2026-11-05

### Étape 2 : le véhicule de l'inscription (API)

- [x] Doc officielle de la source des communes lue et citée : [Découpage administratif, communes](https://geo.api.gouv.fr/decoupage-administratif/communes), `GET https://geo.api.gouv.fr/communes` avec `nom`, `boost=population` et `fields` ; pas de clé ; la page ne documente ni `limit` ni limite de débit ; réponse vérifiée sur un appel réel (`nom`, `code`, `codesPostaux`, `codeDepartement`). Appelée par l'app, à l'étape 4
- [x] `DriverRegistrationEntity.saveVehicle` (plaque gardée « AB-123-CD », refusée sinon ; inscription terminée : refusée) et l'étape `VEHICLE` entre `NAME` et `DOCUMENTS`, avancée par `PATCH` depuis `VEHICLE` seulement si le véhicule est donné ; erreurs `REGISTRATION.VEHICLE_PLATE_INVALID`, `REGISTRATION.NOT_DRIVER`, `REGISTRATION.ALREADY_COMPLETE` (422) ; commande `SaveRegistrationVehicleCommand`, route `PUT /v1/registration-flows/me/vehicle`, écriture dans une transaction ; le dépôt lit et remplace la sous-table. `GET` et `PATCH /v1/registration-flows/me` passent désormais par `RegistrationMapper.toResponse`, qu'ils dupliquaient, pour renvoyer le véhicule
- [x] Vérifications : `npx tsc --noEmit` sans erreur ; `npm run lint` à ses 9 erreurs habituelles, aucune dans les fichiers de la feature ; le user lance `npm run deps:validate`

### Étape 3 : le véhicule du chauffeur et de la course (API)

- [x] Copie à la création du chauffeur : le gestionnaire `UserCreated` du module chauffeur lit le véhicule de l'inscription par `FindRegistrationVehicleQuery` (une requête du module inscription, couplage permis par `CLAUDE.md`) et le crée avec le chauffeur ; requête `FindMyVehicleQuery` et route `GET /v1/drivers/me/vehicle` (404 sans véhicule, rôle chauffeur)
- [x] Véhicule dans `findParticipants` (`RideDriver.vehicle`), donc publié dans `rides/<id>/driver/vehicle` ; absent pour un chauffeur sans véhicule
- [x] Vérifications : comme l'étape 2

### Étape 4 : l'étape « Votre taxi » (mobile)

- [x] Test d'abord (TDD) : `RegistrationVehicle.formatPlate`, 4 tests, rouges puis verts
- [x] Migration du point 6 : `DriverRegistrationFlowModel` et `PassengerRegistrationFlowModel` n'héritent plus de leur entité, ils ont `toDomain()` (base `RegistrationFlowModel`) ; la source d'authentification, réelle et simulée, renvoie des modèles et `AuthRepositoryImpl` les convertit ; les entités du flux passent de `base` à `final`
- [x] Étape `vehicle` dans `DriverRegistrationStep` (après `name`, avant `documents` ; le retour depuis les documents y ramène) ; état `DriverRegVehicleReady` et événement `DriverRegistrationVehicleSubmitted` ; `SubmitRegistrationVehicleUseCase` envoie le véhicule (`PUT`) puis passe aux documents (`PATCH` depuis `VEHICLE`), en `Result` ; une plaque refusée par l'API (`REGISTRATION.VEHICLE_PLATE_INVALID`) est dite « Plaque au format AB-123-CD »
- [x] Page `DriverVehiclePage` (shadcn_flutter et `lib/core/widgets` : `ChoiceButton` pour la couleur, `PlaceListTile` pour la commune), préremplie au retour ; la commune est cherchée par `SearchCommunesUseCase` dans `geo.api.gouv.fr` (source appelée par l'app, sans l'intercepteur Firebase), avec `CommuneSearchBloc`, la liste coupée à 5 ; `VehicleColor` dans `lib/core`, avec le libellé de la liste (« Gris ») et l'adjectif pour le passager (« grise »)
- [x] Vérifications : voir l'étape 5
- [x] Corrigé après un test du user (2026-11-06) : reprise sur les documents après une relance, puis retour à « Votre taxi », l'écran était vide. La page, construite sous les documents au démarrage, se remplissait avec l'état des documents, qui ne porte pas le véhicule. Elle se remplit aussi en arrivant sur l'étape, avec le véhicule de `DriverRegVehicleReady`

### Étape 5 : le véhicule chez le passager et dans le Compte (mobile)

- [x] Lecture de `rides/<id>/driver/vehicle` par la vraie source, les données inventées ne servent plus qu'à la source simulée ; plaque sans département (`LicensePlate` n'a plus que la bande « F ») ; sans véhicule, le passager ne voit ni véhicule, ni plaque, ni « Taxi n° » (point 5). Choix faits en codant : l'entité `Vehicle` du passager est déplacée dans `lib/core` et reprise par le Compte, plutôt qu'une deuxième entité (règle `reuseFirst`) ; le numéro et la commune passent de `Driver` à `Vehicle` (`licence` : « Taxi n° 118, Strasbourg » ; `description` : « Renault Austral grise »)
- [x] Véhicule réel dans l'onglet Compte : `DriverVehicleRepository` (`GET /v1/drivers/me/vehicle`, un 404 veut dire « aucun véhicule »), ajouté au profil encore simulé par `LoadDriverAccountUseCase` ; en lecture seule (point 2) ; « Aucun véhicule enregistré. » sans véhicule
- [x] Vérifications : `dart format` et `dart fix` (ordre des imports) sur les fichiers touchés seulement, `flutter analyze` sans erreur ni avertissement (restent des remarques déjà là), 113 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 6 : test (par le user)

- [ ] Inscription d'un nouveau chauffeur avec son taxi ; l'admin valide ses documents
- [ ] Une course : le passager voit la marque, la couleur, la plaque, le numéro et la commune saisis
- [ ] L'onglet Compte du chauffeur montre le même véhicule

### Étape 7 : plaque et numéro de taxi déjà pris (point 7)

- [x] API : avant d'enregistrer le véhicule de l'inscription, `CheckVehicleAvailabilityQuery` (comme `CheckEmailAvailability`, deux lectures en parallèle) regarde si la plaque, ou le numéro de taxi dans la commune, est déjà dans `driver_vehicles` ou `driver_registration_vehicles`, en ignorant l'inscription du demandeur ; la plaque comparée est celle gardée (« AB-123-CD »). La règle est dans l'entité, `DriverRegistrationEntity.confirmVehicleAvailable` ; erreurs `REGISTRATION.VEHICLE_PLATE_TAKEN` et `REGISTRATION.VEHICLE_LICENCE_TAKEN` (409)
- [x] Mobile : le dépôt traduit ces deux codes en `VehiclePlateTakenFailure` et `VehicleLicenceTakenFailure` (le cas d'usage les laisse passer) ; l'état de « Votre taxi » garde l'échec lui-même au lieu de son seul texte, et la page montre le message sous le champ de la plaque ou du numéro, tant que le champ garde la valeur refusée ; les autres échecs restent en bas du formulaire
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles ; `dart format` et `flutter analyze` sur les fichiers touchés (aucune erreur ni avertissement, restent des remarques déjà là), 116 tests verts, lint Bloc à ses 6 alertes habituelles
- [x] Test par le user, 2026-11-07 : plaque DD-485-DF déjà prise, message sous la plaque ; n° 120 à Strasbourg déjà pris, message sous le numéro ; n° 120 à Colmar accepté

### Fin de feature

- [ ] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande
