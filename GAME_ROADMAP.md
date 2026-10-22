# CozyPod strategy game roadmap

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
- **Round:** each player draws three path tiles and places one per turn on a
  shared 7×7 garden. Paths must connect to the existing bridge network.
- **Result:** first player to connect their two colored garden gates wins; if
  the deck empties, the longest connected route wins.
- **Acceptance:** deterministic shuffled deck, placement preview, invalid-tile
  rejection, reconnect support, and simultaneous-move transaction tests.

## 3. Cozy Market

- **Players:** two to four.
- **Round:** draft one visible item per turn for three rounds, refilling the
  market from a seeded deck after every pick.
- **Result:** score recipe sets, color collections, and neighbor bonuses. Highest
  total wins, with fewest unpaired items as the tie breaker.
- **Acceptance:** readable score preview, deterministic deck and totals, private
  draft hand where needed, reconnect support, and full scoring tests.
