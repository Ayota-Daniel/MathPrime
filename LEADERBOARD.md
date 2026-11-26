# Classements MathPrime

Le classement **Cet appareil** est local et non vérifié. Il fonctionne sans configuration ni connexion et conserve les records existants. Ils ne sont jamais transférés comme preuves de score compétitif.

Le premier classement **Daily vérifié** utilise un défi émis par le serveur, Supabase Auth anonyme, une Edge Function et des transactions PostgreSQL. Le serveur vérifie les expressions et calcule la récompense avec sa propre date, sa série et ses indices. Classic, Big Challenge, Rogue et Free Skill restent locaux.

La participation distante est volontaire. Aucun compte traditionnel n'est requis, mais une identité Auth anonyme est bien créée. Elle est liée au stockage de cette installation; plusieurs identités par personne restent possibles. Le pseudo et le score vérifié sont publics.

Le SQL permissif historique `scores`/`insert_anon`/`update_anon` n'est plus une procédure d'installation valide. Les clients ne doivent pas disposer de droits INSERT/UPDATE/DELETE sur les scores. Utiliser les migrations versionnées sous `supabase/migrations`, puis auditer les anciennes fonctions et permissions du projet avant toute ouverture publique.

Configuration, commandes de tests locaux, modèle de menace, garanties effectivement testées et limites : [rapport M3.3](docs/M3.3-secure-leaderboard.md). Les exemples d'environnement contiennent uniquement des placeholders de clés publiques. La clé secrète reste côté serveur. Aucun service de production n'est fourni ni déployé par le simple ajout de ces variables.
