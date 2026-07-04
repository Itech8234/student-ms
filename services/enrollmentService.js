import { db, COL, enrollmentId } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

export const enrollmentService = {
  async enroll(userId, courseId) {
    const id  = enrollmentId(userId, courseId);
    const ref = db.collection(COL.ENROLLMENTS).doc(id);
    const snap = await ref.get();
    if (snap.exists) return { id, already: true };

    const course = await db.collection(COL.COURSES).doc(courseId).get();
    if (!course.exists) throw new Error("Course not found");
    const c = course.data();

    const batch = db.batch();
    batch.set(ref, {
      userId,
      courseId,
      courseTitle:     c.title,
      courseThumbnail: c.thumbnail,
      instructorId:    c.instructorId,
      enrolledAt:      FieldValue.serverTimestamp(),
      lastAccessedAt:  FieldValue.serverTimestamp(),
      lastLessonId:    null,
      progressPct:     0,
      completedAt:     null
    });
    batch.update(db.collection(COL.COURSES).doc(courseId), {
      enrolledCount: FieldValue.increment(1)
    });
    await batch.commit();
    return { id, already: false };
  },

  async listForUser(userId, limit = 20) {
    const snap = await db.collection(COL.ENROLLMENTS)
      .where("userId", "==", userId)
      .orderBy("lastAccessedAt", "desc")
      .limit(limit)
      .get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  async getOne(userId, courseId) {
    const snap = await db.collection(COL.ENROLLMENTS)
      .doc(enrollmentId(userId, courseId)).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async touchProgress(enrollmentDoc, courseId, lessonId) {
    await db.collection(COL.ENROLLMENTS)
      .doc(enrollmentDoc.id).update({
        lastLessonId:   lessonId,
        lastAccessedAt: FieldValue.serverTimestamp()
      });
  }
};
