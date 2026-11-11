# L'heure de prise en charge à un seul endroit

> Statut : codé le 2026-11-11, pas commité. Attend le test du user sur Android.

Concerne `taxi-vroom-mobile`, et l'API pour l'étape 1 ter (le nom du départ envoyé par l'app). Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11 : l'heure de prise en charge (« Maintenant », « Demain 06:15 ») se choisit à trois endroits, ce qui donne l'impression qu'elle est demandée plusieurs fois :

1. sur l'accueil, à côté de « Où allez-vous ? » ;
2. dans « Votre trajet », à côté de « Choisir sur la carte » ;
3. sur le choix du taxi, à côté du nombre de passagers.

C'est la même valeur partagée par les trois boutons, mais rien ne le montre. *(`PickupTimeChip` dans `where_to_panel.dart`, `destination_search_page.dart` et `taxi_choice_page.dart`)*

### Ce que font les applis du marché

Lu le 2026-11-11. Leur point commun : l'heure se choisit au moment de confirmer la course, près du bouton de commande.

1. L'aide officielle d'une appli du marché : « Schedule a ride 30 minutes to 30 days in advance of when you'd like to be picked up by tapping the clock icon before you confirm your ride ».
2. Pour les autres, d'après des guides (pas de page officielle trouvée) : une icône calendrier au-dessus du bouton de commande, parfois aussi à côté du champ de destination sur l'accueil.

### Comment ça marche

**Commander tout de suite**

1. Sur l'accueil, le passager ne voit plus de bouton « Maintenant » : seulement « Où allez-vous ? », « Maison » et « Travail ». *(App seule)*
2. Dans « Votre trajet », plus de bouton « Maintenant » non plus : seulement « Choisir sur la carte ». *(App seule)*
3. Sur le choix du taxi, le bouton « Maintenant » est à côté de « 1 passager », et le bouton du bas dit « Commander le taxi ». Comme aujourd'hui. *(App → API `POST /v1/rides`, l'estimation)*

**Réserver pour plus tard**

1. Il choisit sa destination comme d'habitude.
2. Sur le choix du taxi, il appuie sur « Maintenant » : la feuille de l'heure s'ouvre, avec « Partir à » et « Arriver à », comme aujourd'hui. *(App seule)*
3. Il choisit « Demain 06:15 » : le rond tourne, le prix est recalculé pour cette heure, et le bouton du bas devient « Réserver le taxi ». Comme aujourd'hui. *(App → API `POST /v1/rides` avec `pickupAt`)*

**Aucun taxi libre maintenant**

1. Le choix du taxi s'ouvre quand même : la carte avec le trajet, et le panneau du bas. *(App → API `POST /v1/rides` sans `pickupAt` → 422 `RIDE.NO_DRIVER_AVAILABLE`)*
2. La carte « Taxi » est grisée et dit « Aucun taxi libre pour le moment », sans prix : une course tout de suite ne se calcule pas sans chauffeur pour venir. *(App seule)*
3. « Commander le taxi » est grisé. Le bouton de l'heure reste utilisable. *(App seule)*
4. Il choisit « Lundi 08:00 » : le rond tourne, le prix de la réservation s'affiche, le bouton devient « Réserver le taxi ». *(App → API `POST /v1/rides` avec `pickupAt` : une réservation ne cherche pas de chauffeur)*
5. S'il revient à « Maintenant », la carte « Taxi » est de nouveau grisée tant qu'aucun taxi n'est libre. *(App → API `POST /v1/rides` sans `pickupAt`)*
6. Si un chauffeur se met en ligne près de lui pendant qu'il regarde l'écran (heure sur « Maintenant »), le rond de chargement s'affiche tout seul, comme quand on change l'heure, puis le prix et « Commander le taxi » utilisable. Il n'a rien à toucher. *(App ← Firebase `drivers/` : le suivi des taxis libres de l'accueil, dans un rayon de 5 km ; App → API `POST /v1/rides`)*

**Revenir en arrière**

1. Du choix du taxi, la flèche retour mène à « Votre trajet » : l'heure choisie reste gardée. En revenant sur le choix du taxi, il la retrouve. *(App seule)*
2. De « Votre trajet », la flèche retour mène à l'accueil : l'heure revient à « Maintenant ». La prochaine destination s'ouvre donc sur « Maintenant », jamais sur une heure oubliée. *(App seule)*

### Décisions prises

| Sujet | Décision |
|---|---|
| Où (validé par le user, 2026-11-11) | Uniquement sur le choix du taxi, à côté du nombre de passagers. Retiré de l'accueil et de « Votre trajet ». Écartés : l'accueil seul (changer d'heure après avoir vu le prix obligerait à revenir deux écrans en arrière), l'accueil et le choix du taxi (encore deux endroits), un bouton « Réserver » à part sur l'accueil (deux parcours presque identiques) |
| Retour à l'accueil (validé par le user, 2026-11-11) | L'heure revient à « Maintenant » dès que le passager revient à l'accueil, puisque l'accueil ne l'affiche plus ; elle reste gardée entre le choix du taxi et « Votre trajet ». Écarté : la garder jusqu'à la commande, comme avant. *(`PassengerFlowBloc._onBackPressed` émet `PassengerFlowHome` sans `scheduledPickup`)* |
| Aucun taxi libre maintenant (validé par le user, 2026-11-11, trouvé à son test) | Le choix du taxi reste affiché, la carte « Taxi » grisée avec « Aucun taxi libre pour le moment », « Commander le taxi » grisé, l'heure toujours utilisable pour réserver. Avant, tout l'écran était remplacé par « Aucun taxi disponible » et « Réessayer » : depuis que l'heure ne se choisit plus que là, on ne pouvait plus réserver du tout sans taxi libre. Comme les applis du marché : aucun taxi libre maintenant n'empêche jamais de réserver pour plus tard. Les autres refus (département pas desservi, horaire trop proche) gardent leur écran d'erreur. API inchangée *(l'app traite `RIDE.NO_DRIVER_AVAILABLE` à part)* |
| Un taxi qui se libère (validé par le user, 2026-11-11, trouvé à son test) | Carte « Taxi » grisée et heure sur « Maintenant » : l'écran suit en direct les taxis libres autour du point de départ et refait l'estimation dès qu'il en voit un. Rien dans les autres cas (réservation, prix déjà affiché) : un taxi parti entre-temps est déjà signalé au moment de commander. *(`WatchNearbyTaxisUseCase`, celui de l'accueil, branché dans `TaxiChoiceBloc`)* |
| Tout sur Mapbox (validé par le user, 2026-11-11) | Voir `point-de-prise-en-charge.md`, ligne « Tout sur Mapbox » : l'adresse sous chaque épingle et le nom du départ gardé viennent de Mapbox, plus de la Géoplateforme, en panne ce jour-là |
| Ce qui ne change pas | Le choix du taxi : la feuille de l'heure avec « Partir à » et « Arriver à », le prix recalculé à chaque changement d'heure, « Commander le taxi » ou « Réserver le taxi ». L'API |
| Code | `PickupTimeChip` est retiré de `WhereToPanel` et de `DestinationSearchPage`. L'heure reste gardée par `PassengerFlowBloc` (`scheduledPickup`) |

### Règles

1. L'heure ne se choisit que sur le choix du taxi.
2. Une course commandée ou réservée remet l'heure à « Maintenant » pour la suivante, comme aujourd'hui.
3. Revenir à l'accueil remet l'heure à « Maintenant ».
4. Aucun taxi libre maintenant n'empêche jamais de réserver pour plus tard.

### API

Aucun changement.

### Nouveaux éléments

Aucun : seulement des boutons retirés.

### Tables touchées

Aucune.

### Hors périmètre

- Changer les créneaux proposés (toutes les 15 minutes, de 30 minutes à 30 jours).
- Changer la feuille de l'heure elle-même.

## À valider

Rien. Le point 1 (l'heure au retour à l'accueil) est tranché : voir « Décisions prises », validé par le user le 2026-11-11.

## Plan

Le user a demandé de coder toutes les étapes d'un coup (2026-11-11) : pause avant son test.

### Étape 1 : les boutons retirés (mobile)

- [x] `PickupTimeChip` retiré de l'accueil (`WhereToPanel`) et de « Votre trajet » (`DestinationSearchPage`)
- [x] Le retour à l'accueil remet l'heure à « Maintenant » : `PassengerFlowBloc._home()`, utilisé par la flèche retour et par les retours depuis l'écran de « Maison » ou « Travail » ouvert depuis « Compte »
- [x] Vérifications : `dart format` et `flutter analyze` sans remarque sur les fichiers touchés, 141 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 1 bis : réserver sans taxi libre (mobile)

Demandé par le user le 2026-11-11 après son test, codé directement à sa demande.

- [x] Test d'abord, en TDD : `LoadTaxiChoiceUseCase`, 2 tests (aucun taxi libre : le trajet sans offre ; un autre refus : l'échec), rouges puis verts
- [x] `NoDriverAvailableFailure` (`core/errors/failures.dart`) pour `RIDE.NO_DRIVER_AVAILABLE` ; `LoadTaxiChoiceUseCase` en fait un choix sans offre ; `TaxiChoicePage` montre la carte « Taxi » grisée (« Aucun taxi libre pour le moment »), sans texte d'estimation, « Commander » grisé, l'heure utilisable
- [x] Vérifications : `dart format` et `flutter analyze` sans remarque sur les fichiers touchés, 143 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 1 ter : tout sur Mapbox (API et mobile)

Demandé par le user le 2026-11-11 (« passe tout sur mapbox »).

- [x] API : `POST /v1/rides` reçoit `originName` (facultatif) ; sans lui, « Position de départ » (`RideEntity.unnamedPickup`) ; `GeoplateformeAddressFinderAdapter`, `AddressFinderPort` et `ADDRESS_FINDER` retirés. `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles, `npm run deps:validate` à ses 5 violations anciennes
- [x] Mobile, test d'abord en TDD : `LoadTaxiChoiceUseCase` (« Position actuelle » nommée par l'adresse trouvée là, un départ choisi nommé sans nouvelle recherche, pas de nom sans adresse connue : 3 tests) et `OfferFromPickupUseCase` (épingle déplacée nommée par son adresse Mapbox, sans nom si inconnue : 2 tests), rouges puis verts
- [x] Mobile : une seule `FindPlaceAtUseCase` sur Mapbox `/reverse` pour toutes les épingles ; l'estimation envoie `originName` (`FindPlaceAtUseCase.knownAddress`, `Place.fullAddress`) ; `AddressRepositoryImpl`, `AddressRemoteDataSourceImpl` et `AddressModel` (Géoplateforme) retirés ; `findSavedPlaceAtUseCase` fondu dans `findPlaceAtUseCase`

### Étape 1 quater : un taxi qui se libère (mobile)

- [x] `TaxiChoiceBloc` suit les taxis libres (`WatchNearbyTaxisUseCase`) quand la carte est grisée et l'heure sur « Maintenant », et refait l'estimation dès qu'il en voit un ; le suivi s'arrête à chaque nouvelle estimation et à la fermeture de l'écran
- [x] Corrigé après le test du user (2026-11-11) : le rond tournait à l'infini quand un taxi se libérait. L'arrêt du suivi attendait la fin d'un `await for` sur la position GPS, qui ne finit qu'à la position suivante, jamais sur un téléphone immobile. L'arrêt n'est plus attendu. Testé par le user sur Android le 2026-11-11 : « ça marche maintenant »
- [x] Vérifications des étapes 1 ter et 1 quater : `dart format` et `flutter analyze` sans nouvelle remarque sur les fichiers touchés, 147 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 2 : test (par le user)

- [ ] Sur Android : pas d'heure sur l'accueil ni dans « Votre trajet » ; commander tout de suite ; réserver pour plus tard depuis le choix du taxi ; revenir à l'accueil

### Fin de feature

- [x] Mettre à jour `.aimemory` du dépôt mobile
- [ ] Commiter quand le user le demande
