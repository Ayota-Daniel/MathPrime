# Développer MathPrime

Après intégration de R4.6, partir de `main` à jour et créer une branche dédiée. Lire [le registre produit](docs/PROJECT_DECISIONS.md) avant de modifier un comportement. Livrer le diff avec ses tests de non-régression dans une PR. La fusion appartient au propriétaire.

- Conserver Cahier sur Web et Android, les thèmes, Recursive, le quadrillage et les interactions du pavé. Vérifier une modification d’interface dans l’application concernée.
- Placer les règles communes dans le moteur. Rogue utilise 3, 5, 7 et les opérateurs addition, soustraction et multiplication, avec priorité standard et sans parenthèses. Conserver le contrat de génération des sessions sauvegardées.
- En release, tirer un entier non signé sur 32 bits à la création effective. Garder le choix de graine et les exports détaillés dans les builds de développement et leur stockage dédié.
- Protéger les identifiants de session indépendants, l’archivage atomique des 50 derniers résumés, la reprise du temps et la victoire après la survie. Tester une migration avec des données antérieures.
- Classic ouvre le niveau suivant à chaque résolution. Compter le meilleur résultat de chaque niveau et les maîtrises distinctes. Soumettre tout nouveau seuil au propriétaire.
- Préserver les autres modes, les données, les protections du classement et Supabase. Pour un changement partagé, exécuter la suite de tests et les vérifications TypeScript des trois espaces. Pour une livraison, vérifier les builds concernés et distinguer dans la PR les essais sur navigateur, émulateur et appareil physique.
