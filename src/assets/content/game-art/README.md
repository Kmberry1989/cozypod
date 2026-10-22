# Game art

- **Single props:** 512×512 px transparent PNG/WebP, object inside x/y=40–472.
- **Sprite sheets:** 1536×1024 px on a transparent background; use a documented,
  evenly spaced grid with at least 24 px clear separation between sprites.
- **Backdrops:** 1120×1400 px portrait or 1600×1000 px landscape, depending on
  the game module. Keep UI-safe space around every edge.
- **Art direction:** the same tactile clay, palette, lighting, and friendly visual
  weight as the lounge. State changes must remain readable at 64 px.
- **Naming:** prefix related files with the game ID, for example
  `lanterns-wind.webp` or `drop4-board.webp`.
- **Important:** files auto-register in the content library; a game module still
  determines the semantic role, animation, collision, and interaction.

## Included arcade strips

- `cozy-market-items.webp`: 1983×793 transparent WebP, five evenly spaced item
  slots ordered tea, yarn, pastry, candle, book.
- `bridge-tiles.webp`: 2172×724 transparent WebP, five evenly spaced tile slots
  ordered straight, corner, junction, crossing, island.

Keep the item order and transparent padding when replacing either strip; the
game UI addresses each sprite by its 0–4 slot position.
