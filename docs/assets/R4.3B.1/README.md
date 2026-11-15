# Preuves du correctif de lisibilité

Captures réelles du navigateur et relevés de couleurs calculées. Voir le [rapport](../../R4.3B.1-readability.md).

- `01`, `02`, `03` : didacticiel, puzzle actif et offres, avant/après.
- `04` : diagnostic de syntaxe ; `05` : didacticiel étroit ; `06` : aperçu laissé pour la revue.
- `compare-*` : juxtaposition des captures brutes, largeurs normalisées à 960 px, avec titres documentaires ; aucun élément d’interface redessiné.
- `contrast-*` : textes, styles calculés, fonds effectifs, opacité composée et ratios sRGB. Les états, valeurs et positions de défilement ne sont pas tous identiques. Les tableaux ne couvrent pas toutes les interactions possibles et ne sont pas un test automatique des futures versions.

Viewport principal 1280 × 960 CSS px, contrôle étroit 360 × 800 ; l’API de capture renvoie selon le cas 1280 × 960, 1265 × 949 ou 345 × 767 px. `06` utilise le viewport habituel restauré. Les fichiers bruts sont conservés sans retouche. Les essais utilisent une origine locale de test distincte ; aucune sauvegarde utilisateur n’est exportée.
