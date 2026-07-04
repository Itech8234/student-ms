import { db, COL, enrollmentId } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

const PAGE_SIZE = 12;

export const courseService = {
  // Catalog — single query, no joins
  async list({ category, q, status = "published", cursor = null } = {}) {
    let query = db.collection(COL.COURSES).where("status", "==", status);

    if (category) query = query.where("category", "==", category);
    if (q) {
      query = query
        .orderBy("titleLower")
        .startAt(q.toLowerCase())
        .endAt(q.toLowerCase() + "\uf8ff");
    }

    query = query.orderBy("createdAt", "desc").limit(PAGE_SIZE);
    if (cursor) query = query.startAfter(cursor);

    const snap = await query.get();
    return {
      items: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
      nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null
    };
  },

  async getById(courseId) {
    const snap = await db.collection(COL.COURSES).doc(courseId).get();
    return snap.exists ? { id: snap.id, ...snap.data() } : null;
  },

  async getBySlug(slug) {
    const snap = await db.collection(COL.COURSES).where("slug", "==", slug).limit(1).get();
    return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
  },

  // Course + modules + lessons — 1 + 1 + N parallel
  async getFullCurriculum(courseId) {
    const course = await this.getById(courseId);
    if (!course) return null;

    const modsSnap = await db.collection(COL.COURSES)
      .doc(courseId).collection("modules")
      .orderBy("order", "asc").get();

    const modules = await Promise.all(modsSnap.docs.map(async (m) => {
      const lessonsSnap = await db.collection(COL.COURSES)
        .doc(courseId).collection("modules").doc(m.id)
        .collection("lessons").orderBy("order", "asc").get();
      return {
        id: m.id, ...m.data(),
        lessons: lessonsSnap.docs.map((l) => ({ id: l.id, ...l.data() }))
      };
    }));

    return { ...course, modules: modules.filter(Boolean) };
  },

  async create(instructorId, instructorName, data) {
    const slug = slugify(data.title);
    const ref  = db.collection(COL.COURSES).doc();
    await ref.set({
      title: data.title,
      slug,
      description: data.description,
      thumbnail: data.thumbnail || null,
      category: data.category,
      level: data.level,
      price: Number(data.price) || 0,
      status: "draft",
      instructorId,
      instructorName,
      modulesCount: 0,
      lessonsCount: 0,
      enrolledCount: 0,
      ratingAvg: 0,
      ratingCount: 0,
      tags: data.tags || [],
      titleLower: data.title.toLowerCase(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    return ref.id;
  },

  async incrementLessonCount(courseId, delta) {
    await db.collection(COL.COURSES).doc(courseId).update({
      lessonsCount: FieldValue.increment(delta),
      updatedAt:    FieldValue.serverTimestamp()
    });
  }
};

function slugify(s) {
  return s.toLowerCase().trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .slice(0, 80);
}
