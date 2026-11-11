# Le compte à jour

> Statut : feature close le 2026-11-11, validée par le user sur Android, non commitée. `npm run deps:validate` pas encore lancé.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11 : à chaque arrivée sur l'onglet « Compte », du passager comme du chauffeur, l'app demande à l'API tout le profil affiché, en un seul appel.

Aujourd'hui :

- **Chauffeur** : le nom, le téléphone et l'e-mail sont inventés (« Karim Benali », `DriverAccountRemoteDataSourceFake`) ; le véhicule (`GET /v1/drivers/me/vehicle`) et les documents (`GET /v1/drivers/me/documents`) sont réels, mais lus en deux appels et une seule fois, à l'arrivée sur l'accueil.
- **Passager** : tout est inventé (`AccountRemoteDataSourceFake`), aucun appel.
- Les onglets sont tous construits à l'arrivée sur l'accueil (`IndexedStack`) : l'onglet « Compte » se charge à ce moment-là, puis plus jamais, sauf « Réessayer » après un échec.

### Ce que voit l'utilisateur

**Chauffeur**, en appuyant sur l'onglet « Compte » :

1. À chaque fois : le rond de chargement, le temps de la réponse de l'API.
2. Puis son vrai nom, son téléphone et son e-mail, son véhicule et le résumé de ses documents (« 3 sur 4 validés, une action attendue »), à jour (un document validé entre-temps, par exemple).
3. « Vos documents » ouvre la liste reçue avec ce même appel.
4. Échec de l'appel (pas de réseau) : le message d'erreur et « Réessayer », à la place du contenu. Comme « Gains » aujourd'hui.

**Passager** : pareil, avec son vrai nom, son téléphone et son e-mail. Les adresses enregistrées (« Maison », « Travail ») restent inventées, comme aujourd'hui.

La ligne « Notifications » ne vient pas de l'API : elle lit la permission du téléphone (`NotificationsRow`), et reste comme elle est.

### Comment ça marche

```text
Chauffeur appuie sur « Compte »
  ↓
App → GET /v1/drivers/me/account
  ↓
API : lit dans Postgres
  ├─ users              : prénom, nom, téléphone, e-mail
  ├─ driver_vehicles    : le véhicule (FindMyVehicleQuery, réutilisée)
  └─ documents + types  : l'état de chaque document (GetDriverDocumentStatesQuery, réutilisée)
  ↓
App : affiche le profil, le véhicule, le résumé des documents

Passager appuie sur « Compte »
  ↓
App → GET /v1/me
  ↓
API : lit users dans Postgres : rôle, prénom, nom, téléphone, e-mail
  ↓
App : affiche le profil
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Quand (validé par le user, 2026-11-11) | À chaque appui sur l'onglet « Compte », en plus du premier chargement à l'arrivée sur l'accueil |
| Un seul appel (validé par le user, 2026-11-11) | Un appel par arrivée sur l'onglet, qui rend tout ce qu'il affiche |
| Rechargement (validé par le user, 2026-11-11, remplace « le contenu reste à l'écran ») | À chaque arrivée sur « Compte », passager et chauffeur, le rond de chargement s'affiche à la place du contenu jusqu'à la réponse de l'API. D'abord codé en gardant le contenu sans indicateur, comme « Réservations » et « Gains » : le user ne voyait pas que l'app attendait |
| Route du passager | `GET /v1/me`, enrichie du prénom, du nom, du téléphone et de l'e-mail. Elle rend déjà le rôle au redémarrage de l'app ; le champ `role` ne change pas, l'app au démarrage ignore les nouveaux champs. Pas de route nouvelle pour quatre colonnes de `users` déjà lues par cette route |
| Route du chauffeur | `GET /v1/drivers/me/account`, nouvelle : profil, véhicule et documents en un appel. Le contrôleur envoie trois requêtes par le `QueryBus` : une lecture de `users`, `FindMyVehicleQuery` et `GetDriverDocumentStatesQuery`, toutes deux réutilisées. Pas d'appel au domaine (règle `readNeverDomain`), pas de lecture refaite |
| Lecture du profil | Une requête `GetMyProfileQuery` dans le module `user`, qui lit `users` avec `PrismaService` (lecture CQRS). Utilisée par `GET /v1/me` et par le compte du chauffeur : le module `driver` n'envoie que la classe de la requête, comme `ride` le fait déjà avec `GetDriverDocumentStatesQuery` |
| Véhicule absent | Un chauffeur inscrit avant l'étape « Votre taxi » : `vehicle: null` dans la réponse, l'app affiche « Aucun véhicule enregistré. » comme aujourd'hui |
| Documents dans la réponse | La même forme que `GET /v1/drivers/me/documents`, construite par une seule fonction partagée par les deux contrôleurs, pas recopiée |
| `GET /v1/drivers/me/vehicle` | Retirée : l'onglet « Compte » en était le seul appelant. `FindMyVehicleQuery` reste, utilisée par la nouvelle route |
| `GET /v1/drivers/me/documents` | Inchangée : « Vos documents » s'en sert pour se recharger |
| Mobile, chauffeur | Les sources simulées du profil et le dépôt du véhicule (`DriverVehicleRepository`) sont remplacés par une source réelle de `GET /v1/drivers/me/account` ; `LoadDriverAccountUseCase` n'a plus qu'un dépôt |
| Numéro de « Contacter le développeur », chauffeur puis passager (validé par le user, 2026-11-11) | Demandé à chaque ouverture de l'onglet, en même temps que le compte : `LoadDriverAccountUseCase` lance `GET /v1/drivers/me/account` et `GET /v1/enterprise-contact` ensemble, `LoadAccountUseCase` (passager) `GET /v1/me` et `GET /v1/enterprise-contact`, le rond tourne jusqu'aux deux réponses, un échec de l'un ou l'autre montre « Réessayer ». Voir `aide-chauffeur.md` |
| Mobile, passager | `AccountRemoteDataSourceFake` remplacée par une source réelle de `GET /v1/me` pour le profil |
| Adresses enregistrées (validé par le user, 2026-11-11) | Laissées inventées pour l'instant : elles n'existent pas dans l'API. La liste simulée reste dans l'app, à part du profil réel |
| Téléphone affiché (validé par le user, 2026-11-11) | Bien présentable : l'API le rend au format E.164 (« +33700000007 »), l'onglet « Compte » du passager et du chauffeur l'affiche « +33 7 00 00 00 07 », la forme que montrait la source simulée. Un numéro qui n'est pas un numéro français à 9 chiffres après +33 reste tel quel. Formateur `formatPhone` dans `lib/core/utils`, testé en TDD |
| Modèles mobiles | `fromJson` puis `toDomain()`, sans étendre les entités (CLAUDE.md du mobile) |

### Règles

| Cas | Résultat |
|---|---|
| Chaque appui sur « Compte » | Rond de chargement, puis le profil à jour |
| Appel en échec | Message d'erreur et « Réessayer » |
| Chauffeur sans véhicule | « Aucun véhicule enregistré. » |
| Utilisateur pas encore inscrit (pas de ligne `users`) | Refusé par le garde, comme toutes les routes `@Roles` aujourd'hui |

### API

**`GET /v1/me`** (passager et chauffeur), réponse enrichie :

```json
{ "role": "PASSENGER", "firstName": "Jean", "lastName": "Dupont", "phone": "+33612345678", "email": "jean@exemple.fr" }
```

**`GET /v1/drivers/me/account`** (chauffeur), nouvelle :

```json
{
  "firstName": "Karim", "lastName": "Benali", "phone": "+33698765432", "email": "karim.taxi@exemple.fr",
  "vehicle": { "model": "Clio 4", "color": "…", "plate": "TD-556-HS", "adsNumber": "458", "communeCode": "67482", "communeName": "Strasbourg" },
  "documents": { "documents": [ … ], "isBlocked": false, "inOrderUntil": null }
}
```

`vehicle` : `null` sans véhicule. `documents` : la réponse de `GET /v1/drivers/me/documents`.

**`GET /v1/drivers/me/vehicle`** : retirée.

### Nouveaux éléments

**API** :

- `GetMyProfileQuery` et son handler (module `user`) ;
- `GET /v1/me` enrichie ;
- `GET /v1/drivers/me/account` : contrôleur et DTO de réponse ;
- la construction de la réponse des documents, sortie de `GetMyDocumentsHttpController` pour être partagée.

**Mobile** :

- chauffeur : la source réelle du compte, son modèle, `LoadDriverAccountUseCase` simplifié, le rechargement à l'appui sur l'onglet (`_onTabSelected`, comme « Réservations » et « Gains ») ;
- passager : la source réelle du compte, son modèle, le rechargement à l'appui sur l'onglet.

### Tables touchées

Aucune : lectures seulement.

### Hors périmètre

- L'aide et les conditions d'utilisation (`aide-chauffeur.md`, en attente).
- Modifier son profil depuis l'app.
- De vraies adresses enregistrées pour le passager (une table, l'ajout et la suppression) : une feature à part.
- La ligne « Notifications ».

## À valider

1. **Les adresses enregistrées du passager. Validé par le user, 2026-11-11 :** laissées inventées pour l'instant. Écartés : les retirer de l'écran ; les construire maintenant (une feature à part).

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Pour cette feature, après l'étape 1, le user a demandé de coder toutes les étapes restantes d'un coup (2026-11-11) : étapes 2 et 3 enchaînées, pause avant son test.

### Étape 1 : les routes (API)

- [x] `GetMyProfileQuery` (module `user`, `queries/get-me/`), `GET /v1/me` enrichie
- [x] `GET /v1/drivers/me/account` (`GetMyAccountHttpController`, `DriverAccountResponseDto`) : les trois requêtes en parallèle par le `QueryBus` ; la réponse des documents construite par `DriverDocumentsResponseDto.fromReadModel`, partagée avec `GET /v1/drivers/me/documents`
- [x] `GET /v1/drivers/me/vehicle` retirée (son contrôleur supprimé, `FindMyVehicleQuery` gardée)
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles, aucune dans les fichiers touchés
- [ ] `npm run deps:validate` lancé par le user

### Étape 2 : le compte du chauffeur (mobile)

- [x] `DriverAccountRemoteDataSourceImpl` (`GET /v1/drivers/me/account`), `DriverAccountModel` avec le véhicule et les documents ; `DriverAccount` porte maintenant ses documents, `DriverAccountReady` n'a plus que le compte ; `LoadDriverAccountUseCase` à un dépôt
- [x] Retirés : `DriverAccountRemoteDataSourceFake`, `DriverVehicleRepository`, son implémentation et sa source ; `DriverVehicleModel` gardé pour le véhicule de la réponse
- [x] La lecture de la liste des documents partagée par les deux routes : `DriverDocumentModel.listFromJson`
- [x] Rechargement à l'appui sur « Compte » (`_onTabSelected`), contenu gardé pendant le rechargement
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni nouvelle alerte (seulement `one_member_abstracts`, comme les autres dépôts à une méthode), 121 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 3 : le compte du passager (mobile)

- [x] `AccountRemoteDataSourceImpl` (`GET /v1/me`) pour le profil ; les adresses enregistrées dans `SavedPlaceDataSourceFake` et `SavedPlaceModel`, combinées par `AccountRepositoryImpl` ; `AccountRemoteDataSourceFake` retirée
- [x] Rechargement à l'appui sur « Compte », contenu gardé pendant le rechargement
- [x] Vérifications : comme l'étape 2

### Étape 3 bis : le téléphone bien présenté (mobile)

Demandé par le user le 2026-11-11, après avoir vu « +33700000007 ».

- [x] Test d'abord : `formatPhone`, en TDD ; 2 tests (numéro français, numéro étranger), rouges puis verts
- [x] `formatPhone` dans `lib/core/utils/phone_formatter.dart`, utilisé par les deux onglets « Compte »
- [x] Vérifications : `dart format` et `flutter analyze` sans remarque sur les fichiers touchés, 123 tests verts

### Étape 3 ter : le rond de chargement à chaque arrivée (mobile)

Demandé par le user le 2026-11-11.

- [x] `DriverAccountBloc` et `AccountBloc` émettent toujours l'état de chargement avant l'appel
- [x] Vérifications : comme l'étape 2

### Étape 4 : test (par le user)

- [x] Chauffeur et passager : le rond de chargement à chaque arrivée, puis le vrai profil, le téléphone bien présenté (« C'est bon », user, 2026-11-11)

### Fin de feature

- [x] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande
