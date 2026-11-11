# À faire plus tard

Idées notées avec le user, pas encore spécifiées. Chacune commence par une spec dans `docs/specs/` avant tout code.

## Une vraie carte de la demande pour le chauffeur

Noté le 2026-11-05, décision du user : après le lancement. Le chauffeur verrait sur sa carte les zones où les passagers commandent le plus, comme dans les applis du marché, pour savoir où attendre. Il faut assez de vraies commandes pour que la carte dise vrai : avec quelques tests par jour, elle serait vide ou fausse. Le texte et les ronds simulés (« Zone Centre, 3 taxis libres… Demande forte : gare ») ont été retirés le même jour.

## Écrire les specs de ce qui existe déjà

Noté le 2026-11-05, décision du user : à faire à la toute fin, après le déploiement de l'app. Ces features ont été codées avant la mémoire IA et n'ont pas de spec dans `docs/specs/` : estimation du prix, commande immédiate et recherche du chauffeur, déroulé de la course (approche, arrivée, code de montée, absence, encaissement), annulation et désistement, présence du chauffeur, inscription et documents. Chacune au format habituel, déduite du code (qui fait foi) et de `ltm/`, en documents seulement ; les incohérences trouvées vont dans « À valider ». Exception décidée par le user le 2026-11-07 : l'inscription du chauffeur est écrite maintenant (`docs/specs/inscription-chauffeur.md`), parce que la copie des documents s'y ajoute.

## Les adresses gardées en base viennent de Mapbox

Noté le 2026-11-05, en écrivant `docs/specs/point-de-prise-en-charge.md`. La doc de Mapbox Search Box réserve ses résultats à un « temporary use » ; or `destinationName`, choisi dans ses suggestions, est gardé dans `rides`.

Élargi le 2026-11-11 : la Géoplateforme, en panne toute la journée, a été retirée à la demande du user. Viennent désormais aussi de Mapbox le nom du départ (`rides.originName`) et l'adresse de « Maison » et « Travail » (`passenger_saved_places.address`). À régler avant la mise en service : un contrat avec Mapbox pour garder ces données, ou revenir à une source sous licence ouverte avec un secours quand elle ne répond pas.

## Le passager se déplace pendant que le chauffeur vient le chercher

Noté le 2026-11-05. Aujourd'hui, le point de prise en charge reste celui de la commande ; le chauffeur et le passager peuvent s'appeler ou s'écrire, et le chauffeur signale l'absence après l'attente.

1. **Déplacer le point de prise en charge.** Le passager le change depuis l'écran de suivi, dans un rayon limité (quelques centaines de mètres, à fixer) ; au-delà, il annule et recommande. Le chauffeur est prévenu, et son guidage repart vers le nouveau point. Le plus utile des deux.
2. **Voir le passager en direct.** S'il accepte de partager sa position, le chauffeur le voit sur sa carte en approchant, pour le repérer dans une foule ou devant une gare. Une aide à la vue : le guidage vise toujours le point de prise en charge.

## Les vrais documents du chauffeur

Noté le 2026-11-07, décision du user : faire la feature, pas seulement retirer l'écran. L'écran « Vos documents » de l'app chauffeur montre des données inventées (GH-482-KZ, Corolla Touring, ADS n° 118, taximètre « à renouveler »). La copie des documents validés dans `documents` est faite par `docs/specs/inscription-chauffeur.md` ; reste ici, dans une spec `documents-du-chauffeur.md` : leur date d'expiration, l'alerte, le renouvellement, le blocage, et cet écran lu depuis l'API.

Précisé par le user le 2026-11-07, à reprendre dans la spec :
- But de l'écran : un contrôle de conformité piloté par `document_types`. Un type ajouté par l'admin (nouvelle obligation légale) est demandé à tous les chauffeurs sans mettre l'app à jour ; un document expiré aussi ; avec un délai pour s'y conformer, pour ne pas couper un chauffeur qui travaille.
- Jamais pendant une course : les documents ne sont contrôlés qu'entre deux courses (ouverture de l'app sans course en cours, passage en ligne, et par l'API avant une nouvelle proposition) ; les actions d'une course ne les regardent jamais. L'app ouvre déjà la course en cours avant tout contrôle (`driver_flow_bloc.dart`).
- Réservations à l'avance (validé par le user, 2026-11-07) : une réservation dont la prise en charge tombe après l'expiration d'un document n'est pas proposée au chauffeur, qui est prévenu (« 3 réservations après le 12 mars ne vous sont pas proposées : votre carte professionnelle expire le 11 mars ») ; elles reviennent une fois le nouveau document validé, pas pendant sa vérification. Filet : une réservation déjà acceptée alors qu'il n'est plus en règle à l'heure de prise en charge lui est retirée et part à un autre chauffeur, comme s'il n'était pas en ligne à temps (`BookingStarter`), avec un avertissement avant.
- Quand ouvrir l'écran : tranché le 2026-11-07, voir la spec.

Spec écrite le 2026-11-07 : `docs/specs/documents-du-chauffeur.md`.

## Le chauffeur bloqué quand la création de son compte échoue

Noté le 2026-11-07, décision du user (point 2 de `docs/specs/inscription-chauffeur.md`). Si la création du compte échoue après la validation du dernier document, ce document reste `VALIDATED` et l'inscription `COMPLETE`, sans compte ; `complete()` ne relance rien, le chauffeur reste sur l'écran d'attente. Arrivé le 2026-11-06, réparé à la main. Mémoire de l'API : `registrationCompleteWithoutUser`. Arrivé à nouveau le 2026-11-07 avec le chauffeur C5, à cause d'un numéro de taxi déjà pris : ce cas-là est refusé dès la saisie (point 7 de `docs/specs/vehicule-du-chauffeur.md`).

## Un numéro de taxi gardé par une inscription abandonnée

Noté le 2026-11-07, décision du user (point 7 de `docs/specs/vehicule-du-chauffeur.md`, choix 2). Une plaque ou un numéro de taxi saisi par une inscription en cours est refusé aux autres. Une inscription abandonnée, fausse ou avec une faute de frappe bloque donc le vrai propriétaire, qui ne peut plus s'inscrire. Pour la v1, l'admin supprime l'inscription fautive à la main. Plus tard : libérer le numéro d'une inscription abandonnée, ou laisser l'admin trancher entre les deux.

## Les documents à ajouter après la mécanique des documents

Noté le 2026-11-07, décision du user (point 1 de `docs/specs/documents-du-chauffeur.md`). Une fois la mécanique faite avec les 4 types d'aujourd'hui, ajouter comme des lignes de `document_types`, chacun avec sa règle officielle lue et citée d'abord :

- l'autorisation de stationnement (ADS) ;
- l'assurance du véhicule ;
- le contrôle technique : « obligatoire la 1re année de votre activité, puis 1 fois par an », sans rappel de l'État (service-public, F21907) ;
- la vérification du taximètre : périodicité à trouver dans les textes ;
- l'avis médical d'un médecin agréé : périodicité à trouver.

## Faire vérifier par un juriste l'heure de fin de validité d'un document

Noté le 2026-11-07, demandé par le user. L'app considère qu'un document qui « expire le 11 mars » est valable jusqu'au 11 mars à 24 h, heure de Paris (`docs/specs/documents-du-chauffeur.md`, ligne « Fin de validité »), par analogie avec l'article 642 du Code de procédure civile, qui vise les délais de procédure. Aucun texte trouvé sur la validité d'une carte professionnelle ou d'un permis le jour de sa date. À confirmer auprès d'un juriste ou de la préfecture avant la mise en service.
