import { Router } from "express";
import { verifyToken, requireRole } from "../middleware/verifyToken.js";
import { courseService } from "../services/courseService.js";
import { progressService } from "../services/progressService.js";
import { db, COL } from "../config/firestore.js";
import { FieldValue } from "firebase-admin/firestore";

const router = Router();
router.use(verifyToken, requireRole("instructor"));

router.get("/", async (req, res) => {
  const snap = await db.collection(COL.COURSES)
    .where("instructorId", "==", req.user.uid)
    .orderBy("updatedAt", "desc").get();
  const courses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  res.render("pages/instructor-portal", { courses });
});

router.get("/roster", async (req, res) => {
  const roster = await progressService.getInstructorRoster(req.user.uid);
  res.render("partials/roster", { items: roster, layout: false });
});

router.get("/courses", async (req, res) => {
  const status = req.query.status;
  let q = db.collection(COL.COURSES).where("instructorId", "==", req.user.uid);
  if (status && status !== "all") q = q.where("status", "==", status);
  q = q.orderBy("updatedAt", "desc");
  const snap = await q.get();
  res.render("partials/course-list", {
    items: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    layout: false
  });
});

router.get("/courses/new", (req, res) => {
  res.render("pages/course-new");
});

router.get("/courses/:courseId/edit", async (req, res) => {
  const course = await courseService.getFullCurriculum(req.params.courseId);
  if (!course) return res.status(404).render("pages/404", {
    error: { status: 404, code: "not_found", message: "Course not found" }
  });
  res.render("pages/course-edit", { course, modules: course.modules });
});

router.post("/courses", async (req, res) => {
  const id = await courseService.create(
    req.user.uid,
    req.user.profile?.displayName || "Instructor",
    req.body
  );
  res.json({ ok: true, id });
});

router.post("/courses/:courseId/modules", async (req, res) => {
  const ref = db.collection(COL.COURSES).doc(req.params.courseId)
    .collection("modules").doc();
  const order = Number(req.body.order) || Date.now();
  await ref.set({
    title: req.body.title,
    order,
    lessonsCount: 0,
    createdAt: FieldValue.serverTimestamp()
  });
  await db.collection(COL.COURSES).doc(req.params.courseId).update({
    modulesCount: FieldValue.increment(1),
    updatedAt:    FieldValue.serverTimestamp()
  });
  res.render("partials/module-row", {
    module: { id: ref.id, title: req.body.title, order, lessons: [] },
    courseId: req.params.courseId,
    layout: false
  });
});

router.post("/courses/:courseId/modules/:moduleId/lessons", async (req, res) => {
  const lessonsRef = db.collection(COL.COURSES).doc(req.params.courseId)
    .collection("modules").doc(req.params.moduleId)
    .collection("lessons").doc();
  const order = Number(req.body.order) || Date.now();
  await lessonsRef.set({
    title: req.body.title,
    order,
    type: req.body.type || "text",
    content: buildContent(req.body),
    isFree: req.body.isFree === "on",
    createdAt: FieldValue.serverTimestamp()
  });
  await courseService.incrementLessonCount(req.params.courseId, 1);
  res.render("partials/lesson-row", {
    lesson: { id: lessonsRef.id, ...req.body, order },
    courseId: req.params.courseId,
    moduleId: req.params.moduleId,
    layout: false
  });
});

router.delete("/courses/:courseId/modules/:moduleId", async (req, res) => {
  const { courseId, moduleId } = req.params;
  const modRef  = db.collection(COL.COURSES).doc(courseId).collection("modules").doc(moduleId);
  const lessons = await modRef.collection("lessons").get();
  const batch   = db.batch();
  lessons.forEach((l) => batch.delete(l.ref));
  batch.delete(modRef);
  batch.update(db.collection(COL.COURSES).doc(courseId), {
    modulesCount: FieldValue.increment(-1),
    lessonsCount: FieldValue.increment(-lessons.size),
    updatedAt:    FieldValue.serverTimestamp()
  });
  await batch.commit();
  res.send("");
});

router.delete("/courses/:courseId/modules/:moduleId/lessons/:lessonId", async (req, res) => {
  const { courseId, moduleId, lessonId } = req.params;
  await db.collection(COL.COURSES).doc(courseId)
    .collection("modules").doc(moduleId)
    .collection("lessons").doc(lessonId).delete();
  await courseService.incrementLessonCount(courseId, -1);
  res.send("");
});

router.post("/courses/:courseId/publish", async (req, res) => {
  const { courseId } = req.params;
  const course = await courseService.getById(courseId);
  if (!course) return res.status(404).json({ error: "not found" });
  if (course.modulesCount === 0) {
    return res.status(400).render("partials/toast-error", {
      message: "Add at least one module first", layout: false
    });
  }
  await db.collection(COL.COURSES).doc(courseId).update({
    status: "published",
    updatedAt: FieldValue.serverTimestamp()
  });
  res.render("partials/toast-success", { message: "Course published!", layout: false });
});

function buildContent(b) {
  if (b.type === "video") return { videoUrl: b.videoUrl || "", durationSec: Number(b.durationSec) || 0 };
  if (b.type === "quiz")  return { quiz: JSON.parse(b.quizJson || "[]") };
  return { body: b.body || "" };
}

export { router as instructorRouter };
