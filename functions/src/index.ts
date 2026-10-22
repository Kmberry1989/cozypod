import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getDatabase } from 'firebase-admin/database';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

initializeApp();

async function requireUid(header?: string) {
  const match = header?.match(/^Bearer (.+)$/);
  if (!match) throw new Error('Sign-in required.');
  return (await getAuth().verifyIdToken(match[1])).uid;
}

export const createOrJoinRoom = onRequest({ cors: true }, async (request, response): Promise<void> => {
  try {
    const uid = await requireUid(request.headers.authorization);
    const roomCode = String(request.body?.roomCode || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (roomCode.length < 4) throw new Error('Use a room code with at least four characters.');
    const roomRef = getDatabase().ref(`v2/rooms/${roomCode}`);
    await roomRef.transaction((room) => {
      const next = room || { createdAt: Date.now(), hostUid: uid, players: {}, expiresAt: Date.now() + 6 * 60 * 60 * 1000 };
      const players = next.players || {};
      if (!players[uid] && Object.keys(players).length >= 4) return;
      next.players[uid] = { ...request.body.player, id: uid, name: String(request.body.player?.name || 'Player').slice(0, 20), online: true };
      next.expiresAt = Date.now() + 6 * 60 * 60 * 1000;
      return next;
    });
    const snapshot = await roomRef.child('players').get();
    if (!snapshot.child(uid).exists()) { response.status(409).json({ error: 'That Pod is full.' }); return; }
    response.json({ roomCode, uid });
  } catch (error) { response.status(401).json({ error: error instanceof Error ? error.message : 'Could not join room.' }); }
});

export const settleReward = onRequest({ cors: true }, async (request, response): Promise<void> => {
  try {
    const uid = await requireUid(request.headers.authorization);
    const transactionId = String(request.body?.transactionId || '').slice(0, 80);
    if (!transactionId) throw new Error('Missing reward transaction.');
    const db = getFirestore();
    await db.runTransaction(async (tx) => {
      const rewardRef = db.doc(`rewardTransactions/${transactionId}`);
      if ((await tx.get(rewardRef)).exists) return;
      tx.create(rewardRef, { uid, createdAt: FieldValue.serverTimestamp() });
      tx.set(db.doc(`profiles/${uid}`), { coins: FieldValue.increment(40), xp: FieldValue.increment(30), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    });
    response.json({ ok: true });
  } catch (error) { response.status(400).json({ error: error instanceof Error ? error.message : 'Reward failed.' }); }
});

export const expireRooms = onSchedule('every 30 minutes', async () => {
  const rooms = await getDatabase().ref('v2/rooms').orderByChild('expiresAt').endAt(Date.now()).get();
  const updates: Record<string, null> = {};
  rooms.forEach((child) => { updates[child.key!] = null; });
  if (Object.keys(updates).length) await getDatabase().ref('v2/rooms').update(updates);
});
