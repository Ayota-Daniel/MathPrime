# MathPrime — Registre des décisions

Mise à jour : 15 novembre 2026, intégration R4.3B. Ce registre complète les documents des anciens jalons sans les réécrire. Il distingue les décisions du projet, l’état implémenté et les propositions de production.

## Sources et priorité

1. Demande R4.3B et dernières précisions de l’utilisateur : référence courante pour ce jalon.
2. Bundles du 6 novembre retrouvés, PNG et notices vérifiés : preuves archivées, chemins et empreintes dans [R4.3A-assets.json](R4.3A-assets.json).
3. Code et parcours capturés sur la base fusionnée R4.2 : preuves de l’état implémenté, pas de validation artistique implicite.
4. Brief initial : contexte d’exploration, remplacé par les décisions suivantes quand elles divergent.

Le [rapport R4.3A](R4.3A-visual-audit.md) contient les sources exactes, écarts, limites et plan d’exécution ; le [carnet](R4.3A-capture-notes.md) contient les captures actuelles.

## Décisions à préserver

| ID | Décision et statut | Preuve / conséquence |
|---|---|---|
| DA-01 | **Confirmée** : direction ivoire, aubergine, bleu nuit, corail ; accents dorés ; hiérarchie forte et contrôles lisibles, motifs discrets. | Demande R4.3A + notices et PNG. Les anciens tokens violets/gris des autres consommateurs ne remplacent pas cette direction. |
| DA-02 | **Confirmée** : même identité sur les modes ; Rogue peut employer une surface nuit plus immersive. | Notices et images accueil/jeu ; Web Rogue retenu avec grands contrôles, pas les essais petits contrôles / ardoise. |
| DA-03 | **Identification exacte à confirmer depuis les références visuelles** ; aucun modèle de production retrouvé. | L’utilisateur exclut le panda et le panda roux et vise un autre animal des maquettes. L’absence de modèle ne signifie pas l’abandon de cette identité. Ne pas inventer d’espèce ni produire de nouvelle mascotte pour le moment. « Chibi » n’est pas un nom officiel. |
| DA-04 | **Choix techniques R4.3B implémentés** : export sémantique `rogue`, Nunito locale 400/700/800, surfaces nuit/bleu, chiffres ivoire, actions corail et accents or. | [Valeurs, provenance et contrastes](R4.3B-visual-integration.md). La fonte exacte et les hexadécimaux historiques ne sont pas identifiés ; ces tokens sont de nouveaux choix techniques, pas une ancienne validation retrouvée. |
| CL-01 | **Confirmée** : Classic V2 conserve une vraie sélection des niveaux, progression, total des meilleurs nombres d’étoiles et paliers cumulés. | Notice/manifeste V2 et instruction R4.3A ; pas de monnaie d’étoiles répétable par rejeu. |
| CL-02 | **Confirmée** : une réponse correcte à 1/2/3 étoiles termine le niveau et ouvre le suivant, sauf palier cumulé ; trois étoiles = maîtrise facultative. | Décision produit V2. L’implémentation actuelle conditionne encore Classic à 3 étoiles ; migration réservée à un futur jalon Classic. |
| CL-03 | **Illustratif** : seuil 50 au niveau 20 et exemples 47 étoiles / 19 niveaux. | Bundle explicitement non équilibré ; aucun seuil définitif des autres paliers déduit des images. |
| CL-04 | **Provisoire historiquement** : classement Classic par étoiles totales puis niveaux terminés. | V2 ; aucun troisième départage inventé. Ne pas modifier le classement compétitif dans R4.3. |
| CL-05 | **Référence courante** : utiliser les maquettes Classic V2 pour son intégration future. | L’utilisateur les désigne comme validées. Le manifeste du 6 novembre garde huit révisions proposées à valider visuellement : conserver cette trace sans fabriquer une date de validation ultérieure. |
| RG-01 | **Implémentée / protégée** : règles mathématiques et équilibrage R4.2, 12 cartes, trois boss, allocations ≥ 60 s et cible masquée avant départ. | Code, [R4.2](R4.2-rogue-difficulty.md), parcours actuel. Les anciens chiffres/cartes/boss illustratifs des PNG ne sont pas à réintroduire. |
| RG-02 | **Implémentée / protégée** : victoire officielle conservée après la survie ; jalons acquis restent dans le bilan. | Notices initiales et parcours R4.3A : victoire 6 010 points, fin de survie, 3/3 boss conservés. Aucune récompense ne dépend d’une future animation. |
| RG-03 | **Implémentée / protégée** : historique local et contrats de runs, diagnostics, indices actuels, curseur/pavé et protections Fabric. | R3.2.2/R4.1/R4.2 et captures nouvelles. Habillage des nouvelles surfaces, sans migration de données pour des raisons visuelles. |
| RG-04 | **Confirmée** : score de run et progression maximale sont des performances distinctes. | V2. Ne pas remplacer les métriques réelles par les nombres illustratifs des maquettes. |
| AR-01 | **À produire** : modèle puis neuf animations de mascotte avec sources et spritesheets. | Aucun asset correspondant retrouvé. Durées/poses du rapport sont des propositions R4.4, pas une validation ancienne. |
| AU-01 | **Provisoire** : musiques/SFX synthétiques actuels, bien câblés mais non validés comme bandes-son finales. | Quatre WAV musicaux identiques de 12 s, six SFX natifs ; aucune composition finale ou source LMMS/MIDI retrouvée. |
| AU-02 | **À produire et valider** : compositions originales menu/Classic/Daily/Rogue/boss/victoire/tension ; piste Rogue adaptative. | Demande R4.3A. Stems, tempos, volumes et mixage restent à définir et écouter. |
| SC-01 | **Périmètre confirmé** : R4.3A audit ; R4.3B intégration visuelle ; R4.3C validation ; R4.4 production artistique ; R4.5 intégration et polish. | La production artistique ne disparaît pas du plan. Classic, Daily, Supabase et autres modes sont préservés durant l’audit et la migration Rogue. |

## Conditions des jalons suivants

R4.3B spécifie les rôles visuels à partir des références existantes et regroupe cible/pavé sur Android. Les décisions techniques de thème consignées ci-dessous sont des choix nouveaux, sans les attribuer aux anciennes validations. R4.3C reste la revue visuelle et le polish, avec une mesure comparative de fluidité matérielle encore nécessaire.

R4.4 exige de confirmer l’animal visé depuis les références, puis son modèle avant toute production de poses, et une validation artistique/sonore des sources et droits. R4.5 valide lecture et performances sur les deux plateformes, réduction des animations, réglages et interruptions. Aucun effet audiovisuel ne doit devenir une source de vérité du moteur.

## Intégration R4.3B

La branche part de la PR #14 fusionnée et conserve les 75 références originales. Le thème est limité à Rogue ; les anciens exports de tokens, les composants des autres modes, le moteur R4.2, les contrats de stockage et l’audio restent inchangés. Les polices locales sont sous OFL ; `expo-font` est déclaré à la version 58.0.11 déjà verrouillée.

| ID | Choix d’implémentation | Validation / limite |
|---|---|---|
| RG-05 | Puzzle Android compact : cible et temps regroupés, pavé, curseur/sélection et actions visibles ensemble ; détails et build secondaires dans un panneau. | Joué sur émulateur aux formats habituel et 360 × 640 dp, y compris boss final ; temps actif pendant les détails et interruptions. Grands contrôles au-delà de 840 dp de hauteur de fenêtre. |
| RG-06 | Web horizontal : calcul à gauche, pavé à droite ; cible et temps dans le bandeau fixe en écran étroit. | Navigateur réel 1672 × 941, 768 × 1024, 360 × 640 ; clavier physique et remplacement d’opérateur conservés. |
| RG-07 | Offres Android compactes, avantage/coût/durée/niveau visibles, explications avancées repliables ; budget D2 fourni par le helper partagé. | T3, D2 I puis amélioration II joués ; court défilement possible pour les offres longues au petit format. Aucun effet de carte modifié. |
| AR-02 | Emplacements et icônes neutres en attendant l’identification exacte de la mascotte. | DA-03 reste inchangée. Aucun animal des PNG réemployé comme asset officiel et aucune nouvelle espèce inventée. |
| QA-01 | Captures natives et navigateur, avant/après et comparaisons documentaires avec les véritables PNG. | [Rapport R4.3B](R4.3B-visual-integration.md), [journal QA](../design-qa.md). Émulateur uniquement, sans validation physique ou écoute audio. R4.3C reste la revue visuelle et le polish ; R4.4/R4.5 conservent toute la production artistique et sonore prévue. |
