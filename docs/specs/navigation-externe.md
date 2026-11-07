# Naviguer avec Google Maps ou Waze

> Statut : livrée sur Android le 2026-11-05, testée par le user ; iOS préparé, non testé.

Concerne `taxi-vroom-mobile` seulement : l'API n'est pas touchée.

## Spec

### Besoin

Demandé par le user le 2026-11-05 : une manière très simple, pour le chauffeur, d'ouvrir Google Maps ou Waze avec le trajet déjà rempli, sans rien taper. Beaucoup de chauffeurs ont l'habitude de l'une ou l'autre ; le guidage de l'app reste là, mais il ne recalcule pas encore son itinéraire (`guidanceNoReroute` dans la mémoire du dépôt mobile).

### Comment ça marche

```text
Chauffeur, écran « aller chercher le client » ou course vers la destination
  ↓
Appuie sur le bouton rond « Itinéraire », à côté de « Écrire » et « Appeler »
  ↓
Feuille « Ouvrir avec : Google Maps / Waze », à chaque appui ; rien n'est retenu
  ↓
App → url_launcher : launchUrl(lien, mode externalApplication)
  ├─ Google Maps : https://www.google.com/maps/dir/?api=1&destination=<lat>%2C<lng>&travelmode=driving&dir_action=navigate
  └─ Waze :        https://waze.com/ul?ll=<lat>,<lng>&navigate=yes
  ↓
Téléphone : ouvre l'app installée, déjà en navigation depuis sa position
            sinon, le site web de Google Maps ou de Waze
  ↓
Le chauffeur revient dans l'app pour « Je suis arrivé », le code, « Terminer la course »
```

Le point visé : le point de prise en charge avant l'arrivée, la destination une fois le passager à bord. Sans point de départ dans le lien, les deux apps partent de la position du téléphone.

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS ; iOS préparé et non testé, faute de Mac |
| Gratuit | Oui : aucun des deux liens ne demande de clé API. Google : « You don't need a Google API key to use Maps URLs » ([Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)) ; Waze : ses liens sont de simples adresses à paramètres ([Waze deep links](https://developers.google.com/waze/deeplinks)) |
| Où (validé par le user, 2026-11-05) | Un 3e bouton rond, « Itinéraire », dans la rangée « Écrire » et « Appeler » du panneau du bas, sur l'écran « aller chercher le client » et sur celui de la course vers la destination. Même forme et même endroit que les actions sur le trajet, à portée de pouce. Écarté : une pastille sur la carte, où les pastilles règlent la vue (« Vue d'ensemble »), alors que ce bouton fait quitter l'app |
| Choix de l'app (validé par le user, 2026-11-05, remplace le choix retenu) | La feuille « Ouvrir avec » à chaque appui, rien n'est retenu. Le choix retenu, d'abord validé, ne se changeait que dans l'onglet Compte, caché sous l'écran de la course : le chauffeur ne pouvait pas changer en pleine course (vu par le user). Un appui de plus à chaque navigation, deux par course, contre zéro réglage caché ; c'est aussi la feuille « Ouvrir avec » que les gens connaissent sur leur téléphone. Écartés : l'appui long sur le bouton pour rouvrir la feuille, introuvable seul ; un toast après le choix, jamais vu puisque l'autre app s'ouvre aussitôt |
| Apps installées (validé par le user, 2026-11-05) | Pas détectées pour la v1 : il faudrait déclarer Google Maps et Waze dans la configuration Android (`<queries>`) et iOS (`LSApplicationQueriesSchemes`), pour `canLaunchUrl`. Une app absente ouvre son site web, et le chauffeur choisit l'autre au prochain appui |
| Google Maps | `https://www.google.com/maps/dir/?api=1&destination=<lat>%2C<lng>&travelmode=driving&dir_action=navigate` : en voiture, navigation guidée lancée tout de suite. La virgule est encodée, comme la doc le demande |
| Waze | `https://waze.com/ul?ll=<lat>,<lng>&navigate=yes` : `navigate=yes` lance la navigation |
| App absente | Les deux liens sont des adresses `https` : sans l'app, le téléphone ouvre le site web. La doc Google le dit pour Android et iOS ; la doc Waze, pour le web mobile |
| Ouvrir le lien | Le package officiel de l'équipe Flutter, `url_launcher` (6.3.3, dernière version publiée), avec `launchUrl` et `LaunchMode.externalApplication`, pour ouvrir l'autre app plutôt qu'une vue web dans l'app |
| Retenir le choix | Plus rien à retenir : `shared_preferences` retiré (`flutter pub remove shared_preferences`, par le user, 2026-11-05), avec la ligne « Navigation » de l'onglet Compte |
| Configuration Android et iOS | Aucune : sans `canLaunchUrl`, ni `<queries>` ni `LSApplicationQueriesSchemes` ne sont nécessaires |
| Composants | Ceux de `shadcn_flutter`, ou des composants de `lib/core/widgets` construits dessus (règle `shadcnOnly`). La feuille de choix : vérifier d'abord ce que `shadcn_flutter` 0.0.51 propose |
| Guidage de l'app | Inchangé : le bouton s'ajoute, le chauffeur choisit |

### Règles

| Cas | Résultat |
|---|---|
| Appui sur « Itinéraire » | La feuille de choix, puis l'app choisie |
| Avant « Je suis arrivé » | Le lien vise le point de prise en charge |
| Passager à bord | Le lien vise la destination |
| Feuille fermée sans choisir | Rien n'est ouvert |
| Le lien ne peut pas s'ouvrir | Message en bas de l'écran : « Impossible d'ouvrir la navigation. » |
| Retour dans l'app | Rien ne change : la course a continué, le chauffeur reprend où il en était |

### API

Aucune route nouvelle ni modifiée.

### Nouveaux éléments

**Mobile** :

- le package `url_launcher` ;
- une énumération des apps de navigation (Google Maps, Waze), qui construit le lien selon l'app et le point visé (règle testée en TDD) ;
- dans `lib/core` : un dépôt qui ouvre un lien dans une autre app (`url_launcher`), et le cas d'usage qui ouvre la navigation ;
- un bloc pour l'ouverture et ses échecs, partagé par les deux écrans ;
- le bouton rond « Itinéraire » sur `DriverPickupPage` et `DriverRidePage`, et la feuille de choix.

### Tables touchées

Aucune.

### Hors périmètre

- Détecter les apps installées, pour n'en proposer qu'une ou ouvrir directement la seule présente.
- Ouvrir la navigation tout seul, sans appui du chauffeur.
- Une autre app de navigation (Apple Plans…).

### Limites connues

- **Le retour dans l'app** se fait à la main : ni Google Maps ni Waze ne reviennent seuls dans l'app à l'arrivée.
- **Une app choisie mais absente** ouvre son site web.
- **iOS** : non testé, faute d'iPhone.

## À valider

1. **Où mettre le bouton. Validé par le user, 2026-11-05 :** un bouton rond « Itinéraire » dans la rangée « Écrire » et « Appeler », plutôt qu'une pastille sur la carte, d'abord proposée.
2. **Le choix de l'app. Validé par le user, 2026-11-05 :** d'abord demandé une seule fois, retenu et modifiable dans le Compte ; remplacé le même jour, à la demande du user, par la feuille de choix à chaque appui, car le Compte est inaccessible en pleine course. Les apps installées ne sont pas détectées pour la v1.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : ouvrir la navigation (mobile)

- [x] Commandes lancées par le user : `flutter pub add url_launcher` (6.3.3), puis `flutter pub add shared_preferences` (2.5.6)
- [x] Doc officielle relue : `launchUrl` renvoie `false` ou lève une `PlatformException` en cas d'échec ; `LaunchMode.externalApplication` « passes the URL to the OS to be handled by another application » ; `SharedPreferencesAsync`, l'API recommandée pour du code neuf, sans configuration Android ni iOS. Dans `shadcn_flutter` 0.0.51 : `openSheet`, fermé par `closeDrawer<T>(context, résultat)`, qui rend l'app choisie
- [x] Test d'abord : `NavigationApp.directionsTo`, les deux liens, en TDD ; 2 tests, rouges puis verts
- [x] `lib/core` : `NavigationApp`, `NavigationRepository` et son implémentation (`url_launcher`, `shared_preferences`), `DeviceFailure` (ajoutée sans demander, puis validée par le user le 2026-11-05), trois cas d'usage (lire, choisir, ouvrir) ; la règle « un choix non retenu ouvre quand même » est dans `ChooseNavigationAppUseCase`, testée en TDD (3 tests), et non dans le bloc ; le dépôt rattrape toute erreur, pas seulement `PlatformException`, après l'échec vu par le user le 2026-11-05 (`libdartjni.so` absente d'une app pas recompilée), `NavigationBloc` fourni dans `app.dart` au-dessus de l'app ; `AuthNavigator` inchangé, les composants lisant le bloc
- [x] Bouton rond `ItineraryButton` (le nom `NavigationButton` existe déjà dans shadcn) sur `DriverPickupPage`, à côté de « Écrire » et « Appeler » ; sur `DriverRidePage`, qui n'a pas cette rangée, à droite du nom de la destination (choix fait en codant sans demander, puis validé par le user le 2026-11-05). Feuille `openNavigationAppSheet`, ligne `NavigationAppRow` dans l'onglet Compte du chauffeur. Un lien qui ne s'ouvre pas donne le message en bas de l'écran
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni remarque sur les nouveaux fichiers, 95 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 1b : la feuille à chaque appui (mobile)

- [x] Commande lancée par le user : `flutter pub remove shared_preferences`
- [x] Retirés : la mémorisation du choix (`getChosenApp`, `saveChosenApp`), `LoadNavigationAppUseCase`, `ChooseNavigationAppUseCase` et ses 3 tests, la ligne « Navigation » de l'onglet Compte (`NavigationAppRow`), la phrase « Vous pourrez changer dans Compte. » de la feuille
- [x] « Itinéraire » ouvre toujours la feuille, puis `NavigationOpened(app, target)` ; `NavigationBloc` ne garde que les échecs d'ouverture
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur (seulement `one_member_abstracts` sur `NavigationRepository`, comme les autres dépôts à une méthode), 99 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 2 : test (par le user)

- [x] 1er appui sur « Itinéraire » : la feuille s'ouvre ; Google Maps démarre la navigation vers le client (vérifié par le user le 2026-11-05, après avoir recompilé l'app : un hot restart ne suffit pas après l'ajout d'un package natif)
- [x] Après l'étape 1b, recompiler l'app ; chaque appui rouvre la feuille ; Waze ouvre Waze, ou son site sans Waze installé (validé par le user, 2026-11-05)
- [x] Passager à bord : la navigation vise la destination (validé par le user, 2026-11-05)

### Fin de feature

- [x] Mettre à jour `.aimemory` du dépôt mobile
- [x] Commiter quand le user le demande (mobile `73bdd5d`)

## Sources

- [Google, Maps URLs](https://developers.google.com/maps/documentation/urls/get-started)
- [Waze, Deep links](https://developers.google.com/waze/deeplinks)
- [url_launcher](https://pub.dev/packages/url_launcher)
