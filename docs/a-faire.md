# À faire plus tard

Idées notées avec le user, pas encore spécifiées. Chacune commence par une spec dans `docs/specs/` avant tout code.

## Le nom de la destination gardé en base vient de Mapbox

Noté le 2026-11-05, en écrivant `docs/specs/point-de-prise-en-charge.md`. La doc de Mapbox Search Box réserve ses résultats à un « temporary use » ; or `destinationName`, choisi dans ses suggestions, est gardé dans `rides`. À régler : le nommer avec la Géoplateforme, comme le départ, ou voir avec Mapbox.

## Le passager se déplace pendant que le chauffeur vient le chercher

Noté le 2026-11-05. Aujourd'hui, le point de prise en charge reste celui de la commande ; le chauffeur et le passager peuvent s'appeler ou s'écrire, et le chauffeur signale l'absence après l'attente.

1. **Déplacer le point de prise en charge.** Le passager le change depuis l'écran de suivi, dans un rayon limité (quelques centaines de mètres, à fixer) ; au-delà, il annule et recommande. Le chauffeur est prévenu, et son guidage repart vers le nouveau point. Le plus utile des deux.
2. **Voir le passager en direct.** S'il accepte de partager sa position, le chauffeur le voit sur sa carte en approchant, pour le repérer dans une foule ou devant une gare. Une aide à la vue : le guidage vise toujours le point de prise en charge.
