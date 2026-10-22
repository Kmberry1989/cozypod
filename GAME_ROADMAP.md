# CozyPod strategy games

Status: implemented in the shared arcade engine.

New games use the same room session contract as the shared arcade games: a
stable session ID, connected participant IDs, a visible active player, Firebase
transactions for every move, reconnect-safe state, deterministic scoring, and a
working rules panel.

## 1. Mossy Reversi

- **Players:** exactly two; other room members spectate.
- **Round:** alternate legal placements on an 8×8 moss-tile board, flipping all
  bracketed lines. Pass automatically when a player has no legal move.
- **Result:** most tiles when neither player has a legal move. Ties are allowed.
- **Acceptance:** legal-move hints, server-checked turn owner, reconnect without
  losing the board, and complete direction/flip tests.

## 2. Bridge Builders

- **Players:** two to four.
- **Round:** players select and rotate straight, corner, junction, or crossing
  tiles, placing one per turn on a shared 7×7 river. Every placement must make
  a reciprocal connection to the route reachable from the starting cottage.
- **Result:** the player whose tile first connects the route to the far cottage
  wins; a completely filled board without a connection is a draw.
- **Acceptance:** placement preview, invalid and disconnected tile rejection,
  reconnect support, and simultaneous-move transaction tests.

## 3. Cozy Market

- **Players:** two to four.
- **Round:** draft one visible item per turn for three rounds. The seeded row is
  refilled at the beginning of each round after every player has picked once.
- **Result:** three matching items score 9, three different items score 5, a
  pair scores 4, and all other baskets score one point per item. Ties are shared.
- **Acceptance:** readable live score preview, deterministic rows and totals,
  reconnect support, and full scoring tests.
