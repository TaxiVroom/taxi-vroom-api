# Permission des notifications

> Statut : codée et commitée le 2026-11-05. Pas testée sur un émulateur, par choix du user (étape 3).

Concerne `taxi-vroom-mobile` seulement : l'API n'est pas touchée. La spec vit dans l'API, avec les autres.

## Spec

### Besoin

Sans la permission des notifications, Android et iOS reçoivent les notifications de l'app mais n'en affichent aucune. Aujourd'hui, l'app ne la demande qu'à un seul endroit :

- **Passager** : l'écran « Activer les notifications » de l'inscription, vu une seule fois par compte.
- **Chauffeur** : jamais. Son inscription ne montre pas cet écran (`DriverRegistrationBloc`, « the driver flow never shows the notifications screen »). Sur l'émulateur, la permission a été accordée à la main avec `adb pm grant`.

L'onglet Compte a bien un interrupteur « Notifications », chez le passager et chez le chauffeur, mais il est simulé (`AccountRemoteDataSourceFake`, `DriverAccountRemoteDataSourceFake`) : il change une valeur en mémoire, démarre toujours à « activé », et ne lit ni ne demande la permission. Il affiche donc « activé » même quand rien ne s'affiche.

Les cas qui cassent :

- l'app est réinstallée, ou installée sur un nouveau téléphone, avec un compte existant : Android remet la permission à zéro, et l'inscription n'est pas repassée. Constaté plusieurs fois le 2026-11-04 (`POST_NOTIFICATIONS: granted=false`) ;
- la personne coupe les notifications dans les réglages du téléphone ;
- tout chauffeur, dès sa première connexion.

Conséquence la plus grave : un chauffeur engagé sur une réservation ne voit pas le rappel « Passez en ligne avant … », et sa course part à un autre taxi.

### Comment ça marche

La permission est demandée **au moment où elle sert**, après une action de la personne, comme le recommande la documentation Android : « Ask for a permission in context, when the user starts to interact with the feature that requires it » ([Request runtime permissions](https://developer.android.com/training/permissions/requesting)).

**Les quatre moments**

```text
Passager : « Commander » réussi            ┐
Passager : « Réserver le taxi » réussi     │→ vérifier la permission
Chauffeur : passe « En ligne »             │
Chauffeur : « Accepter » une réservation   ┘
```

**Ce qui se passe à chaque fois**

```text
App → permission_handler : Permission.notification.status
  ├─ accordée → rien
  └─ pas accordée → Permission.notification.request()
        ├─ Android peut encore montrer la fenêtre → « Autoriser / Ne pas autoriser »
        │     ├─ « Autoriser » → accordée → rien de plus
        │     ├─ 1er refus → refusée → rien de plus
        │     └─ 2e refus → refusée définitivement → message (voir plus bas)
        └─ bloquée → réponse immédiate, sans fenêtre : refusée définitivement
              → message à l'écran, avec « Réglages »
              → openAppSettings() ouvre la page de l'app dans les réglages du téléphone
```

Sur Android, `status` ne répond jamais « refusée définitivement » : « On Android, only the result of `request()` can be `permanentlyDenied`; `status` reports `denied` instead » ([permission_handler](https://github.com/Baseflow/flutter-permission-handler/blob/main/permission_handler/README.md)). Demander une permission bloquée ne coûte rien : « the OS resolves it immediately without showing a dialog ». L'app appelle donc `request()` dès que la permission manque, et ne regarde que sa réponse.

L'action elle-même n'attend jamais la permission : la course est commandée, la réservation acceptée, le chauffeur passe en ligne, quoi que la personne réponde.

**Pourquoi « Réglages » seulement en dernier recours**

Android n'affiche plus la fenêtre système après deux refus : « if the user taps Deny for a specific permission more than once [...] the user will no longer see the system permissions dialog » ([même page](https://developer.android.com/training/permissions/requesting)). Seuls les réglages du téléphone permettent alors de réactiver les notifications ; l'app ne peut pas le faire elle-même. Sur iOS, la fenêtre ne s'affiche qu'une fois, puis seulement les réglages.

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS ; iOS préparé et non testé, faute de Mac |
| Package | `permission_handler` 12.0.1, déjà installé et utilisé par l'inscription. Sa réponse à `request()` dit si la fenêtre ne peut plus s'afficher (`isPermanentlyDenied`), et il ouvre les réglages (`openAppSettings()`). Écarté : `FirebaseMessaging.requestPermission()` de `firebase_messaging` 16.7.1, dont la doc dit que sur Android 13 et plus il n'y a « no way to determine if the user has chosen whether to grant/deny permission » ([FlutterFire, Receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive)) |
| Respect du choix | Ni bandeau permanent, ni demande à l'ouverture de l'app : la documentation Android demande d'accepter le choix de la personne, sans insister (« persistent nagging to reconsider is not respectful of their choice ») |
| Écran de l'inscription | Inchangé : le passager y voit toujours « Activer les notifications » |
| Stocker le choix (question du user, 2026-11-05) | Non : le téléphone est la seule source fiable, la personne pouvant couper les notifications dans les réglages sans passer par l'app ; une copie deviendrait fausse. La lecture est immédiate, sans réseau, et la doc Android demande de vérifier à chaque fois (« Each time your app needs to access functionality that requires a permission, check that your app is still granted that permission ») |
| Après « Ne pas autoriser » (validé par le user, 2026-11-05) | Au 1er refus, rien. Au 2e refus, le message s'affiche tout de suite : `request()` répond alors « refusée définitivement », et l'app ne peut pas savoir si la fenêtre vient d'être montrée. Le message explique la conséquence du choix, sans insister. Écarté : compter les demandes dans l'app pour le deviner, qui se tromperait après une réinstallation ou un changement dans les réglages, la doc Android demandant de ne rien supposer du système |

### Règles

| Cas | Résultat |
|---|---|
| Permission accordée | Rien n'est montré |
| Jamais demandée, ou refusée une fois | La fenêtre système s'affiche |
| Refusée pour la 1re fois dans la fenêtre | Rien de plus |
| Refusée pour la 2e fois dans la fenêtre | Le message s'affiche, avec « Réglages » |
| Bloquée (refusée deux fois avant) | Pas de fenêtre ; le message s'affiche, avec « Réglages » |
| La personne revient des réglages sans activer | Rien de plus, jusqu'à la prochaine action |
| L'action échoue (commande refusée, pas de réseau) | Pas de vérification : seule une action réussie déclenche la demande |
| Vérification impossible (erreur du package) | Rien n'est montré, l'action continue |

### Messages

| Qui | Quand | Titre | Texte |
|---|---|---|---|
| Passager | Après « Commander » ou « Réserver le taxi » | Notifications désactivées | Vous ne serez pas prévenu quand votre taxi arrive. |
| Chauffeur | Après « En ligne » | Notifications désactivées | Vous ne recevrez pas les courses quand l'app n'est pas à l'écran. |
| Chauffeur | Après « Accepter » une réservation | Notifications désactivées | Vous ne recevrez pas le rappel de cette réservation. |

Chaque message a un bouton « Réglages ». Validé par le user, 2026-11-05 (point 6) :

- **chauffeur** : un message en bas de l'écran, `showMessageToast` (`lib/core/widgets/message_toast.dart`) étendu pour un bouton d'action. L'écran ne change pas après « En ligne » ou « Accepter » ;
- **passager** : une fenêtre, avec « Réglages » et « Continuer », affichée avant d'ouvrir l'écran de la course. Un message en bas disparaîtrait avec l'écran du choix du taxi : dans `shadcn_flutter` 0.0.51, chaque `Scaffold` a son propre calque à messages (`ToastLayer`). La course est déjà commandée : rien n'attend côté serveur.

**Onglet Compte** (point 4) : la ligne « Notifications » affiche « Activées » ou « Désactivées », lues dans le téléphone à l'ouverture de l'onglet. « Activer » affiche la fenêtre système si c'est encore possible, sinon ouvre les réglages.

### API

Aucune route nouvelle ni modifiée.

### Nouveaux éléments

**Mobile** :

- `NotificationPermissionRepository` dans `lib/core`, avec son implémentation sur `permission_handler` : lire l'état, demander, ouvrir les réglages ;
- un cas d'usage, `EnsureNotificationPermissionUseCase`, qui contient la règle ci-dessus et renvoie l'issue : accordée, refusée, ou refusée définitivement ;
- deux petits cas d'usage : lire l'état sans rien demander (onglet Compte), et ouvrir les réglages ;
- un seul bloc, `NotificationPermissionBloc` (point 7), fourni dans `app.dart` au-dessus de `AuthNavigator` : événements « vérifier » (après une action, avec le besoin : suivi de la course, courses du chauffeur, rappel de réservation), « lire », « activer » (onglet Compte) et « ouvrir les réglages » ; l'état garde la permission et, après une vérification bloquée, le besoin à expliquer. Les pages le préviennent après une action réussie, par un `BlocListener`, comme « Je pars » passe de `DriverBookingsBloc` à `DriverFlowBloc` ; `TaxiChoiceBloc`, `DriverHomeBloc` et `DriverBookingsBloc` ne changent pas ;
- `showMessageToast` avec un bouton d'action facultatif ;
- la ligne « Notifications » des deux onglets Compte, à la place de l'interrupteur simulé.

### Tables touchées

Aucune.

### Hors périmètre

- Bloquer le passage en ligne d'un chauffeur sans notifications.
- Vérifier la permission à chaque ouverture de l'app.
- Dire au serveur qu'un chauffeur ne voit pas ses notifications, pour le prévenir autrement (par SMS, par exemple).

### Limites connues

- **iOS** : `permission_handler` demande la macro `PERMISSION_NOTIFICATIONS=1` dans le `post_install` du `Podfile` ([permission_handler 12.0.1](https://pub.dev/packages/permission_handler/versions/12.0.1)). Le dépôt n'a pas encore de `Podfile` : il est créé au premier build iOS, sur un Mac. À ajouter ce jour-là, sinon la demande ne fait rien sur iOS.
- **L'ancien interrupteur simulé reste dans le modèle** : `notificationsEnabled` des comptes passager et chauffeur, son événement et son cas d'usage ne sont plus affichés ni appelés, mais pas encore supprimés (une vingtaine de fichiers, hors de cette feature).
- **Notifications coupées par canal** : si la personne garde la permission mais coupe seulement le canal « rides » dans les réglages, l'app ne le voit pas.

## À valider

1. **Les quatre moments. Validé par le user, 2026-11-05 :** « Commander » et « Réserver le taxi » réussis pour le passager ; passage « En ligne » et « Accepter » une réservation pour le chauffeur. Le passage en ligne est le plus important : c'est là qu'un chauffeur commence à dépendre des notifications.
2. **Le message après un refus définitif. Validé par le user, 2026-11-05 :** un message à chacune de ces actions, tant que les notifications restent désactivées, avec « Réglages ». C'est ce que la documentation Android appelle prévenir « when attempting to use a part of the app blocked without the permission ». L'autre option, le montrer une seule fois par installation, risque de laisser un chauffeur sans notifications sans qu'il s'en souvienne.
3. **Réutiliser plutôt que dupliquer. Validé par le user, 2026-11-05.** L'inscription a deux dépôts identiques, `NotificationRepository` (passager) et `DriverNotificationRepository` (chauffeur), marqués à tort « Mock » alors qu'ils demandent vraiment la permission. Je propose de les remplacer par le nouveau dépôt de `lib/core`, utilisé par l'inscription comme par les quatre moments. L'autre option est de les laisser tels quels, au prix de trois copies du même code.
4. **L'interrupteur « Notifications » de l'onglet Compte. Validé par le user, 2026-11-05 : option A.** Il est simulé et peut tromper. L'app ne peut pas couper ni accorder la permission elle-même : seul le téléphone le peut. Trois options :
   - **A (recommandée)** : le remplacer par l'état réel, « Activées » ou « Désactivées », avec un bouton « Activer » qui affiche la fenêtre système si c'est encore possible, sinon « Réglages ». C'est l'endroit que la personne va chercher d'elle-même, sans aucune insistance de l'app ;
   - B : le retirer, en attendant ;
   - C : le laisser simulé, au risque d'afficher « activé » à tort.
5. **Le 2e refus. Validé par le user, 2026-11-05.** Trouvé en relisant la doc de `permission_handler` avant de coder : sur Android, seul `request()` dit « refusée définitivement », y compris juste après le 2e refus dans la fenêtre. Le message s'affiche donc tout de suite à ce moment-là, au lieu d'attendre l'action suivante. Voir la décision « Après « Ne pas autoriser » ».
6. **Le message du passager disparaîtrait. Validé par le user, 2026-11-05.** Trouvé en lisant le code avant l'étape 2 : un message en bas de l'écran est attaché à son écran, et l'app quitte le choix du taxi juste après la commande. Retenu : une fenêtre avant d'ouvrir la course, côté passager ; un message en bas, côté chauffeur. Voir « Messages ».
7. **Un seul bloc pour la permission. Validé par le user, 2026-11-05.** Plutôt que de l'ajouter à trois blocs et aux deux onglets Compte, avec chacun son état et son événement « ouvrir les réglages » : `NotificationPermissionBloc`, prévenu par les pages. Voir « Nouveaux éléments ».

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : la règle (mobile)

- [x] Relire la doc officielle de `permission_handler` 12.0.1 pour `status`, `request()`, `isPermanentlyDenied` et `openAppSettings()` : sur Android, seul `request()` dit « refusée définitivement » (point 5)
- [x] Test d'abord : la règle de `EnsureNotificationPermissionUseCase` (accordée, à demander, refusée définitivement, erreur), en TDD, avec un faux dépôt ; 4 tests, rouges puis verts
- [x] `NotificationPermission`, `NotificationPermissionRepository` et son implémentation dans `lib/core`, nouvelle erreur `PermissionFailure`
- [x] Point 3 : l'inscription, passager et chauffeur, passe sur `EnsureNotificationPermissionUseCase` ; les deux anciens dépôts et leurs deux cas d'usage sont supprimés
- [x] Vérifications : `dart format` sur les fichiers touchés (il a reformaté en entier les deux blocs et les deux navigateurs de l'inscription, jamais formatés jusque-là), `flutter analyze` sans erreur ni avertissement nouveau, 93 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 2 : les quatre moments (mobile)

- [x] `showMessageToast` avec un bouton d'action facultatif ; textes et deux affichages réunis dans `lib/core/widgets/notifications_blocked.dart` (`showNotificationsBlockedToast`, `showNotificationsBlockedDialog`, sur `showDialog` et `AlertDialog` de `shadcn_flutter` 0.0.51, lus dans son code installé)
- [x] `NotificationPermissionBloc` (`lib/core/presentation/bloc`) et ses deux petits cas d'usage, `LoadNotificationPermissionUseCase` et `OpenNotificationSettingsUseCase`, fourni dans `app.dart` au-dessus de l'app
- [x] Passager : `TaxiChoicePage` vérifie après « Commander » ou « Réserver le taxi » réussis, attend la réponse, montre la fenêtre si besoin, puis seulement ouvre l'écran suivant
- [x] Chauffeur : `driver_home_page` vérifie au passage en ligne et après une acceptation (la réservation est passée des disponibles aux acceptées) ; le message en bas s'affiche quand la vérification finit bloquée
- [x] Point 4 : `NotificationsRow` (`lib/core/widgets`) dans les deux onglets Compte, à la place de l'interrupteur simulé ; relue à l'affichage et au retour de l'app au premier plan (`AppLifecycleListener`), par exemple en revenant des réglages
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni avertissement nouveau, 93 tests verts, lint Bloc à ses 6 alertes habituelles. Pas lancé sur un émulateur : c'est l'étape 3

### Étape 3 : test (par le user)

Décision du user, 2026-11-05 : pas testée pour l'instant, la feature étant petite ; un défaut trouvé plus tard sera corrigé alors.

- [ ] Réinstaller l'app, se connecter en passager, commander : la fenêtre système s'affiche
- [ ] Refuser deux fois, puis commander : le message s'affiche, « Réglages » ouvre la page de l'app
- [ ] Chauffeur jamais sollicité : passer en ligne, la fenêtre s'affiche
- [ ] Permission accordée : plus rien ne s'affiche
- [ ] Pour revenir à zéro entre deux essais : `adb shell pm revoke <package> android.permission.POST_NOTIFICATIONS`, puis `adb shell pm clear-permission-flags <package> android.permission.POST_NOTIFICATIONS user-set user-fixed` ([doc Android](https://developer.android.com/develop/ui/views/notifications/notification-permission))

### Fin de feature

- [x] Mettre à jour `.aimemory` du dépôt mobile (`notificationPermissionOnce` dans `hyp.md`, corrigée dans le code mais non testée) et compresser `done.md`
- [x] Commiter quand le user le demande

## Sources

- [Android, Request runtime permissions](https://developer.android.com/training/permissions/requesting)
- [Android, Notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission)
- [permission_handler 12.0.1](https://pub.dev/packages/permission_handler/versions/12.0.1)
- [FlutterFire, Receive messages](https://firebase.google.com/docs/cloud-messaging/flutter/receive)
