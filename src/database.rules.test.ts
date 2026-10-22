import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { beforeAll, beforeEach, afterAll, describe, test } from 'vitest';
import { get, ref, set } from 'firebase/database';

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

const player = (id: string) => ({
  id, name: id, look: { body: 'teal', sprout: 'leaf', face: 'happy' }, online: true,
});

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
    await assertFails(set(ref(database, `${roomPath}/party/game`), { ...validGame, phase: 'cheating' }));
  });

  test('keeps rooms private until joining and protects each player profile', async () => {
    const outsider = environment.authenticatedContext('eve').database();
    await assertFails(get(ref(outsider, roomPath)));
    await assertSucceeds(set(ref(outsider, `${roomPath}/players/eve`), player('eve')));
    await assertSucceeds(get(ref(outsider, roomPath)));
    const alice = environment.authenticatedContext('alice').database();
    await assertSucceeds(set(ref(alice, `${roomPath}/players/alice`), player('alice')));
    await assertFails(set(ref(alice, `${roomPath}/players/bob`), player('bob')));
    await assertSucceeds(get(ref(alice, roomPath)));
  });

  test('allows room chat but rejects attempts to impersonate another player', async () => {
    const database = environment.authenticatedContext('alice').database();
    const message = { playerId: 'alice', name: 'Alice', text: 'Hello!', createdAt: 3 };
    await assertSucceeds(set(ref(database, `${roomPath}/messages/one`), message));
    await assertFails(set(ref(database, `${roomPath}/messages/two`), { ...message, playerId: 'bob' }));
    await assertFails(set(ref(database, `${roomPath}/messages/three`), { ...message, name: 'Bob' }));
    await assertFails(set(ref(database, `${roomPath}/messages/four`), { ...message, createdAt: 'tomorrow' }));
  });
});
