# « Contacter le développeur »

> Statut : feature close le 2026-11-11, testée par le user sur Android (appel et sous-titre en entier), non commitée. `npm run deps:validate` pas encore lancé ; cas « API arrêtée » non testé.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11, pour l'onglet « Compte » du chauffeur, section « Assistance » :

- retirer la ligne « Conditions d'utilisation » (« Vos droits et nos engagements »), qui ne mène à rien ;
- « Aide » (« Questions fréquentes, nous contacter »), qui ne mène à rien non plus, devient « Contacter le développeur » et appelle directement un numéro de téléphone.

Puis, le même jour : « Contacter le développeur » aussi dans l'onglet « Compte » du passager.

### Ce que voit le chauffeur (et le passager, pour « Contacter le développeur »)

1. Dans « Compte », section « Assistance » : la seule ligne « Contacter le développeur », avec son sous-titre ; plus de « Conditions d'utilisation ».
2. Il appuie sur « Contacter le développeur » : le numéro a été reçu à l'ouverture de l'onglet, rien ne tourne (voir « Quand l'app demande le numéro »).
3. L'app Téléphone s'ouvre, le numéro déjà tapé ; il appuie sur « Appeler ».
4. En raccrochant, il revient dans l'app, sur l'onglet « Compte ».
5. Sans réseau, ou si le téléphone ne peut pas appeler (une tablette) : message en bas de l'écran, « Impossible d'ouvrir le téléphone. »

### Comment ça marche

```text
Chauffeur appuie sur « Contacter le développeur »
  ↓
App → GET /v1/enterprise-contact
  ↓
API : lit CONTACT_PHONE dans son .env → { "phone": "+33…" }
  ↓
App → url_launcher : launchUrl(tel:<numéro>, mode externalApplication)
  ↓
Téléphone : ouvre son app d'appel, le numéro déjà tapé
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Conditions d'utilisation | Ligne retirée des onglets « Compte » du chauffeur et du passager (validé par le user, 2026-11-11) |
| Libellé (validé par le user, 2026-11-11) | « Aide » devient « Contacter le développeur », sous-titre « Intéressé par mon profil ? N'hésitez pas à m'appeler 😊 » à la place de « Questions fréquentes, nous contacter ». Écartés : « Nous contacter », d'abord retenu (« nous » contredisait « mon profil ») ; « Me contacter » (ne dit pas qui on appelle) ; « Intéressé par mon profil ? » en titre (remplace le seul contact de l'app) |
| Sous-titre en entier (demandé par le user, 2026-11-11) | Le sous-titre passe à la ligne au lieu d'être coupé par « … » (vu par le user : « N'hésitez pas à m'ap… ») : option `wrapsSubtitle` de `PlaceListTile`, les adresses restent sur une ligne |
| Passager (validé par le user, 2026-11-11) | « Contacter le développeur » aussi dans son onglet « Compte », identique : une seule ligne partagée par les deux onglets (`ContactUsRow` dans `lib/core/widgets`, comme `NotificationsRow`), un seul bloc fourni dans `app.dart` au-dessus des deux accueils, comme `NavigationBloc` |
| Où vit le numéro (validé par le user, 2026-11-11) | Dans le `.env` de l'API (`CONTACT_PHONE`), jamais dans l'app : ni dans le dépôt mobile, ni dans l'app installée. Il change sans nouvelle version de l'app, en redémarrant l'API. Écartés : une constante de l'app (visible dans le dépôt) ; le `.env` de l'app (caché du dépôt, mais compilé dans l'app installée) |
| Route (validé par le user, 2026-11-11) | `GET /v1/enterprise-contact`, à part : le numéro est celui de l'entreprise, le même pour tous, il n'a rien à voir avec le compte de l'utilisateur. Écarté : un champ dans `GET /v1/me` et `GET /v1/drivers/me/account` |
| Quand l'app demande le numéro | Chauffeur et passager (validé par le user, 2026-11-11, d'abord pour le chauffeur puis « fais pareil côté passager », remplace la règle de l'appui) : à chaque ouverture de l'onglet « Compte », en même temps que `GET /v1/drivers/me/account` ou `GET /v1/me` ; le rond de l'onglet tourne jusqu'aux deux réponses ; à l'appui, le téléphone s'ouvre aussitôt sur le numéro déjà reçu, sans rond ni nouvel appel. Si l'un des deux appels échoue, l'onglet montre son message d'erreur et « Réessayer », comme pour le compte |
| Accès à la route | Passager et chauffeur inscrits (`@Roles`), comme les autres routes ; un utilisateur non connecté ne l'obtient pas |
| Côté API | Un module `enterprise-contact` avec un seul contrôleur, qui lit la variable par `ConfigService`, comme `PrismaService` lit `DATABASE_URL` ; pas de table, pas de requête CQRS (rien n'est lu en base). `CONTACT_PHONE` déclarée dans `env.validation.ts` (l'API refuse de démarrer sans elle) et ajoutée sans valeur à `.env.example` ; le user la remplit dans son `.env` |
| Ouvrir l'appel | `url_launcher`, déjà installé (6.3.3), avec un lien `tel:` : « Make a phone call to `<phone number>` using the default phone app » ([url_launcher, Supported URL schemes](https://pub.dev/packages/url_launcher#supported-url-schemes)). Réutilise `NavigationRepository.open`, qui ouvre déjà un lien dans une autre app et rattrape tout échec |
| Appel direct | L'app Téléphone s'ouvre avec le numéro tapé, le chauffeur appuie sur « Appeler ». Lancer l'appel sans cet appui demanderait la permission Android « passer des appels », et iOS demande toujours une confirmation |
| Configuration Android et iOS | Aucune : `<queries>` et `LSApplicationQueriesSchemes` ne servent qu'à `canLaunchUrl`, que l'app n'appelle pas ; la doc conseille d'appeler `launchUrl` directement et de gérer l'échec |
| Plateformes | Android et iOS ; iOS préparé, non testé faute d'iPhone. Sur un simulateur iOS, pas d'app d'appel : « iOS simulators don't have a default […] phone app » |

### Règles

| Cas | Résultat |
|---|---|
| Appui sur « Contacter le développeur » | Petit rond sur la ligne, puis l'app d'appel s'ouvre, le numéro déjà tapé |
| Appui pendant que le rond tourne | Rien de plus |
| Pas de réseau, API en échec, ou l'app d'appel ne s'ouvre pas | Message en bas de l'écran : « Impossible d'ouvrir le téléphone. » |
| Retour dans l'app | Sur l'onglet « Compte », rien n'a changé |

### API

**`GET /v1/enterprise-contact`** (passager et chauffeur), nouvelle :

```json
{ "phone": "+33612345678" }
```

### Nouveaux éléments

**API** :

- `CONTACT_PHONE` dans `env.validation.ts` et `.env.example` ;
- le module `enterprise-contact` et son contrôleur `GET /v1/enterprise-contact`.

**Mobile** :

- la source et le dépôt du contact (`GET /v1/enterprise-contact`), un cas d'usage qui demande le numéro puis ouvre l'appel par `NavigationRepository.open` ;
- un bloc pour l'appui, son rond et son échec ;
- la ligne `ContactUsRow` dans `lib/core/widgets` ;
- dans `DriverAccountTab` : `ContactUsRow` à la place d'« Aide », « Conditions d'utilisation » retirée ;
- dans `AccountTab` (passager) : `ContactUsRow` à la place d'« Aide », « Conditions d'utilisation » retirée.

### Tables touchées

Aucune.

### Hors périmètre

- Une page d'aide, des questions fréquentes, un e-mail ou un chat.
- Les conditions d'utilisation, ailleurs dans l'app.

## À valider

1. **Le numéro à appeler. Validé par le user, 2026-11-11 :** dans le `.env` de l'API, rempli par le user, servi par `GET /v1/enterprise-contact`.
2. **Appel direct ou numéro pré-tapé.** Réglé par les plateformes : numéro pré-tapé, voir « Appel direct ».
3. **Le texte. Validé par le user, 2026-11-11 :** « Contacter le développeur », sous-titre « Intéressé par mon profil ? N'hésitez pas à m'appeler 😊 ». Écartés : « Appeler l'assistance », puis « Nous contacter », voir « Libellé ».
4. **Le passager. Validé par le user, 2026-11-11 :** « Contacter le développeur » aussi dans son onglet « Compte ».
5. **« Conditions d'utilisation » du passager. Validé par le user, 2026-11-11 :** retirée aussi de son onglet « Compte », comme chez le chauffeur.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Pour cette feature, le user a demandé de coder toutes les étapes d'un coup (2026-11-11) : étapes 1 et 2 enchaînées, pause avant son test.

### Étape 1 : la route (API)

- [x] `CONTACT_PHONE` dans `env.validation.ts` (format E.164 vérifié au démarrage) et `.env.example`
- [x] Module `enterprise-contact` (`EnterpriseContactModule`, `GetEnterpriseContactHttpController`), `GET /v1/enterprise-contact`
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles
- [ ] `npm run deps:validate` lancé par le user ; le user ajoute `CONTACT_PHONE` à son `.env`

### Étape 2 : « Contacter le développeur » (mobile)

- [x] Doc officielle relue (README de url_launcher 6.3.3 installé) : `tel:<phone number>` « Make a phone call to `<phone number>` using the default phone app » ; `canLaunchUrl` seul demande `<queries>` et `LSApplicationQueriesSchemes`
- [x] Test d'abord : `CallEnterpriseUseCase`, en TDD ; 3 tests (le numéro de l'API ouvert en `tel:`, pas de numéro, pas d'app d'appel), rouges puis verts
- [x] `EnterpriseContactRemoteDataSourceImpl`, `EnterpriseContactRepository` et son implémentation, `CallEnterpriseUseCase` (réutilise `NavigationRepository`), `ContactUsBloc` fourni dans `app.dart`
- [x] `ContactUsRow` (`lib/core/widgets`) sur `PlaceListTile` : « Contacter le développeur », son sous-titre, le rond à la place de la flèche pendant l'appel, le message en bas de l'écran en cas d'échec
- [x] `DriverAccountTab` et `AccountTab` : `ContactUsRow` à la place d'« Aide » ; « Conditions d'utilisation » retirée des deux
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni nouvelle alerte (seulement `one_member_abstracts`, comme les autres dépôts à une méthode), 126 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 3 : test (par le user)

- [x] Redémarrer l'API, recompiler l'app ; « Conditions d'utilisation » n'est plus là
- [x] Appui sur « Contacter le développeur » : l'app d'appel avec le bon numéro (user, 2026-11-11)
- [ ] API arrêtée : « Impossible d'ouvrir le téléphone. » (non testé)

### Fin de feature

- [x] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande

## Sources

- [url_launcher](https://pub.dev/packages/url_launcher)
