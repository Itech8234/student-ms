import { db, COL, enrollmentId } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

export const progressService = {
  async markComplete({ userId, courseId, moduleId, lessonId }) {
    const eId = enrollmentId(userId, courseId);
    const progressRef = db.collection(COL.PROGRESS)
      .doc(eId).collection("lessons").doc(lessonId);

    await progressRef.set({
      lessonId,
      moduleId,
      completed: true,
      completedAt: FieldValue.serverTimestamp(),
      watchTimeSec: 0
    }, { merge: true });

    // Aggregate count for percent
    const totals       = await db.collection(COL.PROGRESS)
      .doc(eId).collection("lessons").count().get();
    const courseDoc    = await db.collection(COL.COURSES).doc(courseId).get();
    const totalLessons = courseDoc.data()?.lessonsCount || 0;
    const pct = totalLessons === 0 ? 0 : Math.round((totals.data().count / totalLessons) * 100);

    const update = { progressPct: pct, lastAccessedAt: FieldValue.serverTimestamp() };
    if (pct >= 100) update.completedAt = FieldValue.serverTimestamp();

    await db.collection(COL.ENROLLMENTS).doc(eId).update(update);
    return { progressPct: pct };
  },

  async getCourseProgress(userId, courseId) {
    const eId = enrollmentId(userId, courseId);
    const snap = await db.collection(COL.PROGRESS).doc(eId).collection("lessons").get();
    const completed = new Set();
    snap.forEach((d) => completed.add(d.id));
    return completed;
  },

  async getInstructorRoster(instructorId) {
    const courses = await db.collection(COL.COURSES)
      .where("instructorId", "==", instructorId).get();
    if (courses.empty) return [];

    const courseIds = courses.docs.map((d) => d.id);
    const enrollSnap = await db.collection(COL.ENROLLMENTS)
      .where("courseId", "in", courseIds.slice(0, 10))  // Firestore 'in' limit = 10
      .get();

    return enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
};
