# CozyPod

CozyPod is a small, clay-styled social clubhouse for up to four real people.
Friends join with a room code, customize a Podling, chat or use free peer-to-peer
voice, collect unlockable art, and play shared or solo arcade games.

The production client is hosted on GitHub Pages at
<https://kmberry1989.github.io/cozypod/>.

## Arcade

Shared games use Firebase Realtime Database transactions so every browser sees
the same turn and board:

- Drop 4, Word Bomb, Hot Takes, and Lantern Keepers
- Mossy Reversi, Bridge Builders, and Cozy Market

Solo games remain available in a one-person room:

- Trivia, Melody, Reflex, Firefly Pairs, Glow Garden, Tea Stack, Moon Mosaic,
  and Cozy Code

Party Night queues up to five games, synchronizes the active round, prevents an
unfinished shared round from being skipped, and shows a final room scoreboard.

## Local development

Requirements: Node.js 22 or newer and Java 11 or newer for Firebase emulators.

```sh
npm ci
npm run dev
```

For isolated multiplayer development, start Auth and Realtime Database
emulators, then point Vite at both:

```sh
firebase emulators:start --only auth,database --project demo-cozypod
VITE_FIREBASE_DATABASE_URL='http://127.0.0.1:9000?ns=demo-cozypod-default-rtdb' \
VITE_FIREBASE_AUTH_EMULATOR_URL='http://127.0.0.1:9099' \
npm run dev -- --host 127.0.0.1
```

## Verification

```sh
npm run lint
npm test
npm run test:rules
npm --prefix functions run build
npm run build
```

The GitHub Pages workflow runs all four checks before publishing. Browser QA
should use separate browser contexts so every player has a distinct anonymous
Firebase identity.

## Firebase setup

The checked-in Firebase web configuration is public client configuration, not a
secret. For another project, copy `.env.example` to `.env.local`, fill in the
web-app values, enable Anonymous Authentication, and create a Realtime Database.
Google sign-in is optional; if enabled, add the production hostname to Firebase
Authentication's authorized domains.

Voice is WebRTC peer-to-peer and needs no paid provider or voice API key. See
[VOICE.md](VOICE.md) for its free-networking limits.

Deploy database rules before publishing a client that writes a new game shape:

```sh
firebase login
firebase deploy --only database --project spatial-canvas-a9726
git push origin main
```

That order matters: an older ruleset will reject new shared-game IDs and place
those games into local fallback mode. Never commit login codes, access tokens,
service-account keys, or `.env.local`.

## Add art without editing code

Drop PNG, WebP, JPG, GIF, or SVG files into the matching folder under
[`src/assets/content/`](src/assets/content/). Vite discovers them on the next
build and the Wardrobe assigns their unlock requirement automatically.

Fresh profiles begin at level 1 with starter art only. Solo completions award
coins and XP; completed shared rounds also award trophies. Existing profiles in
browser storage and the room database keep their earned progress.

Each category has its own README with exact canvas dimensions, safe bounds,
layering, filenames, and art direction:

- `podling-bodies/`, `podling-headwear/`, `podling-hats/`, `podling-faces/`
- `trophies/`, `toys/`, `room-backgrounds/`, `game-art/`

Do not add template images to these folders: every supported image file is a
real asset and will be loaded into the app. The category README files are the
non-loading templates.

## Architecture notes

- React 19, TypeScript, and Vite power the static client.
- Firebase Anonymous Auth gives each tab a stable player identity.
- Realtime Database transactions own shared game state and reward claims.
- Procedural Web Audio supplies taps, success tones, weather, and lounge music.
- `import.meta.glob` provides build-time content-pack discovery.
- Firebase emulators back multiplayer and security-rule tests.

The implemented strategy-game contracts are documented in
[GAME_ROADMAP.md](GAME_ROADMAP.md).
