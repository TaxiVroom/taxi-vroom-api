# Onglet « Gains » du chauffeur : choix de la période

> Statut : feature close le 2026-11-11, testée par le user sur Android, non commitée. Données toujours simulées : les vraies données sont la spec `gains-reels.md`.

Concerne `taxi-vroom-mobile` seulement. L'API n'est pas touchée. Cette spec vit dans l'API.

## Spec

### Besoin

Demandé par le user le 2026-11-11. L'onglet « Gains » du chauffeur ne montre que la semaine en cours, avec des données simulées. Le bouton « Cette semaine » ne fait rien. Le chauffeur doit pouvoir choisir :

- « Aujourd'hui » ;
- « Cette semaine » ;
- « Ce mois ».

Les données restent simulées : les vrais gains viendront plus tard, avec une route de l'API.

### Ce que voit le chauffeur

1. Il ouvre l'onglet « Gains » : la période affichée est « Cette semaine ». L'écran est le même qu'aujourd'hui, sans la ligne « Relevé de la semaine ».
2. Il appuie sur « Cette semaine » : un menu s'ouvre sous le bouton, avec « Aujourd'hui », « Cette semaine » et « Ce mois ».
3. Il choisit une période. Le menu se ferme, le bouton prend le nom de la période, puis un rond tourne le temps de charger les chiffres.
4. Il voit, pour cette période :
   - le total en euros ;
   - « N courses, N h en ligne, encaissé à bord (carte ou espèces) » ;
   - pour « Cette semaine » seulement, le graphique avec une barre par jour, du lundi au dimanche, aujourd'hui en noir ;
   - pour « Ce mois », le graphique avec une barre par jour, du 1er au dernier jour du mois, aujourd'hui en noir ; la date sous la barre tous les 7 jours (1, 8, 15, 22, 29).
5. Sur les graphiques de la semaine et du mois :
   - à gauche, un axe en euros avec trois repères (0 €, la moitié, le haut), arrondis ;
   - au-dessus du graphique : « Touchez une barre pour voir le montant du jour. » ;
   - il touche une barre : la ligne devient le jour et son montant, par exemple « Mardi 10 nov. : 95,10 € », et la barre est mise en avant ;
   - il retouche la même barre : la ligne revient au texte d'aide ; changer de période l'efface aussi.
6. S'il quitte l'onglet puis y revient, il retrouve la période qu'il avait choisie.

### Comment ça marche

```text
Chauffeur choisit « Ce mois »
  ↓
EarningsBloc → cas d'usage → EarningsRepository
  ↓
EarningsRemoteDataSourceFake : chiffres inventés pour la période
  ↓
EarningsBloc → l'onglet affiche le total, les courses, les heures (+ graphique)
```

Aucun appel réseau : la source simulée reste branchée dans `app.dart`. Plus tard, une vraie source appellera l'API, avec la période en paramètre.

### Décisions prises

| Sujet | Décision |
|---|---|
| Périodes (validé par le user, 2026-11-11) | « Aujourd'hui », « Cette semaine », « Ce mois ». Choix fait après une étude du marché : un acteur propose jour et semaine, un autre jour, semaine et mois. Écartés : revenir aux semaines ou aux jours passés |
| Données (validé par le user, 2026-11-11) | Toujours simulées : seul l'écran change |
| Mêmes informations (validé par le user, 2026-11-11) | Le total, le nombre de courses, les heures en ligne et « encaissé à bord (carte ou espèces) », comme la maquette actuelle. Pas de liste des courses |
| Relevé PDF (validé par le user, 2026-11-11) | La ligne « Relevé de la semaine » est retirée : le relevé n'est pas géré |
| Copier le marché (validé par le user, 2026-11-11) | L'écran fait comme le marché quand une source le montre. Sinon, le user décide |
| « Aujourd'hui » sans graphique | Les sources du marché ne montrent, pour la journée, que le total, le temps en ligne et les courses. Une seule barre ne dirait rien |
| « Cette semaine » | Inchangée : une barre par jour, du lundi au dimanche, comme le marché |
| « Ce mois » (validé par le user, 2026-11-11) | Une barre par jour, du 1er au dernier jour du mois, aujourd'hui en noir : même logique que la semaine, on voit les jours de repos et les gros jours. Aucune source du marché ne montre de graphique mensuel. Écartés : une barre par semaine (le mois coupe des semaines : en novembre 2026, la première et la dernière n'ont qu'un jour, vu par le user sur la maquette) ; sans graphique (perd les jours de repos et les gros jours) |
| Montants sur le graphique (validé par le user, 2026-11-11) | Les deux : un axe vertical en euros, pour l'ordre de grandeur, et toucher une barre pour le montant exact du jour, comme le fait le marché (toucher un jour du graphique montre ses gains). Sur la semaine et le mois, le même graphique. Écarté : rien |
| Période par défaut | « Cette semaine », comme aujourd'hui |
| Période gardée | Le bloc garde la période choisie : revenir sur l'onglet recharge cette période |
| Le menu | `showDropdown` + `DropdownMenu` de `shadcn_flutter` 0.0.51, ouvert par le bouton actuel, comme l'exemple officiel ([dropdown_menu_example_1.dart, v0.0.51](https://github.com/sunarya-thito/shadcn_flutter/blob/v0.0.51/docs/lib/pages/docs/components/dropdown_menu/dropdown_menu_example_1.dart)) ; les trois périodes en `MenuRadioGroup`/`MenuRadio`, la période affichée marquée d'un point |
| Haut de l'axe | Le plus petit pas de 10, 20, 25, 50, 100, 200, 250 ou 500 € dont le double couvre le meilleur jour ; repères 0, le pas, le double. Au-delà de 1 000 €, un pas multiple de 500 €. Une période sans gain : axe à 20 € |
| Date de la barre touchée | `formatLongDate`, déjà utilisé ailleurs : « Mardi 10 nov. » |

### Règles

| Cas | Résultat |
|---|---|
| Ouverture de l'onglet | La dernière période choisie, « Cette semaine » au départ |
| Choix d'une période | Rond, puis les chiffres de cette période |
| Échec du chargement | Le message actuel avec « Réessayer », qui recharge la même période |
| Choix de la période déjà affichée | Rien ne change |
| Retour sur l'onglet | Les chiffres restent affichés pendant le rechargement, la barre touchée reste choisie |
| Deux périodes choisies très vite | Seule la dernière s'affiche |

### API

Aucun changement.

### Nouveaux éléments

**Mobile** :

- la période (aujourd'hui, semaine, mois) dans le domaine ;
- la source simulée, le dépôt et le cas d'usage prennent la période ;
- un événement du bloc pour le choix de la période ; l'état garde la période ;
- dans `EarningsTab` : le menu, le graphique selon la période, la ligne du relevé retirée.

### Tables touchées

Aucune.

### Hors périmètre

- Les vraies données et la route de l'API.
- Le relevé PDF.
- Les périodes passées (hier, la semaine dernière…).
- La liste des courses.

## À valider

1. **Le graphique de « Ce mois ». Validé par le user, 2026-11-11 :** une barre par jour, voir « Décisions prises ».

## Plan

Une étape à la fois, avec une pause et ta validation entre chaque. Pour cette feature, le user a demandé de coder toutes les étapes d'un coup (go du 2026-11-11) : pause avant son test.

### Étape 1 : les périodes (mobile)

- [x] Doc officielle de `shadcn_flutter` 0.0.51 relue : l'exemple officiel `dropdown_menu_example_1.dart` (tag v0.0.51) et la doc de `showDropdown`, `DropdownMenu`, `MenuRadioGroup` et `MenuRadio` dans le paquet installé
- [x] Test d'abord, en TDD : `Earnings` (total, haut de l'axe, hauteur des barres), 6 tests, rouges puis verts ; `formatWholeEuro` (« 50 € », pour les repères de l'axe : aucun formateur ne donnait des euros ronds), 2 tests, rouges puis verts
- [x] Période dans le domaine (`WeeklyEarnings` devient `Earnings`, `EarningsPeriod`), la source simulée (un jour de repos le jeudi), le dépôt et `LoadEarningsUseCase`, branché dans `app.dart`, `AuthNavigator` et `DriverHomePage`
- [x] `EarningsBloc` : `EarningsPeriodChosen`, `EarningsDayTapped`, la période dans chaque état, seule la dernière période choisie s'affiche
- [x] `EarningsTab` : menu, axe en euros et ses repères, ligne de la barre touchée (`formatLongDate`), graphique selon la période, ligne du relevé retirée
- [x] Vérifications : `dart format` sur les fichiers touchés, `flutter analyze` sans erreur ni nouvelle alerte, 133 tests verts, lint Bloc à ses 6 alertes habituelles

### Étape 2 : test (par le user)

- [x] Les trois périodes, le retour sur l'onglet (user, 2026-11-11 : « ça marche bien ») ; « Réessayer » non testable, la source simulée n'échoue jamais
- [x] Corrigé pendant le test : le repère du haut de l'axe et sa ligne étaient coupés (vu par le user), 10 px de marge au-dessus du graphique

### Fin de feature

- [x] Mettre à jour `.aimemory`
- [ ] Commiter quand le user le demande
