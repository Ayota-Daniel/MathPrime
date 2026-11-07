# feat: prototype expérimental Rogue V1 et simulateur déterministe

Base : `modernization` ; branche : `feat/rogue-v1-prototype`.

Ajoute un moteur expérimental isolé pour des runs de trois actes et seize réussites, douze cartes avec coûts et expiration, trois boss à variantes compatibles, récompenses, score, horloge simulée et continuation après victoire officielle. Le solveur borné valide les contraintes pendant la recherche et fournit un témoin et un minimum contraint ; les budgets insignifiants ou trop coûteux sont rejetés. Aucun écran ni mode de production n'est modifié.

Ajoute trois politiques de simulation reproductibles, des journaux détaillés et un rapport d'équilibrage. Les 90 runs synthétiques de référence ne produisent aucun refus de génération ; leurs résultats ne représentent pas des taux de réussite humains. L'optimalité reste bornée et l'équilibrage expérimental.

Validation locale : 76 tests passent via `npm test`, typechecks moteur/web/mobile réussis et build web réussi. Voir `docs/R1-rogue-v1-prototype.md` pour les commandes, paramètres, résultats et limites ; données descriptives dans `docs/R1-rogue-v1-simulations.json`.

Ne pas merger automatiquement. Aucun déploiement ni intégration visuelle dans ce milestone.


R1.1 : corrige les chiffres par défaut vers `[3,5,7]`, ajoute les régressions cartes/boss/victoire/survie et des diagnostics non filtrants de pertinence D1/T3. Les 90 simulations recalculées ne bloquent pas ; 124 des 352 sondes de pools perdent au moins la moitié des candidats. Un avertissement temporel demeure (coût 30, temps 29,75 s), avec témoin et minimum borné connus. Les seuils de plusieurs occurrences de 7 restent explicitement non mesurés. Aucun élargissement des limites de recherche.
