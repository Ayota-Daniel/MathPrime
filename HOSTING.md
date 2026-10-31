# Hébergement — recommandation (architecture découplée)

Trois briques indépendantes, chacune chez le fournisseur qui lui va le mieux :

| Brique | Quoi | Meilleure option | Pourquoi |
|---|---|---|---|
| **Web** | SPA Vite statique (`apps/web`) | **Vercel** (ou Cloudflare Pages / Netlify) | Déploiement d'un dossier statique, CDN mondial, HTTPS auto, free tier large |
| **Backend / leaderboard** | Postgres + API REST + RLS | **Supabase** | Aucun serveur à gérer, REST auto-généré (déjà utilisé par le code), free tier |
| **Mobile** | App Expo | **EAS Build + EAS Update** | APK/AAB cloud, OTA des MAJ JS, pas d'infra à héberger |

## Détails

### Web → Vercel
```bash
npm run build -w @shortest/web      # produit apps/web/dist
```
Connecte le repo à Vercel : Framework **Vite**, build command `npm run build -w @shortest/web`,
output `apps/web/dist`. Ajoute `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` dans les variables d'env Vercel.
(Monorepo : règle le *Root Directory* sur la racine, pas sur apps/web.)

### Données → Supabase
C'est **le** backend. Rien à héberger toi-même : Postgres managé + PostgREST + RLS (voir LEADERBOARD.md).
Si tu veux durcir l'anti-triche plus tard : **Supabase Edge Functions** (Deno) pour revalider l'expression côté serveur.

### Mobile → EAS
Pas « hébergé » : **distribué**.
- APK de test : `eas build -p android --profile preview` (profil `buildType: "apk"`).
- Stores : `eas build` (AAB) + `eas submit`.
- MAJ sans repasser par le store : `eas update` (OTA du bundle JS).

## En une phrase
**Vercel (web) + Supabase (données) + EAS (mobile)** : trois free tiers, trois briques découplées,
zéro serveur à administrer. C'est l'option la plus simple ET la plus alignée avec le code déjà écrit
(adaptateur leaderboard = REST Supabase). Une stack tout-en-un type Firebase t'obligerait à réécrire
l'adaptateur leaderboard — donc déconseillé ici.
