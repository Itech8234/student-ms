import { db, COL } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

export const userService = {
  async getById(uid) {
    const snap = await db.collection(COL.USERS).doc(uid).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  // Single getAll — no N+1
  async getManyByIds(uids) {
    if (!uids.length) return [];
    const refs = uids.map((u) => db.collection(COL.USERS).doc(u));
    const snaps = await db.getAll(...refs);
    return snaps.filter((s) => s.exists).map((s) => ({ id: s.id, ...s.data() }));
  },

  async updateProfile(uid, patch) {
    await db.collection(COL.USERS).doc(uid).update({
      ...patch,
      updatedAt: FieldValue.serverTimestamp()
    });
  }
};
