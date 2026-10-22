# CozyPod Content Packs

Every image added below is discovered automatically by Vite in development and
production builds. No registry edit is needed.

| Folder | What CozyPod does with it |
| --- | --- |
| `podling-bodies/` | Adds a selectable Podling body layer |
| `podling-headwear/` | Adds hats, sprouts, hair, or other head layers |
| `podling-hats/` | Adds front-layer hats, glasses, hair, or masks |
| `podling-faces/` | Adds selectable eyes/faces |
| `trophies/` | Adds an earned trophy to the Wardrobe shelf |
| `toys/` | Adds an equipable shared-shelf collectible |
| `room-backgrounds/` | Adds an equipable lounge background |
| `game-art/` | Registers art for game modules to consume from the asset catalog |

Podling layers should be transparent 256×256 PNG or WebP files, aligned to the
same canvas as the built-in body, face, and sprout artwork. Room backgrounds
should be portrait-oriented and at least 1120×1400. Filenames become labels, so
use descriptive kebab-case names.

Project assets are intentionally build-time only: add a file to a folder, then
rebuild/deploy CozyPod. The Wardrobe discovers it automatically and assigns its
unlock requirement from its alphabetical position in that folder. Faces unlock
every two levels; bodies and rear accessories every three levels; front
accessories and trophies unlock one per earned trophy.
