# MathPrime — R1 : prototype Rogue V1

État corrigé et validé en R1.1 le 7 novembre 2026. Base : `modernization`, commit `448c62a`, récupérée par HTTPS après échec de l'authentification SSH. Branche : `feat/rogue-v1-prototype`.

## 1. Architecture livrée

Le prototype est isolé dans `packages/engine/src/rogue-v1/`. Aucun import depuis le barrel de production, aucune modification des écrans, stores existants, modes Classic/Big Challenge/Free Skill/Daily ou services Supabase. Aucune dépendance ajoutée, aucun déploiement.

| Module | Responsabilité |
| --- | --- |
| `model.ts` | Types, configuration de run, phases, PRNG LCG sérialisable |
| `math.ts` | Validation stricte, compatibilité logique, recherche exhaustive bornée |
| `cards.ts` | Douze définitions déclaratives, coûts, durées, composition, score, variantes de boss |
| `generator.ts` | Pools de cibles, filtrage des budgets, témoins, diagnostics et cache de session |
| `rewards.ts` | Prévalidation des builds futurs, drafts, améliorations et remplacement |
| `run.ts` | Machine à états et horloge simulée, vies, indices, progression et victoire |
| `simulator.ts` | Trois politiques synthétiques et rapports déterministes |
| `scripts/simulate-rogue-v1.ts` | CLI et mesures de performance locales |

API expérimentale par import direct de `packages/engine/src/rogue-v1/index.ts` : `newRun(seed, config)`, `transition(run, action, generator)`, `simulate(options)`. Le `Generator` est une instance de session réutilisable ; il ne contient ni horloge réelle ni stockage persistant. Les transitions ne modifient pas l'état précédent. L'état et son journal sont sérialisables en JSON.

Exemple depuis la racine :

```sh
node --import tsx --input-type=module -e '
import { newRun, transition, Generator } from "./packages/engine/src/rogue-v1/index.ts";
const generator = new Generator();
let run = transition(newRun(42), { type: "start" }, generator);
console.log(run.current);
run = transition(run, { type: "advance", seconds: 12 }, generator);
run = transition(run, { type: "submit", expression: run.current.expression }, generator);
console.log(run.status, run.score, run.lives);
'
```

États : `ready`, `playing`, `reward`, `victory`, `ended`, `blocked`. Actions : `start`, `advance`, `submit`, `hint`, `choose`, `finish`, `continue`. Une action incompatible est refusée. Seul `advance` dans `playing` fait passer le temps ; les attentes de préparation, choix et victoire sont sans chronomètre.

## 2. Cartes, cumul et expiration

Les valeurs sont centralisées dans `DEFAULT_CONFIG`, `CARDS`, `BALANCE`, `MAJOR_UPGRADES` et `POLICY_PARAMETERS`. Les bonus de score sont additionnés en points de pourcentage entiers, puis bornés entre 0,5 et 2,5. Les secondes sont additionnées avant les facteurs de temps ; les limites de 25 à 120 s sont appliquées en dernier. L'ordre des cartes ne change pas le résultat.

| ID | Avantage | Contrepartie | Expiration / condition |
| --- | --- | --- | --- |
| D1 | +20 % score | Au moins un 7 | Fin de run ; obligation déjà présente refusée |
| D2 | +25 % score | Maximum 1/1/2/2/3 multiplications aux difficultés 1–5 | Fin de run ; filtre de pertinence et d'inflation |
| D3 | +35 % si optimal | −20 % sinon | Fin de run |
| D4 | +8 s au puzzle suivant si optimal | −8 s sinon | Fin de run ; limites temporelles conservées |
| T1 | +30 % score | −15 % temps | 3 tentatives |
| T2 | +15 s | −25 % score | 2 tentatives |
| T3 | +25 % score | Soustraction obligatoire | 3 tentatives ; obligation déjà présente refusée |
| T4 | Première perte de vie protégée | −15 % score | 3 tentatives, utilisée ou non |
| T5 | +1 indice immédiatement | −10 s | 2 tentatives ; réserve non pleine |
| E1 | +40 % score | −1 vie immédiatement | 3 réussites ; au moins 2 vies avant achat |
| E2 | +1 vie immédiatement | −20 % score | 3 tentatives ; vies non pleines |
| E3 | +12 s | −1 indice immédiatement | 3 tentatives ; au moins 1 indice |

Une tentative est une épreuve ordinaire ou une phase de boss, réussie ou échouée. Le dernier puzzle d'un effet bénéficie encore de son effet ; l'expiration suit le calcul du résultat. E1 expire uniquement sur les réussites. L'assurance reste active avec son malus après consommation de la protection. Elle protège une erreur ou un timeout, jamais un coût volontaire comme E1. Les coûts immédiats sont intentionnellement appliqués au choix de la carte, dans cet ordre temporel explicite.

Une instance par carte, six effets actifs maximum, trois acquisitions/améliorations au plus par identifiant dans une run. Une seule amélioration par durable : D1 exige deux 7 pour +30 % ; D2 réduit son budget de 1 pour +35 % ; D3 passe à +45 % / −30 % ; D4 passe à +12 / −12 s. Ces niveaux possèdent donc tous une contrepartie accrue.

## 3. Récompenses et progression

Départ : 3 vies, maximum 3, et 3 indices pour la run. Trois actes de trois puzzles ordinaires, suivis de boss de 2, 2 et 3 phases : victoire après exactement 16 réussites. La progression dépend exclusivement de ces réussites.

Choix tactique après le deuxième puzzle ordinaire de chaque acte ; choix majeur après les boss I et II. Les paramètres permettent aussi un acte d'un seul puzzle ordinaire. Les tactiques excluent les cartes durables ; les majeurs peuvent ajouter un durable, améliorer un durable présent, ou remplacer un durable si la réserve d'effets est pleine. Le remplacement prototype porte sur le premier durable de la liste active ; le joueur ne choisit pas encore librement lequel remplacer.

Les coûts, ressources, doublons et limites sont vérifiés. Chaque proposition passe une prévalidation de toutes les phases restantes et des quatre premières étapes de survie, avec expiration des effets temporaires et jusqu'à trois échecs supplémentaires possibles. Les variantes mathématiques sont explorées pour trouver une variante admissible par phase. La prévalidation concerne le build proposé, pas les futures cartes encore inconnues. Les cartes ultérieures repassent les mêmes vérifications.

Le draft propose jusqu'à trois offres distinctes et expose les motifs de refus. Un draft de zéro, une ou deux offres est valide. `choose` avec `offer: null` permet toujours de passer. Les améliorations absentes, ressources pleines et coûts impossibles sont refusés.

Une erreur terminale ou un timeout retire une vie, sauf protection. La phase reste la même, avec une cible différente à la prochaine tentative. Les phases réussies et boss vaincus restent acquis. Les bonus de temps différés sont consommés au démarrage du puzzle suivant, même si cette tentative échoue ; ils ne sont pas répétés sur ses retries.

Après le boss III : état `victory` et victoire officielle acquise, puis choix explicite de finir ou continuer. La survie utilise la difficulté 5, retire progressivement 2 s par étape à partir de la deuxième, et ajoute une obligation mathématique dès la quatrième. Le plancher de temps reste appliqué. Après cette quatrième étape, les contraintes mathématiques se stabilisent ; la pression temporelle augmente jusqu'au plancher. Une défaite ultérieure conserve `officialVictory` et les trois boss vaincus. `bestScore` et `maxProgress` restent deux mesures séparées. Aucune persistance de records de profil n'est introduite dans ce prototype.

## 4. Boss réellement implémentés

| Boss | Phases et variantes |
| --- | --- |
| I — Gardien du rythme | 2 phases ; ajoute une occurrence obligatoire d'un chiffre autorisé, variantes ordonnées selon la phase. Une réponse optimale en phase 1 donne +8 s à la prochaine tentative de phase 2. |
| II — Maître des opérations | 2 phases ; variantes soustraction, budget de multiplications, ou occurrence supplémentaire. Une obligation déjà présente n'est pas répétée à l'identique. L'ordre de préférence tourne avec la phase. |
| III — Architecte des nombres | Phase 1 : build actuel. Phase 2 : au moins 2 étoiles. Phase 3 : variante mathématique supplémentaire, au moins 2 étoiles et facteur temporel 0,85. |

Les variantes d'occurrences ajoutent une occurrence par rapport aux règles du build, même si ce chiffre était déjà requis. Les variantes soustraction et multiplication ne sont proposées que si elles constituent une nouvelle obligation. Une variante indisponible est diagnostiquée, puis une autre variante prévue est testée. Les contraintes du build ne sont jamais supprimées. Si toutes les variantes échouent, la run devient `blocked` avec motif explicite, sans puzzle de remplacement ni perte de vie.

Les variantes sont déterminées par le build et l'index de phase, sans tirage supplémentaire. La variété des boss reste modeste ; ce prototype valide la compatibilité et les transitions, pas leur qualité ludique définitive.

## 5. Génération, solvabilité et optimalité

Inspection préalable des solveurs existants : `solver.ts` et `solve-one.ts` suivent un total de termes et un terme multiplicatif, plus un masque de chiffres requis. Ils ne distinguent pas les occurrences, la soustraction obligatoire ni les budgets de multiplications. Le prototype réutilise uniquement l'évaluateur arithmétique, après validation syntaxique stricte, et possède sa propre recherche.

Recherche en largeur, sans parenthèses, respectant les priorités : état `(total, terme courant, occurrences saturées, soustraction utilisée, nombre de multiplications)`. Les contraintes interviennent pendant l'expansion. Un état identique atteint plus tard est dominé par son chemin plus court. Le nombre de multiplications demeure dans la clé même pour la comparaison sans budget : cela permet de connaître le maximum de multiplications parmi les solutions optimales.

Bornes initiales : chiffres réutilisables `[3,5,7]`, opérations `+,-,*`, six opérandes maximum, valeur absolue de chaque total de termes et terme courant ≤ 500, cibles entières positives ≤ 150, budget de 350 000 états par recherche. Ces limites sont configurables.

Une recherche terminée fournit le minimum d'opérandes dans cet espace. Il ne s'agit pas d'une preuve d'optimalité hors des bornes intermédiaires choisies. Une recherche tronquée par le budget d'états est explicitement refusée pour la génération, même si elle a trouvé des témoins partiels. Les réponses soumises peuvent être plus longues que six opérandes, mais doivent respecter les mêmes bornes intermédiaires ; elles ne peuvent donc battre un minimum déjà trouvé dans les six premiers niveaux.

Pour chaque budget multiplicatif, comparaison avec les mêmes règles dont seul ce budget est retiré :

- Au moins une solution optimale sans budget doit être exclue par le budget. Le minimum peut rester identique si d'autres solutions optimales subsistent ; cela restreint néanmoins les meilleures expressions disponibles.
- Le minimum contraint ne doit pas dépasser le minimum de comparaison de plus de deux opérandes.
- Le pool doit contenir au moins deux cibles admissibles. La cible précédente est exclue au tirage.

Le témoin, son minimum, les règles exactes, la variante, le nombre de candidats et les diagnostics accompagnent chaque puzzle. La difficulté de phase impose aussi une longueur minimale de cible, sans prétendre résumer la difficulté humaine. Le coût heuristique vaut `5 × opérandes + 4 × obligations` ; un avertissement est émis au-dessus du temps disponible. Cette heuristique n'est pas calibrée par des joueurs.

Les tests comparent le solveur à une énumération indépendante des expressions sur de petites grilles : occurrences, soustraction et budgets combinés. Un cas `49` avec chiffres `[2,7]`, multiplication interdite et huit opérandes maximum montre explicitement une inflation de 2 à 7 opérandes et son rejet.

## 6. Score et économie

`arrondi(100 × difficulté × qualité × coefficient_cartes × max(0, 1 − 0,15 × indices_utilisés))`.

Qualités : 3 étoiles = 1 ; 2 étoiles = 0,67 ; 1 étoile = 0,40. Trois étoiles au minimum contraint ; deux étoiles avec un opérande supplémentaire ; une étoile au-delà. Aucun plafond d'étoiles lié aux indices. Aucun bonus général de vitesse. Bonus de boss : 150, 250 et 500, accordés une seule fois et distincts du score des phases.

Un indice donne le témoin complet dans le prototype. Cela permet de tester les transitions et la pénalité, mais ne représente pas encore une mécanique d'aide destinée au joueur.

## 7. Validation réellement exécutée

- `npm test` : **76 tests réussis**, dont 20 groupes R1 et 2 groupes de régression R1.1 ; environ 4,3 s dans cette exécution.
- `npm run typecheck -w @shortest/engine` : réussi, incluant la vérification Supabase déjà présente.
- `npm run typecheck -w @shortest/web` : réussi.
- `npm run typecheck -w @shortest/mobile` : réussi.
- `npm run build -w @shortest/web` : réussi, Vite 7.3.7, 1 789 modules.
- `git diff --check` : réussi.

Les nouveaux tests passent par le script `npm test` existant et donc sa CI. Ils couvrent les douze cartes, ressources, durées, derniers puzzles d'effet, ordre de composition, coûts impossibles, solvabilité bornée, optimalité et inflation, limites de recherche, temps, assurance, indices, récompenses et améliorations, score sans saut de phase, boss/retries, dernière vie en dernière phase, victoire, survie et reproductibilité.

Aucun test d'interface, aucune compilation Android native, aucun benchmark Android, aucune mesure de joueur humain n'a été effectué. La CI distante ne peut pas être déclarée passée depuis les seuls contrôles locaux.

## 8. Simulations déterministes et comparaison

Résultats bruts descriptifs et paramètres : `docs/R1-rogue-v1-simulations.json`. Trois lots de 30 runs, graines 42 à 71, six réussites de survie maximum après la victoire. Les simulations connaissent les témoins. Les erreurs, timeouts, usages d'indices et réponses non optimales sont artificiellement paramétrés : **ces nombres ne mesurent aucun taux de victoire humain**.

| Politique | Victoires officielles / 30 | Score moyen, survie incluse | Meilleur score | Progression moyenne | Boss I / II / III vaincus | Refus de génération |
| --- | ---: | ---: | ---: | ---: | --- | ---: |
| Prudent | 28 | 6 202,77 | 7 997 | 20,90 | 29 / 28 / 28 | 0 |
| Équilibré | 24 | 6 229,70 | 9 197 | 18,57 | 28 / 28 / 24 | 0 |
| Téméraire | 5 | 2 140,43 | 7 606 | 9,10 | 23 / 11 / 5 | 0 |

Les trois politiques atteignent une progression maximale de 22. Limite de survie atteinte respectivement 28, 12 et 1 fois. Une victoire officielle reste acquise lorsque la survie finit en défaite.

Hypothèses de politiques : prudent privilégie soins/assurance/indices, équilibré perfection/contraintes/survie, téméraire pacte/budget/précipitation. À une vie, tous priorisent soin/assurance. Probabilités artificielles d'erreur : 8 %, 14 %, 23 % ; réponses correctes non optimales : 30 %, 15 %, 40 % quand une prolongation valide existe et que le boss n'exige pas deux étoiles. Les erreurs sont partagées entre timeouts et réponses invalides. L'aide est utilisée avec des probabilités 30 %, 15 %, 5 %. Les réponses synthétiques non optimales ajoutent deux opérandes neutres, et donnent donc une étoile. Le simulateur n'échantillonne pas encore de réponses à deux étoiles.

La graine reproduit exactement une même politique avec ses paramètres. Les choix consomment du hasard : deux politiques de même graine ne rencontrent pas nécessairement les mêmes cibles ou erreurs. Il ne s'agit donc pas d'une comparaison causale contrôlée entre cartes.

## 9. Observations d'équilibrage et limites

- Assurance est choisie 52 fois par le prudent, 50 par l'équilibré et 9 par le téméraire. Sa protection semble structurante dans ces politiques ; les renouvellements après expiration comptent comme de nouvelles acquisitions. Son avantage réel doit être testé à taux d'erreur humain comparable.
- Pacte de sang est choisi 21 fois par le téméraire. Son sacrifice, associé au taux d'erreur artificiellement élevé, accompagne une forte mortalité. On ne peut pas attribuer cet écart à la carte seule.
- Perfectionniste et Équilibre fragile exercent bien leurs pénalités avec des réponses non optimales. Un agent qui soumet toujours le témoin leur donnerait artificiellement un avantage sans coût.
- Budget de multiplications est choisi 10 fois par le téméraire. Le filtre initial « minimum strictement plus long » bloquait une continuation ; il a été remplacé par le critère « au moins une solution optimale exclue ». Les 90 simulations finales ne bloquent plus.
- Les filtres de budget éliminent de nombreuses cibles à bonus gratuit. Les pools peuvent devenir étroits avec les améliorations et les occurrences de boss ; les drafts refusent alors le build avec diagnostic.
- Un avertissement de coût/temps chez le téméraire, zéro dans les deux autres lots. Analyse détaillée dans la section R1.1 ci-dessous.
- Le tirage uniforme de trois offres, leur cadence et les politiques de préférence biaisent la fréquence d'achat. Aucune estimation de puissance intrinsèque par carte ou interaction n'est établie.
- Le score moyen inclut la survie et ne doit pas être comparé comme un score de victoire à durée identique. `bestScore` et progression sont rapportés séparément.
- L'ordre des effets continus est testé. Les échanges immédiats ont naturellement un ordre temporel : sacrifier une vie puis soigner peut changer l'éligibilité du choix suivant.

Les scénarios testés fonctionnent ; il n'existe pas de preuve exhaustive pour tous les sous-ensembles de douze cartes, tous les niveaux, toutes les configurations et toutes les graines. Un pool introuvable reste un état explicite `blocked`, jamais une relaxation silencieuse. Les configurations arbitraires incompatibles ne sont pas promises jouables. La prévalidation finie couvre les deux régimes mathématiques actuels de survie, mais ne serait pas suffisante après ajout de nouvelles contraintes sans mise à jour correspondante.

## 10. Performance mesurée

Environnement : Linux x64, Node v26.13.0, lots locaux séquentiels avec cache de session inclus. D’autres vérifications locales étaient actives pendant la mesure ; ces durées ne constituent pas un benchmark contrôlé. Les chiffres ne décrivent pas Android.

| Politique | Puzzles générés | Durée totale du lot | Moyenne génération | p95 génération | Maximum génération |
| --- | ---: | ---: | ---: | ---: | ---: |
| Prudent | 675 | 1 045,28 ms | 0,059 ms | 0,039 ms | 16,19 ms |
| Équilibré | 654 | 1 592,30 ms | 0,121 ms | 0,073 ms | 31,71 ms |
| Téméraire | 354 | 1 189,98 ms | 0,180 ms | 0,072 ms | 36,71 ms |

La moyenne peut dépasser le p95 en présence de quelques recherches à froid. Ces mesures entourent `generate`, pas chaque prévalidation de draft ; la durée totale inclut également ces prévalidations. Les rapports contiennent le nombre de recherches, états et accès cache. Le cache est limité à 128 entrées et réinitialisable. Augmenter chiffres, opérandes ou occurrences peut fortement accroître le nombre d'états ; le budget de recherche prévient un travail illimité et produit un refus diagnostiqué.

## 11. Reproduction

```sh
npm test
npm run typecheck -w @shortest/engine
npm run typecheck -w @shortest/web
npm run typecheck -w @shortest/mobile
npm run build -w @shortest/web

npm run simulate:rogue-v1 -w @shortest/engine -- --seed 42 --runs 30 --policy prudent --survival 6
npm run simulate:rogue-v1 -w @shortest/engine -- --seed 42 --runs 30 --policy equilibre --survival 6
npm run simulate:rogue-v1 -w @shortest/engine -- --seed 42 --runs 30 --policy temeraire --survival 6

# JSON seul et journal détaillé des puzzles, réponses, choix et événements :
node --import tsx packages/engine/scripts/simulate-rogue-v1.ts --seed 42 --runs 1 --policy equilibre --survival 6 --log > /tmp/rogue-v1-run.json
```

Défaut : cinq runs, graine 42, politique équilibrée, aucune continuation. Limites CLI : 1 à 1 000 runs, 0 à 100 réussites de survie demandées ; une garde limite aussi le nombre de transitions. Les mesures temporelles varient ; les états, événements et statistiques de gameplay restent déterministes.

## 12. Prochain milestone

1. Faire jouer le prototype avec une saisie textuelle interactive ou un harness de playtest, en conservant l'isolation du moteur.
2. Calibrer le temps et les heuristiques sur des joueurs ; mesurer séparément réussite, longueur et effort perçu.
3. Comparer les politiques avec un calendrier d'erreurs contrôlé commun, et des ablations carte par carte. Ajouter des réponses à deux étoiles et analyser le score avant continuation.
4. Élargir la validation combinatoire des builds et variantes, mesurer les pools étroits et la mémoire à froid sur l'appareil cible.
5. Ajuster les valeurs encore expérimentales : assurance, sacrifice, pénalités d'indices, cadence, améliorations, score et pression de survie.
6. Définir des variantes de boss plus variées et un remplacement d'effet librement choisi avant d'engager l'intégration visuelle.

Aucune intégration visuelle Rogue n'est commencée dans R1.


## 13. Corrections et diagnostic R1.1 — PR #8

La configuration réelle de MathPrime est désormais exactement `[3,5,7]`. Les grilles `[2,3]` et `[2,7]` restent des fixtures indépendantes de tests de solveur. Les réponses non optimales des tests de run utilisent maintenant `+3-3`, et les assertions de variante de boss suivent le chiffre 3. Les bornes de recherche sont strictement inchangées : six opérandes, magnitude 500, cible maximale 150, 350 000 états. Aucune relaxation ou extension pour masquer un échec.

Régressions : chacune des douze cartes de niveau 1, prise séparément, est prévalidée sur les phases futures ; 22 phases par carte sont ensuite générées et tous leurs témoins n'utilisent que 3, 5 et 7. Les trois boss, une victoire complète et six phases de survie réussies sont testés. Ces sondes maintiennent volontairement les effets temporaires actifs pour vérifier leurs contraintes ; les tests de transitions vérifient séparément leur expiration réelle. Ce n'est pas une couverture exhaustive de tous les builds.

### Résultats recalculés et disponibilité des cibles

Les trois lots de 30 runs utilisent toujours les graines 42 à 71 et six réussites de survie demandées. Le JSON de référence a été remplacé par les résultats corrigés et comprend maintenant des diagnostics d'obligations, de taille des pools et les puzzles signalés par l'heuristique. Les victoires officielles restent 28 / 24 / 5 ; les scores moyens et progressions de la section 8 restent identiques. Ce résultat découle des politiques synthétiques, de leurs erreurs contrôlées et du même nombre de transitions, et ne prouve aucune équivalence des puzzles ni de difficulté humaine.

Aucun refus de génération dans ces 90 runs. Les pools des puzzles effectivement tirés ont respectivement un minimum de 4 / 4 / 2 candidats et une moyenne de 86,45 / 93,41 / 106,23 candidats.

`docs/R1.1-rogue-v1-pools.json` compare 352 sondes : build vide, chacune des douze cartes et trois combinaisons D1/D2/T3, sur les stages 0 à 21. Les deux configurations conservent les mêmes bornes mais produisent des contraintes de variantes et des cibles différentes. Aucun pool corrigé n'est sous le seuil de deux candidats ; **124 sondes perdent au moins 50 % des candidats**. Cas critique : D2 seul aux stages 16–18 passe de 20 à 2 candidats ; D1+D2 passe de 21 à 3. Une répétition peut donc devenir prévisible. Aucun filtre supplémentaire D1/T3 n'est introduit ; élargissement des pools et diversité restent un sujet R2, à traiter explicitement.

Reproduction exacte des sondes :

```sh
node --import tsx packages/engine/scripts/diagnose-rogue-v1-pools.ts > /tmp/rogue-v1-pools.json
```

### Valeur réelle de D1 et T3

Chaque puzzle généré avec D1/T3 actif porte `obligationDiagnostics`. Pour la même cible et les mêmes autres contraintes, deux recherches complètes sont comparées : une sans l'obligation, une qui la viole (7 interdit pour D1 de base, soustraction interdite pour T3). Si une expression violant l'obligation possède le minimum de la recherche de référence, l'obligation est **restrictive** : elle exclut au moins une solution optimale, même si d'autres solutions optimales subsistent. Sinon toutes les solutions optimales la respectent déjà : le bonus est **suspect**. Le résultat ne dépend donc pas du seul témoin choisi par le solveur. Les recherches diagnostiques utilisent exactement les bornes actuelles et ne changent ni les cibles ni le tirage aléatoire.

| Politique | D1 restrictif / suspect / non mesuré | T3 restrictif / suspect / non mesuré |
| --- | --- | --- |
| Prudent | 28 / 25 / 0 | 11 / 1 / 0 |
| Équilibré | 55 / 40 / 22 | 25 / 7 / 0 |
| Téméraire | 17 / 8 / 4 | 15 / 6 / 0 |

Total sur les apparitions de puzzles, retries compris : D1 a 100 cas restrictifs, 73 suspects et 26 non mesurés ; T3 a 51 cas restrictifs et 14 suspects. Ce sont des fréquences dans ces parcours, pas un recensement de toutes les cibles distinctes ni une mesure causale de puissance. D1/T3 peuvent donc donner un bonus sans exclure de solution optimale dans une proportion notable des cas observés. Aucun bonus n'est corrigé en R1.1 : un filtrage systématique pourrait aggraver les pools étroits.

Limite explicite R2 : lorsque la règle exige plusieurs 7 (amélioration D1 ou occurrence de boss), la comparaison simple « aucun 7 » ne suffit pas à tester tous les violateurs ; le diagnostic retourne `unmeasured`, jamais une conclusion approximative. Une comparaison tronquée ou indisponible renvoie également `unmeasured`. Une analyse exacte des seuils d'occurrences et une politique d'offres tenant compte de la fréquence d'obligations réellement restrictives restent à concevoir.

### Avertissement temporel inspecté

Un seul cas dans les lots corrigés (contre trois dans les anciens lots erronés) : téméraire, graine 42, stage 2 (troisième puzzle), cible 92, témoin `3+3*5*5+7+7`, T1 actif. L'expression vaut bien 92 et utilise six opérandes. La recherche complète fournit un minimum borné de six ; le coût heuristique est 30, tandis que le chronomètre est 29,75 s après Précipitation.

- Solvabilité mathématique : **oui**, témoin valide sous les règles exactes.
- Minimum dans les bornes : **connu**, recherche terminée sans troncature.
- Jouabilité selon l'heuristique : **signalée comme coûteuse**, dépassement de 0,25 ; cela ne démontre pas une impossibilité humaine ni une difficulté humaine précise.

Le puzzle reste généré, l'avertissement reste dans les événements et le rapport JSON. Aucun changement des temps ou de l'heuristique dans ce correctif. Les agents synthétiques soumettent un témoin connu ; leur réussite ne valide pas cette heuristique.

### Périmètre et prochain playtest

Aucun écran, maquette, autre mode, Daily ou composant Supabase n'est modifié. L'indice révélant le témoin complet reste un **placeholder** : les prochains playtests doivent le signaler et ne pas en déduire l'efficacité d'une aide progressive ni l'économie d'indices définitive. Aucun test humain ou Android n'a été ajouté. La CI verte signalée pour la PR précédente ne constitue pas une validation distante de ce commit de correction.
