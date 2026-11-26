# Hébergement — recommandation (architecture découplée)

Trois briques indépendantes, chacune chez le fournisseur qui lui va le mieux :

| Brique | Quoi | Meilleure option | Pourquoi |
|---|---|---|---|
| **Web** | SPA Vite statique (`apps/web`) | **Vercel** (ou Cloudflare Pages / Netlify) | Déploiement d'un dossier statique, CDN mondial, HTTPS auto, free tier large |
| **Backend / leaderboard** | Postgres + API REST + RLS | **Supabase** | Aucun serveur à gérer, Auth + Edge Function + RLS (voir rapport M3.3), free tier |
| **Mobile** | App Expo | **EAS Build + EAS Update** | APK/AAB cloud, OTA des MAJ JS, pas d'infra à héberger |

## Détails

### Web → Vercel
```bash
npm run build -w @shortest/web      # produit apps/web/dist
```
Connecte le repo à Vercel : Framework **Vite**, build command `npm run build -w @shortest/web`,
output `apps/web/dist`. Ajoute `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` dans les variables d'env Vercel.
(Monorepo : règle le *Root Directory* sur la racine, pas sur apps/web.)

### Données → Supabase
C'est **le** backend. Rien à héberger toi-même : Postgres managé + PostgREST + RLS (voir LEADERBOARD.md).
Le Daily compétitif requiert les migrations et l'Edge Function M3.3 : identité Auth, défi et calcul serveur. Une expression isolée ne suffit pas à certifier un score cumulé. Les autres modes restent locaux; voir `docs/M3.3-secure-leaderboard.md` pour la configuration et les limites.

### Mobile → EAS
Pas « hébergé » : **distribué**.
- APK de test : `eas build -p android --profile preview` (profil `buildType: "apk"`).
- Stores : `eas build` (AAB) + `eas submit`.
- MAJ sans repasser par le store : `eas update` (OTA du bundle JS).

## En une phrase
**Vercel (web) + Supabase (données) + EAS (mobile)** : trois free tiers, trois briques découplées,
zéro serveur à administrer. C'est l'option la plus simple ET la plus alignée avec le code déjà écrit
(Daily compétitif = Auth + Edge Function + PostgreSQL). Une stack tout-en-un type Firebase t'obligerait à réécrire
l'adaptateur leaderboard — donc déconseillé ici.
