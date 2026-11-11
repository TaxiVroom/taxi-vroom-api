# Destinations récentes

> Statut : codé le 2026-11-11 (étapes 1 et 2), pas commité. Attend le test du user sur Android.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11 : les lieux affichés sous « Maison » et « Travail » (« Aéroport Strasbourg-Entzheim », « Parlement européen ») sont inventés et ne servent à rien. Un appui dessus ne fait rien sur l'accueil. Dans « Votre trajet », il ne fait que recopier le nom dans le champ de recherche. *(`RecentDestinationRemoteDataSourceFake`, `where_to_panel.dart`, `destination_search_page.dart`)*

### Ce que font les applis du marché

D'après leurs pages officielles, lues le 2026-11-11 :

1. Après un appui sur « Où allez-vous ? », l'écran de recherche propose des destinations tirées des courses passées : « we'll suggest a list of personalized destinations and ride types based on your preferences, past trips, and most likely destinations ».
2. Leur aide parle de raccourcis qui contiennent « recent destinations from your ride history ».
3. Aucune page officielle ne dit combien de destinations sont montrées. Un test de presse d'une ancienne version en comptait trois, dont la maison et le travail quand ils sont enregistrés. Rien trouvé pour les autres applis.

### Comment ça marche

**Sur l'accueil**

1. Le passager ne voit plus que « Où allez-vous ? », « Maintenant », « Maison » et « Travail ». Les lieux inventés ont disparu. *(App seule)*

**Dans « Votre trajet »**

1. Il appuie sur « Où allez-vous ? ». Sous les champs, un petit rond tourne le temps de la réponse. *(App → API `GET /v1/rides/recent-destinations` → Postgres `rides`)*
2. Puis ses 3 dernières destinations s'affichent, la plus récente en haut, chacune avec son nom et sa distance depuis là où il est (« Gare de Strasbourg, 2,9 km »). Une même destination n'apparaît qu'une fois. *(La distance est calculée par l'app, à vol d'oiseau, comme aujourd'hui)*
3. Il appuie sur l'une d'elles : le choix du taxi s'ouvre tout de suite vers ce lieu, comme après une suggestion. *(App → API `POST /v1/rides`, l'estimation, comme aujourd'hui)*
4. Dès qu'il tape dans un champ, les suggestions de la recherche remplacent la liste, comme aujourd'hui.
5. Sans course terminée, ou si l'appel échoue, rien ne s'affiche sous les champs : la recherche marche quand même.

### Décisions prises

Les choix techniques ont été tranchés par Claude (règle `productQuestionsOnly`).

| Sujet | Décision |
|---|---|
| Sur l'accueil (validé par le user, 2026-11-11) | Retirées : l'accueil n'a plus que « Maison » et « Travail ». Écarté : en garder deux, utilisables |
| Combien (validé par le user, 2026-11-11) | Les 3 dernières destinations différentes, le seul chiffre trouvé chez les applis du marché |
| D'où elles viennent | Des courses terminées du passager, la plus récente d'abord. Une course annulée ou sans chauffeur ne compte pas : le passager n'y est pas allé. *(`rides` au statut `COMPLETED`)* |
| Une même destination | Deux courses vers le même nom de destination ne donnent qu'une ligne, la plus récente. *(Dédoublonnage sur `destinationName`)* |
| Quand elles sont lues | À chaque ouverture de « Votre trajet », pour montrer la course qui vient de se terminer. Plus chargées avec l'accueil. *(Le rond sous les champs pendant l'appel, règle `loaderAlways`)* |
| Lecture | Une requête du module `ride` avec `PrismaService`, sans domaine (règle `readNeverDomain`) |
| Requête SQL (validé par le user, 2026-11-11) | `$queryRaw` avec `DISTINCT ON ("destinationName")` de PostgreSQL : une ligne par destination, la plus récente, puis les 3 plus récentes. La doc de Prisma 7 ne dit ni quelle ligne `distinct` garde ni s'il passe avant `take` (il semble fait en mémoire, après : moins de 3 destinations possibles), et son `groupBy` ne trie que par les champs regroupés. Même façon de faire que `GetMyAcceptanceRateQuery` |
| Ce qui part à l'estimation | Le nom et la position gardés de la course, comme une suggestion choisie. *(`Place(name, address: '', coordinates)`)* |
| Mobile | La source simulée est remplacée par une source réelle ; `PassengerHome` perd `recentDestinations` ; « Votre trajet » charge la liste lui-même (`RecentDestinationsBloc`) |
| Champ « Départ » | La liste ne s'affiche que pour la destination : une destination passée n'est pas un départ. Avant, elle s'affichait aussi sous le départ, et un appui recopiait le nom dans le champ. Trouvé en codant, tranché par Claude |

### Règles

1. Seules les courses terminées comptent.
2. Au plus 3 destinations, la plus récente en haut, chacune une seule fois.
3. Un appui ouvre le choix du taxi vers ce lieu.
4. Un échec de l'appel n'empêche pas de chercher : la liste reste vide.

### API

```text
GET /v1/rides/recent-destinations → 200 [{ name, latitude, longitude }]   (passager seulement, 3 au plus)
```

### Nouveaux éléments

- API, module `ride` : la requête `FindMyRecentDestinationsQuery`, son contrôleur et sa réponse.
- Mobile : la source réelle des destinations récentes ; leur chargement à l'ouverture de « Votre trajet ».

### Tables touchées

Aucune : les destinations sont lues dans `rides` (`destinationName`, `destinationLatitude`, `destinationLongitude`).

### Hors périmètre

- Supprimer une destination récente.
- Les proposer sur l'accueil.

## À valider

Rien pour l'instant.

## Plan

Le user a demandé de coder toutes les étapes d'un coup (2026-11-11) : étapes 1 et 2 enchaînées, pause avant son test.

### Étape 1 : la route (API)

- [x] Doc officielle relue : [Prisma Client v7](https://www.prisma.io/docs/orm/v7/reference/prisma-client-reference) (`distinct` : « Deduplicate a list of records », sans dire quelle ligne est gardée ; `groupBy` : `orderBy` sur « any property that is also present in `by` »), [Prisma, raw queries](https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries) (« Prisma Client escapes all variables », un nombre à virgule rendu en `Number`), [PostgreSQL, SELECT](https://www.postgresql.org/docs/current/sql-select.html) (`DISTINCT ON` « keeps only the first row of each set », l'`ORDER BY` choisissant cette ligne)
- [x] `FindMyRecentDestinationsQuery` (`$queryRaw`, `DISTINCT ON`), `GET /v1/rides/recent-destinations`, `RecentDestinationResponseDto`
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles, `npm run deps:validate` à ses 5 violations anciennes ; la requête essayée en lecture sur la base de dev

### Étape 2 : l'app (mobile)

- [x] Accueil : la liste retirée (`WhereToPanel`, `PassengerHome`, `LoadPassengerHomeUseCase`)
- [x] « Votre trajet » : `RecentDestinationsBloc`, `LoadRecentDestinationsUseCase`, rond pendant l'appel, nom et distance, un appui ouvre le choix du taxi ; pour la destination seulement
- [x] `RecentDestinationRemoteDataSourceFake` retirée, `RecentDestinationRemoteDataSourceImpl` à sa place
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans nouvelle remarque, 141 tests verts, lint Bloc à ses 6 alertes habituelles. Pas de nouveau test : aucune règle métier côté app, le tri et le dédoublonnage sont faits par l'API

### Étape 3 : test (par le user)

- [ ] Sur Android : accueil sans liste ; « Votre trajet » avec les 3 dernières destinations ; un appui ouvre le choix du taxi

### Fin de feature

- [ ] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande
