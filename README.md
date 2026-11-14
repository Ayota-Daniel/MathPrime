# MathPrime — monorepo `shortest`

Jeu : atteindre une cible avec **3, 5, 7** et **+ − ×**, sans parenthèses,
avec la multiplication prioritaire. La longueur de l’expression compte dans la maîtrise.
Les règles de progression, indices et scores dépendent du mode.

## Structure

```text
shortest/
├─ packages/
│  ├─ engine/      @shortest/engine — logique partagée, stores, solveur, Rogue et persistance
│  │  ├─ src/
│  │  ├─ scripts/  génération des tables
│  │  └─ data/     puzzles pré-calculés
│  └─ tokens/      @shortest/tokens — valeurs visuelles et seuils actuellement implémentés
└─ apps/
   ├─ web/         Vite + React + TanStack + TailwindCSS
   └─ mobile/      Expo + React Native + NativeWind
```

Le moteur et les tokens sont partagés. Les composants, adaptateurs localStorage/AsyncStorage
et lecteurs audio restent propres à chaque plateforme.

## Démarrer et vérifier

La CI utilise Node.js 26 et `npm ci`. Les versions sont fixées par les manifestes et le lockfile.

```bash
npm ci
npm run web                         # http://localhost:5173
npm run mobile                      # serveur Expo
npm test                            # moteur, Web, mobile
npm run typecheck                   # moteur + Web
npm run typecheck -w @shortest/mobile
npm run build -w @shortest/web
```

`npm run puzzles` régénère les tables : cette opération est distincte d’un démarrage normal.
Les validations Web et natives sont documentées dans [M2.1](docs/M2.1-web.md),
[M2.2](docs/M2.2-mobile.md), [R3.2.1](docs/R3.2.1-android-validation.md) et
[R4.2](docs/R4.2-rogue-difficulty.md). Ces rapports décrivent leurs campagnes datées ;
la CI reste la vérification automatisée de chaque PR.

## Mobile — Expo SDK 58

Versions installées vérifiées pour R4.3A : Expo **58.0.22**, React Native **0.88.1**,
React **19.3.0**, Expo Audio **58.0.11**, Reanimated **4.7.1**, Worklets **0.13.0**.
Le dossier Android est maintenu manuellement : suivre [M2.2](docs/M2.2-mobile.md),
sans régénération aveugle par `expo prebuild` ni changement de dépendances pour lancer le projet.

Sur l’environnement Omarchy actuel, le SDK est dans `$HOME/Android/Sdk`
et Java 17 est sélectionné par `apps/mobile/mise.toml` :

```bash
cd apps/mobile
ANDROID_HOME="$HOME/Android/Sdk" \
ANDROID_SDK_ROOT="$HOME/Android/Sdk" \
mise exec -- npm run android
```

L’AVD `Pixel_4_XL` est disponible sur cet environnement. Un build/export Hermes seul
ne remplace pas un parcours réel sur Android. NativeWind 4 est conservé ; la configuration
Babel/Worklets existante ne nécessite pas l’ajout d’un second plugin.

## Rogue et décisions produit

R4.2 est intégré : cartes et améliorations, boss, préparation sans cible, diagnostics,
indices partiels, didacticiel, historique local et mesures de playtest.
Les sauvegardes restent locales ; le temps d’un puzzle actif continue pendant les interruptions.
La victoire officielle reste acquise après la survie.

La direction artistique retrouvée est ivoire/aubergine/bleu nuit/corail. Les tokens actuels
ne sont pas encore sa traduction complète. Lire [l’audit R4.3A](docs/R4.3A-visual-audit.md),
[l’inventaire](docs/R4.3A-assets.json), [les captures](docs/R4.3A-capture-notes.md) et
[le registre des décisions](docs/PROJECT_DECISIONS.md) avant l’intégration.
L’identification exacte de la mascotte reste à confirmer depuis les références visuelles.
L’utilisateur a exclu le panda et le panda roux et fait référence à un autre animal des maquettes ;
aucune espèce ne doit être inventée et aucune nouvelle mascotte n’est produite pour le moment.

Pour Classic, les décisions V2 prévoient une sélection de niveaux, des étoiles cumulées
et un déblocage après toute réponse correcte, sauf palier. Le code actuel garde encore
le déblocage à trois étoiles : cette migration future n’est pas incluse dans l’audit Rogue.

## Audio et identité

Les SFX Web sont synthétisés par Web Audio ; les six WAV natifs existent déjà dans
`apps/mobile/assets/sfx/`, lus par Expo Audio. `npm run assets` les régénère avec la musique ;
cette commande réécrit des assets et n’est pas nécessaire au lancement.

`tools/gen-music.cjs` produit une boucle synthétique de 12 secondes. Les quatre fichiers
musicaux main/Rogue Web/mobile sont actuellement identiques : ce sont des placeholders,
pas les compositions originales finales. La feuille de production R4.3A prévoit musiques,
couches Rogue adaptatives, SFX et sources artistiques aux jalons R4.4/R4.5.
`branding/` contient les concepts SVG historiques, wordmark et icône ; aucun modèle animal final.

## Services

Les records locaux fonctionnent hors ligne. L’infrastructure Daily compétitive utilise
Supabase Auth anonyme et validation serveur, à configurer séparément : voir [LEADERBOARD.md](LEADERBOARD.md).
L’audit visuel ne modifie ni Daily, ni Supabase, ni le classement compétitif.
