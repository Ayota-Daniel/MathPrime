# Shortest — monorepo

Jeu : atteindre une cible (1–1000) avec **3, 5, 7** et **+ − ×**, sans parenthèses,
priorité standard. Le score récompense l'expression **la plus courte**.

## Structure
```
shortest/
├─ packages/
│  ├─ engine/      @shortest/engine — TOUTE la logique (partagée web+mobile)
│  │  ├─ src/      evaluate · solver(build) · solve-one · difficulty · game-engine · persistence · store(factory) · puzzles
│  │  ├─ scripts/  build-puzzles.ts  (régénère les tables)
│  │  └─ data/     puzzles.*.json (pré-calculés)
│  └─ tokens/      @shortest/tokens — couleurs/rayons/seuils (source de vérité du design)
└─ apps/
   ├─ web/         Vite + React + TanStack + TailwindCSS
   └─ mobile/      Expo + React Native + NativeWind
```

## Ce qui est PARTAGÉ vs PAR PLATEFORME
- Partagé : `@shortest/engine` (dont le **store** via `createGameStore(storage)`) et `@shortest/tokens`.
- Par plateforme : les composants UI (un `<div>` web ≠ un `<View>` RN) et l'adaptateur Storage
  (localStorage / AsyncStorage) et l'audio (Web Audio synthétisé / expo-av).

## Démarrer
```bash
npm install
npm run puzzles      # (re)génère les tables dans packages/engine/data
npm run web          # http://localhost:5173
npm run mobile       # Expo
npm run typecheck    # engine + web
```

## Vérifié hors-ligne
- Engine (store inclus) : `tsc --strict` 0 erreur.
- Évaluateur : 200 000 expressions vs `eval()` → 0 écart (priorité prouvée).
- Tables : 1000/1000 cibles, 0 expression incorrecte.

## NON vérifié hors-ligne (à lancer après `npm install`)
- Le code `.tsx` web/mobile (pas de react/tanstack/expo/nativewind installés ici).
  Attendre d'éventuels ajustements mineurs de l'API typée de TanStack Router et de NativeWind.

## Sons & logos
- SFX web : **synthétisés** (Web Audio), aucun fichier requis.
- SFX mobile : déposer des `.wav` dans `apps/mobile/assets/sfx/` (slots prêts dans `src/audio.ts`).
- Musique de fond : **générée** (`npm run music` -> `tools/gen-music.cjs`), boucle 12 s sans raccord, câblée web+mobile. Remplaçable par ton propre fichier.
- Logos : `branding/` (3 concepts + wordmark + app-icon).

## Nouveautés (cette itération)
- **Indices** : bouton *Indice* révèle l'expression optimale token par token ; chaque indice **abaisse le plafond d'étoiles** (anti-abus).
- **Record personnel** : célébration (bannière + son dédié) déclenchée **une seule fois par run** (pas de spam).
- **Statistiques** : meilleur score + meilleure série par mode, XP, rang, taux de 3★.
- **Leaderboard anonyme** : voir `LEADERBOARD.md`. Local par défaut, mondial via Supabase. Opt-in + pseudo, sans login.

## Mobile — Expo SDK 54 (RN 0.81 / React 19.1)
Node 20.19+ requis. Après `npm install`, lance impérativement :
```bash
cd apps/mobile
npx expo install --fix   # aligne les versions des packages gérés par Expo
npx expo-doctor          # détecte les incompat. New Architecture
```
Points clés : audio via **expo-audio** (expo-av déprécié) ; **NativeWind ^4.2 + Reanimated ~4.1 + react-native-worklets** ; ne PAS dupliquer le plugin Babel worklets (déjà inclus dans `react-native-reanimated/plugin`).

