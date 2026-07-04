import { db } from "./firebase-admin.js";

export const COL = {
  USERS:       "users",
  COURSES:     "courses",
  MODULES:     "modules",
  LESSONS:     "lessons",
  ENROLLMENTS: "enrollments",
  PROGRESS:    "progress",
  REVIEWS:     "reviews"
};

export const enrollmentId = (userId, courseId) => `${userId}_${courseId}`;

export async function getCourseWithStats(courseId) {
  const snap = await db.collection(COL.COURSES).doc(courseId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
}
