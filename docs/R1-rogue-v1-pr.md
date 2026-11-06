# feat: prototype expérimental Rogue V1 et simulateur déterministe

Base : `modernization` ; branche : `feat/rogue-v1-prototype`.

Ajoute un moteur expérimental isolé pour des runs de trois actes et seize réussites, douze cartes avec coûts et expiration, trois boss à variantes compatibles, récompenses, score, horloge simulée et continuation après victoire officielle. Le solveur borné valide les contraintes pendant la recherche et fournit un témoin et un minimum contraint ; les budgets insignifiants ou trop coûteux sont rejetés. Aucun écran ni mode de production n'est modifié.

Ajoute trois politiques de simulation reproductibles, des journaux détaillés et un rapport d'équilibrage. Les 90 runs synthétiques de référence ne produisent aucun refus de génération ; leurs résultats ne représentent pas des taux de réussite humains. L'optimalité reste bornée et l'équilibrage expérimental.

Validation locale : 74 tests passent via `npm test`, typechecks moteur/web/mobile réussis et build web réussi. Voir `docs/R1-rogue-v1-prototype.md` pour les commandes, paramètres, résultats et limites ; données descriptives dans `docs/R1-rogue-v1-simulations.json`.

Ne pas merger automatiquement. Aucun déploiement ni intégration visuelle dans ce milestone.
