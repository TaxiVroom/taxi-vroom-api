# Maison et Travail

> Statut : codé le 2026-11-11 (étapes 1 à 3), pas commité. Attend la migration et `prisma:generate` par le user, puis son test sur Android.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11, sur l'accueil du passager :

1. Retirer le bouton « Gare » : on s'en fiche.
2. Rendre réels « Maison » et « Travail », et faire comme les applis du marché quand on appuie dessus.

Aujourd'hui, les trois boutons ne font rien quand on appuie. *(`onPressed: () {}` dans `where_to_panel.dart`)* Les adresses « Maison » et « Travail » de l'onglet « Compte » sont inventées, parce que l'API n'en a pas. *(`SavedPlaceDataSourceFake`, laissée par décision du user dans `compte-a-jour.md`)*

### Ce que font les applis du marché

D'après leurs pages d'aide officielles, lues le 2026-11-11 :

1. Le passager enregistre son domicile et son travail depuis son compte, en cherchant l'adresse.
2. Ensuite, un seul appui sur le raccourci de l'accueil suffit pour y aller.
3. Il peut les supprimer depuis son compte.
4. Les pages d'aide ne disent pas ce que fait un appui sur un raccourci encore vide. Dans ces applis, il ouvre la recherche pour enregistrer l'adresse : c'est l'usage courant, mais aucune doc ne le confirme.

### Comment ça marche

**Sur l'accueil**

1. Le passager voit deux boutons, « Maison » et « Travail ». « Gare » a disparu. *(App → API `GET /v1/me/saved-places` → Postgres `passenger_saved_places`, au chargement de l'accueil)*

**Première fois**

1. Il appuie sur « Maison ».
2. Comme aucune maison n'est encore enregistrée, l'écran « Ajouter votre domicile » s'ouvre. *(App seule)*
3. Il tape son adresse ou la pointe sur la carte, puis la choisit. *(App → Mapbox Search Box : `/suggest` et `/retrieve` pour les suggestions, `/reverse` pour l'adresse sous l'épingle)*
4. Un petit rond de chargement tourne pendant l'enregistrement. *(App → API `POST /v1/me/saved-places` avec l'adresse Mapbox et la position → Postgres, qui les garde telles quelles)*
5. Si l'épingle est sur un point sans adresse connue (« Adresse inconnue »), il lit « Adresse introuvable, choisissez un autre point. » et reste sur la recherche. *(App seule : rien n'est envoyé)*
6. Ensuite, le choix du taxi s'ouvre vers chez lui. C'est la proposition du point 1 d'« À valider ». *(App → API `POST /v1/rides`, l'estimation, comme aujourd'hui)*
7. S'il n'a pas de réseau, un message s'affiche et il reste sur la recherche. Rien n'est gardé.

**Les fois suivantes**

1. Il appuie sur « Maison ».
2. Le choix du taxi s'ouvre tout de suite vers chez lui, avec le départ et l'heure choisis sur l'accueil. Il n'a rien à taper. *(App → API `POST /v1/rides`, avec l'adresse gardée comme destination)*

**Pour changer ou supprimer**

1. Il va dans l'onglet « Compte », section « Adresses enregistrées ». Le rond de chargement s'affiche, puis ses adresses. *(App → API `GET /v1/me/saved-places`, en même temps que `GET /v1/me` et `GET /v1/enterprise-contact`)*
2. Il voit « Maison » avec son adresse, ou « Ajouter » si elle est vide.
3. Un appui sur la ligne ouvre la même recherche. Après son choix, le rond tourne, puis il revient au « Compte » avec la nouvelle adresse. Aucune course ne démarre. *(App → API `POST` ou `PATCH /v1/me/saved-places/HOME` avec l'adresse Mapbox → Postgres)*
4. Il peut aussi la supprimer depuis l'écran de modification (« Supprimer »). *(App → API `DELETE /v1/me/saved-places/HOME` → Postgres)*
5. Ou directement depuis la liste : il glisse la ligne vers la gauche, un fond rouge « Supprimer » apparaît derrière. Une fois lâchée, la ligne montre le rond de chargement, puis repasse à « Ajouter » et le raccourci de l'accueil se vide. Pas de confirmation. En cas d'échec, un message, et l'adresse reste. *(App → API `DELETE /v1/me/saved-places/HOME` → Postgres)*

« Travail » marche exactement pareil, avec « Ajouter votre lieu de travail ».

**Le détail que le passager voit** : l'adresse gardée est l'adresse complète donnée par Mapbox, par exemple « 4 Rue de la Magel, 67000 Strasbourg, France ». *(Voir « Décisions prises », L'adresse gardée)*

### Décisions prises

Les choix techniques ont été tranchés par Claude (règle `productQuestionsOnly`). Chacun est expliqué d'abord par ce que voit le passager.

| Sujet | Décision |
|---|---|
| « Gare » (demandé par le user, 2026-11-11) | Le bouton disparaît de l'accueil. *(App seule)* |
| Supprimer depuis la liste (demandé par le user, 2026-11-11 ; la corbeille visible d'abord codée, jugée moche par le user, remplacée le même jour) | Comme dans les applis du marché (leur aide : « Tap and slide to the left on the place you want to delete ») : le passager glisse la ligne vers la gauche, un fond rouge « Supprimer » apparaît, puis la ligne montre le rond de chargement et repasse à « Ajouter ». Rien de visible sur la ligne au repos ; « Supprimer » reste aussi sur l'écran de modification. Sans confirmation : le glissement est déjà un geste voulu. Pas d'animation pour montrer le geste (validé par le user, 2026-11-11) : les applis du marché n'en ont pas, et « Supprimer » reste visible sur l'écran de modification. *(`Dismissible` de Flutter, `DismissDirection.endToStart` ; `AccountBloc` reçoit `AccountSavedPlaceDeleteRequested` et appelle `DeleteSavedPlaceUseCase` ; l'onglet prévient `PassengerHomeBloc`)* |
| Une adresse de chaque sorte | Le passager a au plus une maison et un travail. Une adresse vide n'existe pas en base : la ligne n'est créée qu'à l'ajout. *(Postgres : table `passenger_saved_places`, avec `passengerId`, `kind` `HOME` ou `WORK`, `address`, `latitude`, `longitude` ; clé `passengerId` + `kind` ; aucune colonne nullable)* |
| L'adresse gardée (validé par le user, 2026-11-11, remplace « la Géoplateforme nomme le point ») | L'adresse donnée par Mapbox, comme la destination d'une course : celle de la suggestion choisie (« 4 Rue de la Magel, 67000 Strasbourg, France »), ou celle sous l'épingle de « Choisir sur la carte ». D'abord codé avec la Géoplateforme : en panne le 2026-11-11 (504 sur `/reverse` et `/search`), elle empêchait tout enregistrement et le user a demandé Mapbox. La doc de Mapbox Search Box réserve ses résultats à un usage temporaire (« only available for temporary use ») : le même point que le nom de la destination, déjà noté dans `docs/a-faire.md`. *(App → Mapbox `/suggest` + `/retrieve` ou `/reverse` → App → API `{ kind, address, latitude, longitude }` → Postgres)* |
| Point sans adresse | Si Mapbox ne trouve aucune adresse sous l'épingle, ou ne répond pas, le passager lit « Adresse introuvable, choisissez un autre point. » et reste sur la recherche. Il n'y a pas de nom de secours, parce que l'adresse sert à chaque course. *(App seule : rien n'est envoyé à l'API)* |
| Épingle des courses | Inchangée : elle reste sur la Géoplateforme, seule l'épingle de « Maison » et « Travail » passe par Mapbox `/reverse`, facturé à chaque appel |
| Ce que reçoit le chauffeur | Le chauffeur et l'historique voient l'adresse, pas « Maison ». Le choix du taxi n'affiche pas le nom de la destination, aujourd'hui comme avant. *(`destinationName` de `POST /v1/rides` = l'adresse gardée, `SavedPlace.toDestination()`)* |
| Chargement de l'accueil | Les raccourcis arrivent avec l'accueil, qui a déjà son chargement : il n'y a pas de nouvelle attente. Après un ajout, un changement ou une suppression, l'accueil se met à jour tout de suite, sans se recharger. *(`LoadPassengerHomeUseCase` ajoute `GET /v1/me/saved-places` ; `PassengerHomeBloc` reçoit `PassengerSavedPlaceStored` ou `PassengerSavedPlaceRemoved`, et le suivi des taxis garde l'accueil de l'état au lieu de celui du premier chargement)* |
| Chargement du « Compte » | Le rond tourne jusqu'à ce que le profil, les adresses et le numéro de contact soient tous arrivés. *(`LoadAccountUseCase` lance les trois appels ensemble ; `SavedPlaceDataSourceFake` est retirée)* |
| Écran d'ajout | C'est la même recherche que « Où allez-vous ? », avec « Choisir sur la carte ». *(Il réutilise `DestinationSearchPage` et `openPlacePickerSheet`, sans les recopier)* |
| Code de l'API | Les adresses vivent dans le module `passenger`. Il y a un cas d'usage pour ajouter, un pour changer, un pour supprimer, plutôt qu'un seul « ajoute ou remplace » (règle `splitUseCases`). La lecture n'appelle pas le domaine (règle `readNeverDomain`). L'API ne cherche aucune adresse : elle garde celle que l'app envoie |

### Règles

1. Si l'adresse est enregistrée, un appui sur le raccourci ouvre le choix du taxi vers elle.
2. Si elle est vide, un appui ouvre l'écran d'ajout.
3. On ne peut pas ajouter une deuxième maison. L'app propose toujours « Modifier » quand elle existe : le cas n'arrive qu'avec deux téléphones en même temps. *(API 409 `SAVED_PLACE.ALREADY_EXISTS`)*
4. Si le point n'a pas d'adresse, un message s'affiche et rien n'est gardé. *(API 422)*
5. S'il n'y a pas de réseau, un message s'affiche et rien n'est gardé.

### API

```text
GET    /v1/me/saved-places        → 200 [{ kind, address, latitude, longitude }]
POST   /v1/me/saved-places        { kind, address, latitude, longitude } → 201 { kind, address, latitude, longitude }
PATCH  /v1/me/saved-places/:kind  { address, latitude, longitude }       → 200 { kind, address, latitude, longitude }
DELETE /v1/me/saved-places/:kind  → 204
```

### Nouveaux éléments

- API, module `passenger` :
  - l'entité `PassengerSavedPlaceEntity` et son dépôt ;
  - les commandes d'ajout, de changement et de suppression ;
  - la requête `FindMySavedPlacesQuery` ;
  - les erreurs `SAVED_PLACE.*`.
- Mobile : l'adresse sous l'épingle par Mapbox `/reverse` (`PlaceSearchRemoteDataSource.reverse`, `PlaceSearchRepositoryImpl.findPlaceAt`), pour « Maison » et « Travail » seulement.
- Mobile : la vraie source des adresses enregistrées, les cas d'usage d'ajout, de changement et de suppression, et l'écran d'ajout.

### Tables touchées

- Nouvelle : `passenger_saved_places`.

### Hors périmètre

- D'autres adresses que Maison et Travail (« Ajouter un lieu »).
- Maison et Travail comme point de départ.
- Les destinations récentes de l'accueil (« Aéroport Strasbourg-Entzheim », « Parlement européen »), encore inventées : voir le point 3 d'« À valider ».

## À valider

1. **Après l'ajout depuis l'accueil. Validé par le user, 2026-11-11 (go sur la spec avec les propositions) :** le choix du taxi s'ouvre directement. Le passager a appuyé sur « Maison » pour y aller, il n'a pas à appuyer une seconde fois. Écarté : revenir à l'accueil avec le raccourci rempli.
2. **Changer ou supprimer. Validé par le user, 2026-11-11 (go sur la spec avec les propositions) :** seulement depuis l'onglet « Compte ». Un appui sur la ligne permet de choisir une autre adresse, et un bouton « Supprimer » apparaît sur cet écran. Écarté : un appui long sur le raccourci de l'accueil.
3. **Les destinations récentes inventées**, sous les raccourcis. Question à part, pas tranchée par le user : rien ne change dans cette feature.
4. **Le retour depuis le choix du taxi**, trouvé en codant, pas couvert par le plan. Après un appui sur « Maison », la flèche retour du choix du taxi mène à « Votre trajet », comme après une recherche, et pas à l'accueil. Laissé tel quel en attendant le user. Proposé : revenir à l'accueil, puisque le passager n'est pas passé par « Votre trajet ».

## Plan

Le user a demandé de coder toutes les étapes d'un coup (2026-11-11) : étapes 1 à 3 enchaînées, pause avant son test.

### Étape 1 : les adresses dans l'API

- [x] Doc officielle relue : Prisma, [models](https://www.prisma.io/docs/orm/prisma-schema/data-model/models#composite-ids) (« A composite key spans several fields, declared with `@@id` ») et [composite ids](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) (la clé `passengerId_kind` dans le `where` de `findUnique`, `update` et `delete`) ; Géoplateforme `/geocodage/reverse`, déjà citée dans `point-de-prise-en-charge.md`
- [x] ~~`src/libs/geocoding/` : la recherche d'adresse déplacée depuis `ride`~~ : remis dans `ride` quand le user a choisi Mapbox (2026-11-11), l'API ne cherche plus d'adresse
- [x] `PassengerSavedPlace` (`passenger_saved_places`) et l'enum `SavedPlaceKind` dans `schema.prisma`
- [ ] Migration et `prisma:generate`, lancés par le user
- [x] `PassengerSavedPlaceEntity` (jamais sans adresse, vérifié par `validate`), dépôt, `AddSavedPlaceService`, `ChangeSavedPlaceService`, `DeleteSavedPlaceService`, `FindMySavedPlacesQuery`, routes et erreurs
- [x] Vérifications : `npm run lint` à ses 9 erreurs habituelles, `npm run deps:validate` à ses 5 violations anciennes ; `npx tsc --noEmit` n'a qu'une erreur, `passengerSavedPlace` absent du client Prisma, qui part avec `prisma:generate`

### Étape 2 : l'accueil (mobile)

- [x] Test d'abord, en TDD : `PassengerHome.savedPlaceOf`, `withSavedPlace` (remplace la même sorte) et `withoutSavedPlace` ; 4 tests, rouges puis verts
- [x] « Gare » retirée ; `SavedPlace` (sorte, adresse, position, `fromPlace`), `SavedPlaceRemoteDataSourceImpl`, `SavedPlaceRepositoryImpl`, `AddSavedPlaceUseCase` et `ChangeSavedPlaceUseCase` (refusent une épingle « Adresse inconnue » : « Adresse introuvable, choisissez un autre point. », TDD 2 tests), `DeleteSavedPlaceUseCase`
- [x] Passage à Mapbox (2026-11-11, à la demande du user) : l'app envoie l'adresse Mapbox ; l'épingle de cet écran passe par Mapbox `/reverse` ; 140 tests verts
- [x] Un appui sur un raccourci enregistré ouvre le choix du taxi
- [x] Un appui sur un raccourci vide ouvre `SavedPlacePage` (état `PassengerFlowSavedPlaceEdit`, `SavedPlaceBloc`), avec le rond de chargement, puis le choix du taxi
- [x] La liste des suggestions de « Votre trajet » est sortie dans `PlaceSuggestions`, partagée avec `SavedPlacePage`
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans nouvelle remarque, 138 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 3 : l'onglet « Compte » (mobile)

- [x] `SavedPlaceDataSourceFake` retirée ; `LoadAccountUseCase` lance les trois appels ensemble ; « Maison » et « Travail » affichent l'adresse ou « Ajouter »
- [x] Supprimer en glissant la ligne vers la gauche (demandé par le user, 2026-11-11, à la place d'une corbeille visible) : `Dismissible`, `PassengerAccount.withoutSavedPlace` (TDD, 1 test), `AccountSavedPlaceDeleteRequested`, rond sur la ligne, raccourci de l'accueil vidé ; 141 tests verts
- [x] Appui sur une ligne : `SavedPlacePage` (« Modifier votre domicile » et « Supprimer » quand elle existe), puis retour au « Compte », qui se recharge
- [x] Vérifications : comme l'étape 2

### Étape 4 : test (par le user)

- [ ] Sur Android : ajout depuis l'accueil, appui sur un raccourci enregistré, changement et suppression depuis « Compte »

### Fin de feature

- [ ] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande
