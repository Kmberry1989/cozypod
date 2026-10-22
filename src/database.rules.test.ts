import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { beforeAll, beforeEach, afterAll, describe, test } from 'vitest';
import { ref, set } from 'firebase/database';

const emulatorAvailable = Boolean(process.env.FIREBASE_DATABASE_EMULATOR_HOST);
const projectId = 'demo-cozypod';
const roomPath = 'v2/rooms/RULES1';

const validGame = {
  sessionId: 'drop4-1',
  gameId: 'drop4',
  phase: 'playing',
  playerIds: ['alice', 'bob'],
  createdAt: 1,
  updatedAt: 2,
  board: Array.from({ length: 42 }, () => -1),
  turnIndex: 0,
};

describe.skipIf(!emulatorAvailable)('Realtime Database room game rules', () => {
  let environment: RulesTestEnvironment;

  beforeAll(async () => {
    environment = await initializeTestEnvironment({
      projectId,
      database: { rules: readFileSync('database.rules.json', 'utf8') },
    });
  });

  beforeEach(async () => {
    await environment.clearDatabase();
    await environment.withSecurityRulesDisabled(async (context) => {
      const database = context.database();
      await set(ref(database, `${roomPath}/players/alice`), {
        id: 'alice', name: 'Alice', look: {}, online: true,
      });
      await set(ref(database, `${roomPath}/players/bob`), {
        id: 'bob', name: 'Bob', look: {}, online: true,
      });
    });
  });

  afterAll(async () => environment.cleanup());

  test('allows a connected room member to create valid shared game state', async () => {
    const database = environment.authenticatedContext('alice').database();
    await assertSucceeds(set(ref(database, `${roomPath}/party/game`), validGame));
    for (const gameId of ['reversi', 'bridges', 'market']) {
      await assertSucceeds(set(ref(database, `${roomPath}/party/game`), { ...validGame, sessionId: `${gameId}-1`, gameId }));
    }
  });

  test('rejects game writes from someone outside the room', async () => {
    const database = environment.authenticatedContext('mallory').database();
    await assertFails(set(ref(database, `${roomPath}/party/game`), validGame));
  });

  test('rejects malformed or unknown game state', async () => {
    const database = environment.authenticatedContext('alice').database();
    await assertFails(set(ref(database, `${roomPath}/party/game`), { ...validGame, gameId: 'unknown' }));
    await assertFails(set(ref(database, `${roomPath}/party/game`), { ...validGame, playerIds: [] }));
  });
});
