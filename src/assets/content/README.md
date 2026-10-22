# CozyPod Content Packs

Every image added below is discovered automatically by Vite in development and
production builds. No registry edit is needed.

| Folder | What CozyPod does with it |
| --- | --- |
| `podling-bodies/` | Adds a selectable Podling body layer |
| `podling-headwear/` | Adds hats, sprouts, hair, or other head layers |
| `podling-hats/` | Adds front-layer hats, glasses, hair, or masks |
| `podling-faces/` | Adds selectable eyes/faces |
| `toys/` | Adds an equipable shared-shelf collectible |
| `room-backgrounds/` | Adds an equipable lounge background |
| `game-art/` | Registers art in the in-app content library for game modules |

Podling layers should be transparent 256×256 PNG or WebP files, aligned to the
same canvas as the built-in body, face, and sprout artwork. Room backgrounds
should be portrait-oriented and at least 1120×1400. Filenames become labels, so
use descriptive kebab-case names.

The Wardrobe uploader supports the same categories for device-local assets.
Uploaded files are persisted in IndexedDB and never uploaded to a server.
