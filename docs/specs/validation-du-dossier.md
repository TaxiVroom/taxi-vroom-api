# Prévenir le chauffeur que son dossier est validé

> Statut : spec validée par le user le 2026-11-06, points 1 à 6 compris ; étapes 1 à 3 codées le 2026-11-06, à la suite à la demande du user, non commitées ; le test (étape 4) attend le user.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

## Spec

### Besoin

Demandé par le user le 2026-11-06. Après l'envoi de ses documents, le chauffeur arrive sur « Dossier en cours de vérification ». L'écran promet de « vous informer du résultat sous 24h », mais rien ne l'informe, et il n'a aucun bouton : même validé, le chauffeur y reste jusqu'à ce qu'il relance l'app.

Le serveur ne peut pas le joindre aujourd'hui : il ne garde le jeton de notification d'un téléphone que pour un compte créé (`PUT /v1/me/push-registration`, réservée aux rôles passager et chauffeur ; table `push_registrations` liée à `users`), et le compte du chauffeur n'est créé qu'à la validation de son dossier. La permission des notifications ne lui est demandée qu'au passage en ligne.

### Comment ça marche

**1. Le chauffeur envoie son dossier**

```text
App : écran « Dossier en cours de vérification »
  Encadré « Soyez prévenu dès la validation » + bouton « Activer les notifications »
    ↓ appui
  Fenêtre du téléphone « Autoriser Taxi Vroom à vous envoyer des notifications ? »
    ├─ oui → « Vous serez prévenu dès la validation »
    │        App → Firebase Cloud Messaging : « donne-moi un identifiant » → fX3k9…
    │        App → API : PUT /v1/registration-flows/me/push-token { fX3k9… }
    │        API → Postgres : registration_push_tokens (le jeton de l'inscription)
    ├─ non → l'encadré reste, le bouton aussi
    └─ refusé pour de bon → voir « À valider », point 5
(Permission déjà donnée en arrivant sur l'écran, ou à chaque retour dans l'app : le jeton part tout de suite, l'encadré dit « Vous serez prévenu dès la validation »)
```

**2. L'admin valide le dernier document**

```text
API : inscription terminée (RegistrationCompleted)
  ↓
Compte créé (UserCreated, rôle chauffeur)
  ↓
Module notification, gestionnaire UserCreated :
  ├─ lit le jeton de l'inscription (requête du module inscription)
  ├─ l'enregistre dans push_registrations, sa propre table : le chauffeur reçoit ensuite ses courses comme les autres
  ├─ fait oublier le jeton à l'inscription (commande du module inscription) : il n'est gardé qu'une fois
  └─ API → Firebase Cloud Messaging → téléphone :
       « Dossier validé — Vous pouvez passer en ligne et recevoir vos premières courses. »
```

**3. L'écran d'attente passe tout seul à l'accueil**

```text
App sur « Dossier en cours de vérification »
  ├─ notification reçue l'app ouverte (flux onMessage, déjà suivi par WatchPushedRidesUseCase)
  ├─ retour de l'app au premier plan
  └─ toutes les 30 secondes
       ↓ chacun
     App → API : GET /v1/registration-flows/me
       ↓ COMPLETE
     Accueil chauffeur

App fermée : le chauffeur touche la notification → l'app s'ouvre → la session lit COMPLETE → accueil
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Plateformes | Android et iOS. Les notifications ne sont livrées que sur Android : iOS attend un iPhone et un compte Apple payant (mémoire des deux dépôts, `push`). Rien n'est dit fait sur iOS avant d'y avoir été testé |
| Quand demander la permission | Sur l'écran « Dossier en cours de vérification », juste après l'envoi du dossier : le chauffeur attend une réponse, il comprend à quoi sert la notification. Doc Android : « Ask for a permission in context, when the user starts to interact with the feature that requires it », et pour les notifications « Request the permission in context […] so that it's explicitly clear what the notifications are used for » |
| Comment la demander | Un encadré qui donne la raison, et un bouton qui ouvre la fenêtre du téléphone, plutôt que la fenêtre dès l'arrivée sur l'écran. Doc Android : « if the user taps Deny for a specific permission more than once […] the user will no longer see the system permissions dialog », et « You can trigger a permissions prompt from a user action ». Réutilise `NotificationPermissionBloc` et `EnableNotificationsUseCase` (spec `permission-notifications.md`) |
| Quand envoyer le jeton | Une fois la permission donnée : doc Firebase, « before FCM payloads can be received on your device, you must first ask the user's permission ». Sans permission, rien n'est envoyé |
| Le jeton gardé une seule fois | Copié dans `push_registrations` à la création du compte, puis oublié par l'inscription (règle `noNullableNoDuplicate`) |
| Échanges entre modules (API) | Le module notification réagit à l'événement `UserCreated`, lit le jeton par une requête du module inscription et lui fait oublier le jeton par une de ses commandes : les couplages permis par `CLAUDE.md`, comme le véhicule à la feature précédente. Chaque écriture passe par le dépôt de son module, dans une transaction |
| Texte de la notification | Titre « Dossier validé », texte « Vous pouvez passer en ligne et recevoir vos premières courses. » ; la toucher ouvre l'app, qui mène à l'accueil chauffeur |
| Composants | Ceux de `shadcn_flutter` et de `lib/core/widgets` (règle `shadcnOnly`) ; l'encadré reprend ce que `NotificationsRow` sait déjà afficher, si elle convient (vérifié en codant, sinon question au user) |
| Notification envoyée avant la fin de la création du compte (accepté par le user pour l'instant, 2026-11-07) | Le gestionnaire suit le format du template (`create-wallet-when-user-is-created.domain-event-handler.ts`) : il travaille dans la transaction de la création du compte. Si cette création échoue après l'envoi, le chauffeur reçoit « Dossier validé » sans compte ; cas rare, noté dans la mémoire de l'API (`validatedPushBeforeCommit`), à régler plus tard en envoyant après l'enregistrement en base |
| Refus d'un document | Hors périmètre : l'admin ne peut pas encore refuser (`documentReviewUnfinished` dans la mémoire de l'API) |

### Règles

| Cas | Résultat |
|---|---|
| Dossier validé, app fermée, notifications autorisées | La notification s'affiche ; la toucher ouvre l'accueil chauffeur |
| Dossier validé, app ouverte sur l'écran d'attente | Passage à l'accueil, au plus tard 30 s après |
| Dossier validé, notifications refusées | Pas de notification ; l'accueil s'ouvre au prochain retour dans l'app, ou dans les 30 s si elle est ouverte |
| Pas de jeton gardé (permission refusée, envoi raté, ancien chauffeur) | Pas de notification ; rien d'autre ne change |
| Envoi de la notification raté | Rien ne bloque : la validation est faite (`SendPushCommand` n'échoue jamais, mémoire de l'API) |
| Le jeton envoyé deux fois, ou par un autre téléphone | Le dernier remplace le précédent |

### API

- Nouvelle `PUT /v1/registration-flows/me/push-token` `{ token }` : pour une inscription en cours, sans compte, comme les autres routes de l'inscription.
- Aucune autre route : la notification part de la création du compte.

### Nouveaux éléments

**API** :

- module inscription : une commande et sa route pour garder le jeton, une requête pour le lire, une commande pour l'oublier ;
- module notification : un gestionnaire `UserCreated`, pour un chauffeur seulement, qui enregistre le jeton, le fait oublier à l'inscription, puis envoie « Dossier validé » par `SendPushCommand`, déjà en place.

**Mobile** :

- l'envoi du jeton, une fois la permission donnée, depuis l'écran d'attente ;
- l'encadré de permission sur l'écran d'attente, avec une raison propre à ce besoin (`NotificationNeed`) ;
- un cas d'usage qui relit l'inscription à la notification reçue (`WatchPushedRidesUseCase`, déjà en place), au retour au premier plan et toutes les 30 s, et dit quand elle est terminée ; le bloc de l'inscription chauffeur passe alors à l'accueil. Règle testée en TDD : terminé seulement quand l'inscription est `COMPLETE`.
- le cas d'usage passé par chaque niveau, de `app.dart` à `DriverRegistrationBloc` (`CLAUDE.md` mobile).

### Tables touchées

- Nouvelle `registration_push_tokens` : `userId` (clé, liée à `Registration`), `token`, `updatedAt`. Une ligne par inscription, remplacée à chaque envoi, supprimée à la création du compte. Rien que `schema.prisma` ne sache écrire (règle `prismaOnlySchema`).

### Hors périmètre

- Prévenir d'un document refusé, et le corriger.
- Un e-mail en plus de la notification.
- Le délai « sous 24h » affiché, qu'aucun mécanisme ne garantit.

## À valider

1. **Où garder le jeton avant la création du compte. Validé par le user, 2026-11-06, tel que proposé.** Proposé : une table `registration_push_tokens` liée à l'inscription, déplacée dans `push_registrations` à la création du compte. Écarté : ouvrir `push_registrations` aux inscriptions, ce qui casserait son lien avec `users`.
2. **Comment l'écran apprend la validation. Validé par le user, 2026-11-06, tel que proposé.** Proposé : relire l'inscription à la notification reçue, au retour au premier plan et toutes les 30 s, tant que l'écran est ouvert ; une requête légère. Écarté : un chemin Firebase écrit par le serveur, plus de code et de règles pour un écran rare.
3. **Le texte de la notification. Validé par le user, 2026-11-06, tel que proposé.** Proposé : « Dossier validé » / « Vous pouvez passer en ligne et recevoir vos premières courses. »
4. **L'encadré. Validé par le user, 2026-11-06, tel que proposé.** Proposé : « Soyez prévenu dès la validation. Activez les notifications pour savoir quand vous pourrez prendre vos premières courses. » et le bouton « Activer les notifications ».
5. **Après un refus définitif. Validé par le user, 2026-11-06, tel que proposé.** L'app propose aujourd'hui « Ouvrir les réglages » (onglet Compte, spec `permission-notifications.md`). La doc Android conseille de respecter le refus : « Don't link to system settings in an effort to convince the user to change their decision », et « persistent nagging to reconsider is not respectful of their choice ». Proposé ici : l'encadré dit seulement « Notifications désactivées : vous verrez la validation en rouvrant l'app », sans bouton. Écarté : « Ouvrir les réglages » sur cet écran.
6. **La doc Apple. Validé par le user, 2026-11-06, tel que proposé.** La page officielle « Asking permission to use notifications » ne s'affiche pas sans navigateur : la règle d'iOS (fenêtre montrée une seule fois ?) n'est pas vérifiée. Proposé : la lire avant l'étape 3 ; si elle reste illisible, demander au user avant d'utiliser une autre source (règle `officialDocs`).

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : base de données (API)

- [x] `schema.prisma` : `RegistrationPushToken` (`registration_push_tokens`), liée à `Registration` par son `userId`, supprimée avec elle
- [x] Commandes lancées par le user : `npm run migration:dev --name add_registration_push_tokens`, puis `npm run prisma:generate` ; migration `20261106133246_add_registration_push_tokens` appliquée, vérifiée en base le 2026-11-06

### Étape 2 : garder le jeton et prévenir (API)

- [x] Module inscription : `SaveRegistrationPushTokenCommand` et `PUT /v1/registration-flows/me/push-token` (204, 404 sans inscription), `FindRegistrationPushTokenQuery`, `ForgetRegistrationPushTokenCommand` ; le dépôt de l'inscription garde et oublie le jeton, dans une transaction
- [x] Module notification : `TellDriverWhenAccountIsCreatedDomainEventHandler` sur `UserCreated`, pour un chauffeur : lit le jeton, l'enregistre par son dépôt `PushRegistrationRepositoryPort`, puis envoie « Dossier validé » par `SendPushCommand`, valable 24 h ; sans jeton, rien. Module inscription : `ForgetPushTokenWhenUserIsCreatedDomainEventHandler` oublie le jeton (voir la correction plus bas)
- [x] Vérifications : `npx tsc --noEmit` sans erreur ; `npm run lint` à ses 9 erreurs habituelles, aucune dans la feature ; le user lance `npm run deps:validate`

### Étape 3 : l'écran d'attente (mobile)

- [x] Doc officielle : `firebase_messaging`, page « Receive messages in Flutter apps » (citée dans Sources : la permission avant les messages, `onMessage` l'app ouverte) ; `permission_handler` sert déjà par `NotificationPermissionBloc`, sans changement. La page Apple du point 6 reste illisible sans navigateur : rien de propre à iOS n'en dépend dans le code, la question au user reste ouverte avant tout test sur iPhone
- [x] Test d'abord (TDD) : `CheckRegistrationValidatedUseCase`, terminée seulement à `COMPLETE`, et une erreur réseau veut dire « pas encore » ; 3 tests, rouges puis verts
- [x] `SendRegistrationPushTokenUseCase` (jeton du téléphone par `PushRegistrationRepository.getDeviceToken`, ajoutée, puis `PUT …/push-token`) ; `DriverRegistrationRepository.getCurrentStep` (même route `GET /v1/registration-flows/me`, rôle et téléphone pris dans la session Firebase) et `savePushToken`. Événements `DriverRegistrationReviewWatched` (notification reçue par `WatchPushedRidesUseCase`, ou 30 s), `DriverRegistrationReviewChecked` (une lecture à la fois, `RegistrationAuthenticated` à `COMPLETE`), `DriverRegistrationPushTokenSent`. Écran `RegistrationSuccessPage` : relecture au retour au premier plan ; encadré (`Card` de shadcn_flutter) avec « Activer les notifications » (`NotificationPermissionChecked`, raison `NotificationNeed.registrationReview`), jeton envoyé dès que la permission est donnée ; après un refus définitif, le texte seul, sans réglages (point 5). Passés par `app.dart`, `AuthNavigator`, `DriverRegistrationNavigator`. Écart fait en codant : `droppable()` de `bloc_concurrency` n'est pas installé, et `stream_transform` 2.1.2 n'a rien d'équivalent : un drapeau garde une lecture à la fois
- [x] Vérifications : `dart format` et `dart fix` (ordre des imports) sur les fichiers touchés, `flutter analyze` sans erreur ni avertissement, 116 tests verts, lint Bloc à ses 6 alertes habituelles

- [x] Corrigé après le premier test (2026-11-06) : à la validation du dernier document, erreur 500 et compte annulé, l'inscription restée `COMPLETE`. `UserCreated` est levé dans la transaction encore ouverte de la création du compte ; le gestionnaire écrivait en même temps que celui du module chauffeur, et une transaction ouverte dans une autre efface en se terminant la connexion commune (`prisma-repository.base.ts`) : les deux se sont attendus jusqu'au délai. Corrigé selon la décision du user (2026-11-07) : chaque gestionnaire suit le format du template, `create-wallet-when-user-is-created.domain-event-handler.ts` (attendu, le dépôt de son module, sans transaction à lui) ; `TellDriverWhenAccountIsCreated` enregistre le jeton par son dépôt et envoie la notification ; `ForgetPushTokenWhenUserIsCreated`, dans le module inscription, oublie le jeton par son propre dépôt, sur le même événement, à la place de la commande d'oubli, supprimée ; `CreateDriverWhenUserIsCreated` n'ouvre plus de transaction. Un premier essai de correction (gestionnaire non attendu, dans son propre `RequestContext`) a été retiré : il s'écartait du template. La faille de la classe de base est notée dans la mémoire de l'API (`nestedTransactionClears`), à traiter à part. Le log du serveur est perdu : cause déduite du code et de la base, pas confirmée par lui. Chauffeur de test réparé à la main avec l'accord du user

- [x] Corrigé après le deuxième test (2026-11-07) : un chauffeur arrivé avec la permission déjà donnée (un autre compte l'avait accordée sur le même téléphone) n'envoyait pas son jeton : l'app ne l'envoyait qu'au passage de la permission à « autorisée », et l'état de la permission vit toute la durée de l'app. Corrigé selon la décision du user (2026-11-07), comme le conseillent les plateformes (Firebase renvoie le jeton à chaque démarrage, Android regarde d'abord si la permission est déjà donnée) : `RegistrationSuccessPage` envoie le jeton en arrivant et à chaque retour au premier plan si la permission est donnée, et toujours quand elle vient d'être donnée. API inchangée : la route remplace le jeton. `getToken()`, marqué déprécié par Firebase au profit des identifiants d'installation, est gardé : décision du user, 2026-11-07

### Étape 4 : test (par le user, sur Android)

- [x] Nouveau chauffeur : l'encadré s'affiche après l'envoi du dossier ; autoriser les notifications (chauffeur 3, 2026-11-07)
- [x] App fermée, l'admin valide : la notification arrive, la toucher ouvre l'accueil (chauffeur 4, app en arrière-plan, 2026-11-07 ; l'accueil passe d'abord par le faux écran « Vos documents », existant, noté dans `docs/a-faire.md`)
- [x] App ouverte sur l'écran d'attente, l'admin valide : l'accueil s'ouvre seul (chauffeur 3, 2026-11-07)
- [ ] Notifications refusées : pas de notification, l'accueil s'ouvre au retour dans l'app
- [ ] Le chauffeur validé reçoit ensuite les notifications de course

### Fin de feature

- [ ] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande

## Sources

- [Android, Notification runtime permission](https://developer.android.com/develop/ui/views/notifications/notification-permission) : « Request the permission in context », « You can trigger a permissions prompt from a user action »
- [Android, Request runtime permissions](https://developer.android.com/training/permissions/requesting) : « if the user taps Deny for a specific permission more than once […] the user will no longer see the system permissions dialog », « Don't link to system settings in an effort to convince the user to change their decision »
- [Firebase, Receive messages in Flutter apps](https://firebase.google.com/docs/cloud-messaging/flutter/receive) : « before FCM payloads can be received on your device, you must first ask the user's permission », « To handle messages while your application is in the foreground, listen to the `onMessage` stream »
- [Apple, Asking permission to use notifications](https://developer.apple.com/documentation/usernotifications/asking-permission-to-use-notifications) : non lue, voir « À valider », point 6
- [Firebase, Manage registration tokens](https://firebase.google.com/docs/cloud-messaging/manage-tokens) : le serveur met à jour la date du jeton « on every upload request »
- [Firebase, Set up a Flutter client](https://firebase.google.com/docs/cloud-messaging/flutter/client) : `onTokenRefresh` « is fired at each app startup and whenever a new token is generated »
