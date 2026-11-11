# Gains et chiffres du chauffeur : les vraies données

> Statut : feature close le 2026-11-11 par le user (« ça fonctionne »), testée sur Android, non commitée. `npm run deps:validate` pas encore lancé ; API arrêtée non testée.

Concerne `taxi-vroom-api` et `taxi-vroom-mobile`. Cette spec vit dans l'API. Elle suit `gains-du-chauffeur.md`, qui a construit l'onglet « Gains » avec des données simulées.

## Spec

### Besoin

Demandé par le user le 2026-11-11 :

- l'onglet « Gains » affiche les vrais gains du chauffeur, venus de l'API, pour « Aujourd'hui », « Cette semaine » et « Ce mois » ;
- sur l'onglet « Conduire », la pastille « Aujourd'hui … € » et les trois cases sous « Passer en ligne » (courses de la semaine, note moyenne, acceptation), simulées elles aussi, deviennent vraies ;
- pendant que l'API répond, un indicateur de chargement est toujours visible.

### Ce que voit le chauffeur

**Onglet « Gains »**

1. Il ouvre l'onglet : le titre et le bouton de période restent en haut, un rond tourne dessous le temps que l'API réponde (en général moins d'une seconde).
2. Les chiffres s'affichent :
   - le total en euros de ses courses terminées sur la période ;
   - « N courses, encaissé à bord (carte ou espèces) », sans les heures ;
   - le graphique de la semaine ou du mois, comme aujourd'hui ; la ligne revient à « Touchez une barre pour voir le montant du jour. ».
3. Il choisit une autre période : le bouton prend son nom, le rond tourne de nouveau, puis les chiffres de cette période.
4. Il quitte l'onglet puis y revient : la même période, le rond, puis les chiffres à jour (une course a pu se terminer entre-temps).
5. Sans réseau ou si l'API échoue : le message d'erreur et « Réessayer » ; « Réessayer » montre le rond, puis les chiffres.
6. Sans aucune course sur la période : « 0,00 € », « 0 courses… », un graphique vide avec un axe à 20 €.

**Onglet « Conduire »**

1. À l'ouverture de l'app, la carte et « Passer en ligne » s'affichent comme aujourd'hui. Dans la pastille du haut et dans les trois cases, un petit rond tourne à la place des chiffres le temps que l'API réponde.
2. Puis :
   - la pastille : « Aujourd'hui 54,30 € », ce qu'il a gagné aujourd'hui, le même montant que « Aujourd'hui » dans « Gains » ;
   - « 16 / courses, semaine » : ses courses terminées depuis lundi ;
   - « 4,8 / note moyenne » : la moyenne de toutes les notes des passagers, la même que celle que voient les passagers ; « – » tant qu'il n'a aucune note ;
   - « 92 % / acceptation » : la part des 100 dernières demandes de course qu'il a acceptées ; « – » tant qu'il a reçu moins de 10 demandes.
3. Les chiffres se mettent à jour, avec les mêmes petits ronds, quand il revient sur l'onglet « Conduire » et à la fin de chaque course.
4. Sans réseau ou si l'API échoue : « – » à la place des chiffres, dans la pastille et les cases ; il peut quand même passer en ligne et conduire. Nouvel essai au prochain retour sur l'onglet ou à la fin de la prochaine course.

### Comment ça marche

```text
Onglet « Gains », chauffeur choisit « Ce mois »
  ↓
App (rond) → GET /v1/drivers/me/earnings?period=MONTH
  ↓
API : jours du mois en heure de Paris (du 1er au dernier)
  ↓
Postgres : une requête, les courses terminées par ce chauffeur
           dans ce mois (ride_completions + suppléments)
  ↓
API : compteur + suppléments, jour par jour (jour de Paris de la fin
      de course), nombre de courses
  ↓
App ← { days: [{ day, amountCents }…], rideCount } → total, courses, graphique
```

```text
Onglet « Conduire » (ouverture, retour sur l'onglet, fin de course)
  ↓
App (petits ronds) → GET /v1/drivers/me/activity
  ↓
API : quatre lectures par le QueryBus
  - gains d'aujourd'hui et de la semaine (la requête de « Gains »)
    → pastille, courses de la semaine
  - moyenne des notes (ride_ratings)
  - 100 dernières demandes reçues (ride_offers) → part acceptée
  ↓
App ← { todayEarningsCents, weekRideCount, averageRating, acceptanceRatePercent }
  ↓
Pastille et trois cases
```

### Décisions prises

| Sujet | Décision |
|---|---|
| Indicateur de chargement (validé par le user, 2026-11-11) | Un rond à chaque appel à l'API : dans « Gains », à l'arrivée sur l'onglet, au changement de période et à « Réessayer », sous le titre et le bouton de période ; dans « Conduire », un petit rond dans la pastille et dans chaque case. Remplace la règle de `gains-du-chauffeur.md` qui gardait les chiffres affichés pendant le rechargement, comme l'onglet « Compte » (`compte-a-jour.md`) |
| Heures (validé par le user, 2026-11-11) | Plus d'heures : « N courses, encaissé à bord (carte ou espèces) ». L'API ne sait pas quand un chauffeur passe hors ligne (l'app l'écrit dans Firebase). Écartés : les vraies heures en ligne (l'API écouterait Firebase, une table de plus, faussées par un redémarrage du serveur : trop de travail pour ce chiffre, « on va pas se casser la tête pour ça ») ; « N h en course » (le temps avec un client, autre chose que ce que la maquette montrait) |
| Pastille et trois cases (validé par le user, 2026-11-11) | Branchées dans cette feature, à la demande du user |
| Barre touchée après un rechargement | Effacée : les chiffres ont pu changer |
| Gain d'une course | Le compteur plus les suppléments, le même total que le reçu du passager (`notation-et-historique.md`) |
| Courses comptées | Les courses terminées (`COMPLETED`) par ce chauffeur, immédiates ou réservées. Une course annulée, un client absent ou une course reprise par un autre chauffeur ne compte pas : aucun frais n'existe pour eux |
| Jour d'une course | Le jour, en heure de Paris, de la fin de course : une course finie à 0 h 20 compte pour le jour qui commence |
| Périodes | Calculées par l'API en heure de Paris : « Aujourd'hui » ; la semaine du lundi au dimanche ; le mois du 1er au dernier jour. Les jours à venir sont à 0 €. L'app n'envoie que le nom de la période, jamais de dates : l'heure du téléphone peut être fausse |
| Note moyenne | La moyenne de toutes ses notes, la règle déjà montrée aux passagers (`notation-et-historique.md`) ; arrondie à une décimale par l'app (`formatRating`) |
| Taux d'acceptation | Comme le marché : la part des 100 dernières demandes reçues qu'il a acceptées ; une demande laissée sans réponse (15 s) compte comme refusée ; moins de 100 demandes, toutes comptent ; non calculé sous 10 demandes. Seules les demandes envoyées avec 15 s pour répondre comptent : prendre une réservation dans la liste, ou « Je pars », n'en est pas une (la demande de « Je pars » est enregistrée acceptée à l'instant même où elle est créée, c'est ainsi qu'elle est écartée) ; une réservation remise en recherche à son échéance envoie, elle, de vraies demandes, qui comptent. Une demande arrêtée parce que le passager a annulé avant la réponse ne compte pas : le chauffeur n'y est pour rien. Une demande acceptée puis rendue (désistement) compte comme acceptée |
| Échec des chiffres de « Conduire » | Ne bloque jamais la conduite : « – » à la place des chiffres. Aujourd'hui, un échec du chargement de ces chiffres simulés afficherait l'erreur de tout l'écran |
| Routes | `GET /v1/drivers/me/earnings?period=TODAY|WEEK|MONTH` et `GET /v1/drivers/me/activity`, chauffeur seulement (`@Roles`), à côté de `drivers/me/account` |
| Où vivent les lectures | Des requêtes CQRS du module `ride`, qui possède les tables des courses, des notes et des demandes : elles lisent Postgres par `PrismaService`, sans entité ni dépôt (CLAUDE.md). `activity` assemble par le QueryBus les gains d'aujourd'hui, ceux de la semaine, la note et l'acceptation, comme `drivers/me/account` |
| Lecture de l'acceptation | En SQL (`$queryRaw`) : écarter une demande arrêtée par l'annulation du passager compare deux colonnes (`expiredAt` de la demande, `cancelledAt` de la course, le même instant), ce que Prisma ne sait pas écrire, et le tri doit se faire avant la limite de 100 |
| Une requête par lecture | Les fins de course de la période en une requête avec leurs suppléments, l'addition par jour en mémoire ; la moyenne des notes en un `aggregate` ; les 100 dernières demandes en une requête. Jamais une requête par jour ou par demande |
| Heure de Paris | Les fonctions de `src/libs/utils/paris-day.ts`, étendues au début d'un jour de Paris ; calculs de dates avec date-fns |
| Côté app, « Gains » | Une vraie source (Dio) remplace `EarningsRemoteDataSourceFake`, supprimée ; `EarningsModel` lit déjà la réponse, sans les heures |
| Côté app, « Conduire » | Une vraie source (Dio) remplace `DriverActivityRemoteDataSourceFake`, supprimée. « En ligne » sort de `DriverActivity` : c'est l'état du téléphone, l'API ne le connaît pas ; `SetOnlineUseCase` ne l'écrit plus dans la source des chiffres. Les chiffres se chargent à part de l'accueil, qui ne les attend plus : un `DriverActivityBloc` à eux (chargement, chiffres, échec) et `LoadDriverActivityUseCase`, plutôt que trois champs de plus dans `DriverHomeReady`, que chaque changement en ligne / hors ligne reconstruit et aurait pu perdre. La pastille réutilise `MapPill`, à qui s'ajoute un petit rond (`isLoading`) |

### Règles

| Cas | Résultat |
|---|---|
| « Gains » : arrivée, changement de période, « Réessayer » | Rond, puis les chiffres de la période |
| « Gains » : deux périodes choisies très vite | Seule la dernière s'affiche |
| « Gains » : pas de réseau, API en échec | Message d'erreur et « Réessayer » |
| « Gains » : période sans course | 0,00 €, 0 courses, graphique vide, axe à 20 € |
| « Conduire » : ouverture, retour sur l'onglet, fin de course | Petits ronds, puis les chiffres |
| « Conduire » : pas de réseau, API en échec | « – » ; passer en ligne reste possible |
| Aucune note | « – » sous « note moyenne » |
| Moins de 10 demandes reçues | « – » sous « acceptation » |
| `period` absent ou inconnu | 400, refusé par la validation de l'API |

### API

**`GET /v1/drivers/me/earnings?period=WEEK`** (chauffeur), nouvelle :

```json
{
  "days": [
    { "day": "2026-11-09", "amountCents": 7470 },
    { "day": "2026-11-10", "amountCents": 9510 },
    { "day": "2026-11-11", "amountCents": 5430 },
    { "day": "2026-11-12", "amountCents": 0 }
  ],
  "rideCount": 16
}
```

`days` contient chaque jour de la période, dans l'ordre (1 pour `TODAY`, 7 pour `WEEK`, 28 à 31 pour `MONTH`), au format `AAAA-MM-JJ` de Paris.

**`GET /v1/drivers/me/activity`** (chauffeur), nouvelle :

```json
{
  "todayEarningsCents": 5430,
  "weekRideCount": 16,
  "averageRating": 4.8,
  "acceptanceRatePercent": 92
}
```

`averageRating` est `null` sans aucune note ; `acceptanceRatePercent` est `null` sous 10 demandes reçues.

### Nouveaux éléments

**API** :

- `paris-day.ts` : le début d'un jour de Paris ;
- `GetMyEarningsQuery`, `GetMyRatingQuery` et `GetMyAcceptanceRateQuery` dans le module `ride` ;
- les contrôleurs `GET drivers/me/earnings` et `GET drivers/me/activity`.

**Mobile** :

- `EarningsRemoteDataSourceImpl` et `DriverActivityRemoteDataSourceImpl` (Dio), branchées dans `app.dart` ; les deux sources simulées supprimées ;
- `EarningsBloc` : le rond à chaque chargement, la barre touchée effacée ; les heures retirées de `Earnings`, `EarningsModel` et du texte ;
- `DriverActivity` sans « en ligne », note et acceptation possibles à vide ; l'accueil charge ses chiffres à part, avec les petits ronds, et les recharge au retour sur « Conduire » et à la fin de chaque course ;
- la pastille et les trois cases : petit rond, chiffre ou « – ».

### Tables touchées

Aucune : lecture seule.

### Hors périmètre

- Le relevé PDF.
- Les périodes passées (hier, la semaine dernière…).
- La liste des courses.
- Les heures en ligne.
- « Lumineux éteint » sous « Hors ligne ».

## À valider

1. **« N h en ligne ». Validé par le user, 2026-11-11 :** plus d'heures du tout, voir « Heures ».
2. **La pastille « Aujourd'hui … € » et les trois cases. Validé par le user, 2026-11-11 :** branchées dans cette feature.

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Pour cette feature, le user a demandé de coder toutes les étapes d'un coup (go du 2026-11-11) : étapes 1 à 3 enchaînées, pause avant son test.

### Étape 1 : les routes (API)

- [x] `paris-day.ts` : `startOfParisDay`, `parisDayOf`
- [x] `GetMyEarningsQuery` et `GET drivers/me/earnings`, `period` validé (`IsEnum`)
- [x] `GetMyRatingQuery`, `GetMyAcceptanceRateQuery` et `GET drivers/me/activity` ; la règle d'acceptation essayée en SQL sur la base de dev
- [x] Vérifications : `npx tsc --noEmit` sans erreur, `npm run lint` à ses 9 erreurs habituelles
- [ ] `npm run deps:validate` lancé par le user

### Étape 2 : l'onglet « Gains » (mobile)

- [x] `EarningsRemoteDataSourceImpl`, branchée dans `app.dart` ; la source simulée supprimée
- [x] `EarningsBloc` : rond à chaque chargement, barre touchée effacée
- [x] Heures retirées (`Earnings`, `EarningsModel`, texte sous le total)

### Étape 3 : la pastille et les trois cases (mobile)

- [x] `DriverActivityRemoteDataSourceImpl`, branchée dans `app.dart` ; la source simulée supprimée
- [x] « En ligne » sorti de `DriverActivity` vers `DriverHome` ; `SetOnlineUseCase` et `LoadDriverHomeUseCase` sans la source des chiffres ; `DriverActivityBloc` chargé à l'ouverture, au retour sur « Conduire » et au retour d'une course
- [x] Pastille (`MapPill` avec `isLoading`) et cases : petit rond, chiffre ou « – »
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni nouvelle alerte (seulement `one_member_abstracts`, comme les autres dépôts à une méthode), 133 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 4 : test (par le user)

- [x] Une course terminée (c7, 36,79 €) : la pastille « Aujourd'hui 36,79 € » et « 1 courses, semaine », vérifiés en base (user, 2026-11-11)
- [x] Un chauffeur sans course : 0,00 €, « 0 courses », « – » partout, graphique vide à 20 € (user, 2026-11-11)
- [x] Note moyenne : « – » au retour de la course, « 3,0 » au retour suivant sur « Conduire ». Normal : le passager a noté 7 s après la fin de course, après le rechargement ; validé par le user. Une mise à jour à la note du passager serait une feature à part
- [ ] Acceptation au-delà de 10 demandes : non testée (c7 n'en a reçu qu'une)
- [ ] API arrêtée : « Réessayer » dans « Gains », « – » dans « Conduire » : non testé

### Fin de feature

- [x] Mettre à jour `.aimemory` des deux dépôts
- [ ] Commiter quand le user le demande
