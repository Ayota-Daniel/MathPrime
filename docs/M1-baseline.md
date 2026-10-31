# MathPrime M1 — baseline avant modernisation

État vérifié le 31 octobre 2026 sur la branche `modernization`.

## Références Git

- Branche de travail : `modernization`.
- Tag `legacy-v1` : commit `df5f7498c16a0dead0276c20121e8493abc1fdb6` (`legacy v0.3`).
- L’arbre était propre avant la création du tag et de la branche.

## Portée des changements M1

M1 ajoute une suite de caractérisation du moteur, les scripts `test`, des règles `.gitignore` pour fichiers locaux et secrets potentiels, et ce document. Aucun fichier de gameplay, écran ou dépendance n’a été modifié. Aucun lockfile n’a changé.

Commande de tests : `npm test`.

## Résultats de référence

Environnement : Node `v26.8.2`, npm `11.19.1`, Java `27.0.1`. `apps/mobile/mise.toml` demande Java 17; l’environnement Java observé ne correspond donc pas à la configuration de développement documentée.

| Vérification | Résultat |
|---|---|
| Tests du moteur | 15 réussis, 0 échec; durée environ 0,9 s. Comprend la validation mathématique et l’égalité exacte avec les quatre tables régénérées par le solveur. |
| Typecheck moteur | Réussi (`tsc --noEmit`). |
| Typecheck web | Échec avant compilation : `TS2688`, type `vite/client` absent de l’environnement installé. |
| Build web | Échec à l’étape `tsc -b` pour la même dépendance `vite/client`; Vite n’a donc pas lancé le build. |
| Typecheck mobile | Échec sur trois références à `localStorage` dans `packages/engine/src/persistence.ts`, non inclus dans les libs TypeScript du projet mobile. |
| Export JS Android Expo/Metro | Réussi : 2 863 modules, bundle Hermes de 5,62 MB, export sous `/tmp/mathprime-mobile-export`. |
| Build Android natif | Non lancé : aucun Android SDK n’est configuré et Java 27 ne correspond pas au Java 17 documenté. Le wrapper Gradle 8.14.3 est présent en cache. |
| Build iOS | Non lancé : aucun dossier iOS natif ni Xcode dans cet environnement. |

Le premier lancement de `tsx --test` direct a échoué car il essaie d’ouvrir un socket temporaire interdit par le sandbox. Le script charge désormais les tests via le hook `--import tsx` et le module natif `node:test`, sans socket ni option Node récente; cette commande passe et expose les 15 cas individuels.

## Tests de caractérisation

Les tests vérifient la précédence, le minimum d’opérandes d’un petit espace exhaustif, les contraintes Big Challenge et génériques, la validation, le scoring, la progression, les tables JSON et leur reproductibilité.

Les cinq bugs demandés sont conservés comme attentes de comportement actuel, sans correction :

1. La combinaison Rogue `need_7` + `only_35` rend les règles insolubles.
2. Après une victoire Rogue, l’écran additionne le cumul de run au cumul de session une seconde fois.
3. Quand un joueur active le partage après avoir déjà un record local supérieur, le record existant n’est pas soumis.
4. Le puzzle Daily reste rejouable après validation le même jour.
5. `validateAnswer` ignore le suffixe invalide `abc` dans `3+5abc`.

Le cas Rogue teste aussi le fallback concret : faute de solution sous les règles actives, le store présente un puzzle de la table Classic, que les mêmes règles refusent ensuite.

## Tables de puzzles

Les quatre fichiers du moteur ont été vérifiés par les tests : 1 000 cibles uniques chacune, couverture 1–1 000, expressions évaluables et comptes d’opérandes corrects. Les expressions produites pour chaque cible correspondent exactement à une régénération de `buildTable` avec le générateur actuel. Les données web/mobile correspondent aux JSON moteur; les manifestes gardent cependant des dates différentes.

## Dépôt et secrets

Un scan par motifs connus des blobs texte présents dans l’arbre n’a trouvé aucune clé privée PEM, clé AWS, jeton GitHub, JWT ou affectation évidente de secret. Ce contrôle est heuristique : il ne certifie ni l’historique complet, ni les credentials distants, ni les secrets encodés sous un autre format. `gitleaks` et `trufflehog` ne sont pas installés ici.

Les fichiers `.env.example` suivis ne contiennent que des valeurs de démonstration. `apps/mobile/android/app/debug.keystore` est également suivi : `keytool` l’identifie comme une entrée de clé privée `androiddebugkey`, le keystore Android de développement conventionnel. Ce n’est pas une clé de production. Le build Android `release` référence pourtant `signingConfigs.debug` dans `apps/mobile/android/app/build.gradle`; la séparation de signature production est un bloqueur release à corriger dans une étape ultérieure, hors M1.

Le `.gitignore` ignore maintenant les fichiers `.env` locaux (en gardant les templates `*.env.example`), keystores/certificats/clés et fichiers de credentials usuels. Les règles empêchent l’ajout futur de ces fichiers; elles ne retirent pas les fichiers déjà suivis.

## Plan dépendances Expo — à réaliser après M1

Au 31 octobre 2026, Expo SDK 58 est la version stable la plus récente publiée (15 octobre) et cible React Native 0.88. SDK 57 est sorti en juin et Expo indique que SDK 54 ne recevra des correctifs critiques que jusqu’au SDK suivant. Voir les notes officielles [SDK 58](https://expo.dev/changelog/sdk-58) et [SDK 57](https://expo.dev/changelog/sdk-57).

Plan proposé, sans migration réalisée dans M1 :

1. Garder `android/` comme projet natif suivi et établir un build natif de référence dès qu’un SDK Android est disponible. Aucun `expo prebuild --clean` ni suppression/régénération du dossier Android ne doit être inclus par défaut.
2. Faire les mises à niveau une version SDK à la fois : 54 → 55 → 56 → 57 → 58. À chaque étape, examiner le changelog et l’outil Expo Native Project Upgrade Helper, aligner les versions Expo gérées, puis vérifier les peer dependencies des modules natifs.
3. Pour chaque saut, aligner React/React Native, `expo-audio`, `expo-status-bar`, Reanimated/Worklets, React Native Screens, Safe Area Context, SVG, NativeWind et la configuration Metro/Babel selon les versions recommandées pour le SDK cible.
4. Appliquer manuellement les changements Android requis au projet natif existant (Gradle, plugins, Kotlin, SDK cible, manifeste et autolinking). Préserver les identifiants, permissions, ressources et comportements natifs personnalisés; revoir les changements en diff avant de les accepter.
5. Lancer Expo Doctor, typechecks, export Metro et build Android natif après chaque saut. Refaire une build de développement pour les modules natifs; Expo recommande les development builds pour contrôler le binaire et ses dépendances natives.
6. SDK 58 implique aussi de confirmer les exigences iOS 27/Xcode 27 si iOS fait partie de la release. Le dépôt n’a actuellement pas de projet iOS natif : décider explicitement si iOS est à générer et maintenir avant d’engager ce travail.
7. Séparer la clé de signature release du keystore debug avant toute livraison, puis valider la chaîne de distribution et les secrets CI.

Expo recommande de contrôler les changements SDK par SDK et précise, pour les projets sans Continuous Native Generation, d’appliquer les modifications du projet natif avec l’upgrade helper plutôt que de supprimer les fichiers natifs. Référence : [guide officiel de mise à niveau Expo](https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/).

## Proposition précise pour M2

M2 peut se limiter à l’intégrité du moteur et des scores, sans migration Expo ni refonte d’écrans :

1. Faire passer les tests `BUG CARACTÉRISÉ` en tests de comportement attendu après correction.
2. Rejeter toute expression dont l’analyse ne consomme pas la chaîne complète.
3. Supprimer le fallback Rogue vers une table construite sous d’autres règles; générer uniquement des puzzles prouvés résolubles sous les règles actives, ou terminer explicitement le draft si aucune solution bornée n’existe.
4. Définir une source unique du score Rogue affiché et testé; maintenir le total stocké séparé du total temporaire de session.
5. Décider si le record local doit être soumis lors de l’activation du consentement, et empêcher le farm Daily le même jour selon la règle produit retenue.
6. Préserver les tables JSON; ne modifier leur provenance/versionnement que dans une étape séparée.
7. Faire M2 seulement après accord sur le comportement souhaité pour le Daily et le traitement de l’opt-in après un record existant.

Critère de sortie proposé : tous les tests de caractérisation passent avec les assertions de bugs inversées, moteur typé, tables identiques ou migration de données explicitement versionnée, et aucune modification de dépendance.
