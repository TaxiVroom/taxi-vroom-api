# À faire plus tard

Idées notées avec le user, pas encore spécifiées. Chacune commence par une spec dans `docs/specs/` avant tout code.

## Une vraie carte de la demande pour le chauffeur

Noté le 2026-11-05, décision du user : après le lancement. Le chauffeur verrait sur sa carte les zones où les passagers commandent le plus, comme dans les applis du marché, pour savoir où attendre. Il faut assez de vraies commandes pour que la carte dise vrai : avec quelques tests par jour, elle serait vide ou fausse. Le texte et les ronds simulés (« Zone Centre, 3 taxis libres… Demande forte : gare ») ont été retirés le même jour.

## Écrire les specs de ce qui existe déjà

Noté le 2026-11-05, décision du user : à faire à la toute fin, après le déploiement de l'app. Ces features ont été codées avant la mémoire IA et n'ont pas de spec dans `docs/specs/` : estimation du prix, commande immédiate et recherche du chauffeur, déroulé de la course (approche, arrivée, code de montée, absence, encaissement), annulation et désistement, présence du chauffeur, inscription et documents. Chacune au format habituel, déduite du code (qui fait foi) et de `ltm/`, en documents seulement ; les incohérences trouvées vont dans « À valider ». Exception décidée par le user le 2026-11-07 : l'inscription du chauffeur est écrite maintenant (`docs/specs/inscription-chauffeur.md`), parce que la copie des documents s'y ajoute.

## Le nom de la destination gardé en base vient de Mapbox

Noté le 2026-11-05, en écrivant `docs/specs/point-de-prise-en-charge.md`. La doc de Mapbox Search Box réserve ses résultats à un « temporary use » ; or `destinationName`, choisi dans ses suggestions, est gardé dans `rides`. À régler : le nommer avec la Géoplateforme, comme le départ, ou voir avec Mapbox.

## Le passager se déplace pendant que le chauffeur vient le chercher

Noté le 2026-11-05. Aujourd'hui, le point de prise en charge reste celui de la commande ; le chauffeur et le passager peuvent s'appeler ou s'écrire, et le chauffeur signale l'absence après l'attente.

1. **Déplacer le point de prise en charge.** Le passager le change depuis l'écran de suivi, dans un rayon limité (quelques centaines de mètres, à fixer) ; au-delà, il annule et recommande. Le chauffeur est prévenu, et son guidage repart vers le nouveau point. Le plus utile des deux.
2. **Voir le passager en direct.** S'il accepte de partager sa position, le chauffeur le voit sur sa carte en approchant, pour le repérer dans une foule ou devant une gare. Une aide à la vue : le guidage vise toujours le point de prise en charge.

## Les vrais documents du chauffeur

Noté le 2026-11-07, décision du user : faire la feature, pas seulement retirer l'écran. L'écran « Vos documents » de l'app chauffeur montre des données inventées (GH-482-KZ, Corolla Touring, ADS n° 118, taximètre « à renouveler »). La copie des documents validés dans `documents` est faite par `docs/specs/inscription-chauffeur.md` ; reste ici, dans une spec `documents-du-chauffeur.md` : leur date d'expiration, l'alerte, le renouvellement, le blocage, et cet écran lu depuis l'API.

## Le chauffeur bloqué quand la création de son compte échoue

Noté le 2026-11-07, décision du user (point 2 de `docs/specs/inscription-chauffeur.md`). Si la création du compte échoue après la validation du dernier document, ce document reste `VALIDATED` et l'inscription `COMPLETE`, sans compte ; `complete()` ne relance rien, le chauffeur reste sur l'écran d'attente. Arrivé le 2026-11-06, réparé à la main. Mémoire de l'API : `registrationCompleteWithoutUser`. Arrivé à nouveau le 2026-11-07 avec le chauffeur C5, à cause d'un numéro de taxi déjà pris : ce cas-là est refusé dès la saisie (point 7 de `docs/specs/vehicule-du-chauffeur.md`).

## Un numéro de taxi gardé par une inscription abandonnée

Noté le 2026-11-07, décision du user (point 7 de `docs/specs/vehicule-du-chauffeur.md`, choix 2). Une plaque ou un numéro de taxi saisi par une inscription en cours est refusé aux autres. Une inscription abandonnée, fausse ou avec une faute de frappe bloque donc le vrai propriétaire, qui ne peut plus s'inscrire. Pour la v1, l'admin supprime l'inscription fautive à la main. Plus tard : libérer le numéro d'une inscription abandonnée, ou laisser l'admin trancher entre les deux.
