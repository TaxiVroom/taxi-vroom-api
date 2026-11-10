# L'inscription du chauffeur

> Statut : spec validée par le user le 2026-11-07, points 1 à 3 compris ; étape 1 codée le 2026-11-07 à la demande du user (« go coder »), non commitée ; testé le 2026-11-07.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API, qui porte les règles.

Elle décrit l'inscription telle qu'elle existe, codée avant la mémoire IA et déduite du code (qui fait foi), et y ajoute l'étape qui manque : les documents validés deviennent ceux du chauffeur. Deux parties ont déjà leur spec et n'y sont que résumées : l'étape « Votre taxi » (`vehicule-du-chauffeur.md`) et la notification de validation (`validation-du-dossier.md`). La vie des documents après l'inscription (expiration, renouvellement, écran « Vos documents ») sera une autre spec, `documents-du-chauffeur.md`, notée dans `docs/a-faire.md`.

## Spec

### Besoin

Demandé par le user le 2026-11-07. Le user pensait qu'à la validation du dernier document, les documents étaient recopiés dans la table `documents`. Ils ne le sont pas : vérifié le 2026-11-07, `documents` a 0 ligne alors que deux chauffeurs ont tous leurs documents validés, et aucun fichier de l'API ne lit ni n'écrit cette table (`documentsTableEmpty` dans la mémoire de l'API).

Les documents validés restent donc seulement dans `registration_documents`, la table de l'inscription :

- ils appartiennent à l'inscription, pas au chauffeur : `registration_documents` est supprimée en cascade avec l'inscription ;
- rien ne permet ensuite de suivre leur expiration ni de les renouveler, ce que la spec `documents-du-chauffeur.md` fera sur la table `documents`.

L'écran « Vos documents » de l'app chauffeur montre en attendant des données inventées, sans rien demander à l'API.

### Comment ça marche

**1. Le parcours, tel qu'il existe**

```text
App : Compte (téléphone + code SMS, Firebase Auth) → SOCIAL_LINK
  ↓ App → API : GET /v1/registration-flows/me (crée l'inscription, clé : l'identifiant Firebase)
E-mail → Nom → « Votre taxi » → Documents
  ↓ App → API : PATCH /v1/registration-flows/me { étape quittée, champs }
  ↓ « Votre taxi » : PUT /v1/registration-flows/me/vehicle   (spec vehicule-du-chauffeur.md)
Documents : pour chacun des 4 types, la photo du recto (et du verso si demandé)
  ↓ App → API : POST /v1/registration-flows/me/documents (fichiers)
  ↓ API → Firebase Storage : drivers/<uid>/<type>/front.jpg, back.jpg
  ↓ API → Postgres : registration_documents (SUBMITTED)
« Envoyer » → PENDING_REVIEW : « Dossier en cours de vérification »   (spec validation-du-dossier.md)
```

**2. L'admin valide, le compte est créé**

```text
Admin → API : PATCH /v1/admin/registration-documents/<id>/validate   (un par document)
  API → Postgres : registration_documents → VALIDATED
  Les 4 types validés → inscription COMPLETE → RegistrationCompleted
    → module utilisateur : users (UserCreated)
        → module chauffeur : drivers + driver_vehicles (copié de l'inscription)
                             + documents (copiés de l'inscription)   ← nouveau
        → module passager, portefeuille, notification « Dossier validé »
  Tout dans la même transaction : un échec annule le compte entier
```

**3. Après la copie**

```text
documents : une ligne par document validé, liée au chauffeur
  { type, chemin du recto, chemin du verso, date d'expiration vide pour l'instant }
Les fichiers ne bougent pas dans Firebase Storage : la ligne garde le même chemin
registration_documents reste comme trace de l'inscription
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Découpage (validé par le user, 2026-11-07) | Deux specs : celle-ci, de « je m'inscris » à « mon compte existe », avec la copie des documents ; puis `documents-du-chauffeur.md` pour leur vie après l'inscription. Le user a d'abord jugé qu'une seule spec « documents » mélangeait trop de choses, la copie faisant partie de l'inscription |
| Spec de l'existant écrite maintenant (décision du user, 2026-11-07) | Exception à `docs/a-faire.md`, qui gardait les specs de l'existant pour la toute fin : l'inscription chauffeur est écrite maintenant, parce que la copie s'y ajoute |
| Quand copier | À la création du chauffeur (`UserCreated`), comme le véhicule : le chauffeur et ses documents naissent ensemble, dans la transaction du compte |
| Qui copie | Le gestionnaire du module chauffeur qui crée déjà le chauffeur et son véhicule (`CreateDriverWhenUserIsCreated`). Il lit les documents de l'inscription par une requête du module inscription, comme `FindRegistrationVehicleQuery` ; couplage permis par `CLAUDE.md`. Format du template `create-wallet-when-user-is-created` (décision du user, 2026-11-07) |
| Les fichiers | Pas copiés : la ligne de `documents` garde le chemin Firebase Storage de l'inscription. Copier les fichiers doublerait le stockage pour rien |
| Ce qui est copié | Les documents `VALIDATED` seulement, une ligne par type |
| Règles | Dans les entités de l'API, sans tests (règle `noBackendTests`) |

### Règles

| Cas | Résultat |
|---|---|
| Dernier document validé | Le chauffeur est créé avec son véhicule et ses 4 documents |
| La copie échoue | Rien n'est créé : ni compte, ni chauffeur, ni documents (même transaction) |
| Un document n'est pas `VALIDATED` | Il n'est pas copié ; aujourd'hui, le compte n'est créé que si les 4 le sont |
| Date d'expiration | Vide à la copie : l'inscription ne la demande pas. Qui la saisit, et pour quels documents, est l'objet de `documents-du-chauffeur.md` |
| Inscription supprimée ensuite | Les documents du chauffeur restent |

### API

Aucune route nouvelle ni changée : la copie se fait dans la création du compte.

### Nouveaux éléments

**API** :

- une requête du module inscription qui renvoie les documents validés d'une inscription (type, chemins du recto et du verso), en une seule lecture (règle `noNPlusOne`) ;
- les documents dans l'entité chauffeur à sa création, à côté du véhicule ;
- le dépôt chauffeur les écrit avec le chauffeur, dans la même écriture que le véhicule.

**Mobile** : rien.

### Tables touchées

- `documents` : écrite pour la première fois. Schéma inchangé ; `expiresAt` reste vide jusqu'à `documents-du-chauffeur.md`.

### Hors périmètre

- La date d'expiration, l'alerte, le renouvellement, le blocage, l'écran « Vos documents » : spec `documents-du-chauffeur.md`.
- Refuser un document, et la correction par le chauffeur (`DOCUMENTS_CORRECTION`, jamais utilisée) : `documentReviewUnfinished` dans la mémoire de l'API.
- Le rôle admin sur la route de validation (n'importe quel jeton Firebase y passe).
- L'inscription du passager.

### Ajout prévu par `documents-du-chauffeur.md`

Décidé par le user le 2026-11-07 (point 2 de `documents-du-chauffeur.md`) : à l'écran « Mes documents » de l'inscription, le chauffeur saisit aussi la date d'expiration des types qui expirent ; l'admin la vérifie sur la photo et peut la corriger en validant ; elle est recopiée dans les documents du chauffeur avec eux. Codé avec `documents-du-chauffeur.md`, dans son plan.

Décidé aussi par le user le 2026-11-07 (point 6 de `documents-du-chauffeur.md`) : un type de document ajouté est demandé aux inscriptions en cours ; une inscription qui attend la validation sans lui revient à l'étape `DOCUMENTS`, reçoit « Un nouveau document est demandé », et l'app rouvre « Mes documents » avec ce message.

## À valider

1. **Les chauffeurs déjà validés. Validé par le user, 2026-11-07, tel que proposé.** Les chauffeurs 3 et 4 (et les plus anciens) ont un compte sans documents dans `documents`. Ce sont des comptes de test, l'app n'est pas encore sortie. Proposé : rien pour eux, comme pour le véhicule (point 5 de `vehicule-du-chauffeur.md`) ; un nouveau chauffeur de test aura ses documents. Écarté : une migration de données qui les recopie, du SQL écrit à la main dans `migration.sql` (contraire à `prismaOnlySchema`) pour des comptes qui n'existeront pas en production. J'avais d'abord proposé de les recopier, avant de voir qu'il n'y a que des comptes de test.
2. **L'inscription restée `COMPLETE` après un échec. Validé par le user, 2026-11-07, tel que proposé : noté dans `docs/a-faire.md`.** (`registrationCompleteWithoutUser` dans la mémoire de l'API). Si la création du compte échoue, le document reste `VALIDATED` et l'inscription `COMPLETE`, mais sans compte : le chauffeur est bloqué, réparé à la main le 2026-11-06. La copie ajoute une écriture de plus dans cette transaction, donc une occasion de plus d'échouer. Proposé : hors de cette spec, noté pour plus tard dans `docs/a-faire.md`. Écarté pour l'instant : la corriger ici, ce qui demande de revoir la validation du document et sa transaction.
3. **Le nom de la spec. Validé par le user, 2026-11-07, tel que proposé.** Proposé : `inscription-chauffeur.md`, et les specs `vehicule-du-chauffeur.md` et `validation-du-dossier.md` gardées à part, citées ici. Écarté : les fondre dans celle-ci, ce qui réécrirait deux specs déjà validées.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque.

### Étape 1 : la copie des documents (API)

- [x] Requête `FindRegistrationDocumentsQuery` (module inscription) : les documents `VALIDATED` d'une inscription, en une lecture. Lue par `PrismaService` hors de la transaction du compte, comme celle du véhicule : la validation du document n'ouvre pas de transaction, le dernier document est déjà écrit quand le compte est créé
- [x] `DriverEntity.create` reçoit les documents et leur donne un identifiant ; le dépôt chauffeur les écrit dans le même `create` que le chauffeur et le véhicule (`createMany` imbriqué)
- [x] `CreateDriverWhenUserIsCreated` lit les documents et les donne au chauffeur, au format du template
- [x] Vérifications : `npx tsc --noEmit` sans erreur ; `npm run lint` à ses 9 erreurs habituelles, aucune nouvelle ; le user lance `npm run deps:validate`

### Étape 2 : test (par le user)

- [x] Inscription d'un nouveau chauffeur ; l'admin valide ses 4 documents (2026-11-07, plaque AA-111-AA, n° 120 à Colmar)
- [x] En base : 4 lignes dans `documents` pour ce chauffeur, avec les chemins de `registration_documents` (verso vide pour la carte grise, date d'expiration vide), vérifié le 2026-11-07

### Fin de feature

- [x] Mettre à jour `.aimemory` des deux dépôts (`documentsTableEmpty` en partie corrigée), 2026-11-07
- [ ] Commiter quand le user le demande
