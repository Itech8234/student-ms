import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { courseService } from "../services/courseService.js";
import { enrollmentService } from "../services/enrollmentService.js";
import { progressService } from "../services/progressService.js";
import { storage } from "../config/firebase-admin.js";

const router = Router();

router.get("/:courseId/:lessonId", verifyToken, async (req, res) => {
  const { courseId, lessonId } = req.params;
  const enrollment = await enrollmentService.getOne(req.user.uid, courseId);
  if (!enrollment) return res.status(403).render("partials/forbidden", { layout: false });

  const curriculum = await courseService.getFullCurriculum(courseId);
  const lesson = findLesson(curriculum.modules, lessonId);
  if (!lesson) {
    return res.status(404).render("partials/toast-error", {
      message: "Lesson not found", layout: false
    });
  }

  // Generate signed video URL if applicable
  let videoUrl = null;
  if (lesson.type === "video" && lesson.content?.videoUrl?.startsWith("gs://")) {
    videoUrl = await getSignedUrl(lesson.content.videoUrl);
  }

  await enrollmentService.touchProgress(enrollment, courseId, lessonId);

  const completedSet = await progressService.getCourseProgress(req.user.uid, courseId);
  const nextLesson   = findNextLesson(curriculum.modules, lessonId);
  const prevLesson   = findPrevLesson(curriculum.modules, lessonId);

  res.render("partials/lesson-view", {
    layout: false,
    course: curriculum,
    courseId,
    lesson: { ...lesson, moduleId: lesson.moduleId || findModuleId(curriculum.modules, lessonId), videoUrl },
    completedSet: [...completedSet],
    nextLesson,
    prevLesson
  });
});

router.post("/:courseId/:lessonId/quiz", verifyToken, async (req, res) => {
  const { courseId, lessonId } = req.params;
  const curriculum = await courseService.getFullCurriculum(courseId);
  const lesson    = findLesson(curriculum.modules, lessonId);
  if (!lesson || lesson.type !== "quiz") {
    return res.status(400).render("partials/toast-error", { message: "Not a quiz", layout: false });
  }

  const quiz  = lesson.content?.quiz || [];
  const total = quiz.length;
  let correct = 0;
  quiz.forEach((q, qi) => {
    if (Number(req.body[`q${qi}`]) === q.correct) correct++;
  });
  const passed = total > 0 && correct / total >= 0.7;

  if (passed) {
    await progressService.markComplete({
      userId: req.user.uid, courseId,
      moduleId: findModuleId(curriculum.modules, lessonId), lessonId
    });
  }
  res.render("partials/quiz-result", { correct, total, passed, layout: false });
});

router.post("/:courseId/:lessonId/refresh-url", verifyToken, async (req, res) => {
  const curriculum = await courseService.getFullCurriculum(req.params.courseId);
  const lesson = findLesson(curriculum.modules, req.params.lessonId);
  if (lesson?.content?.videoUrl?.startsWith("gs://")) {
    const url = await getSignedUrl(lesson.content.videoUrl);
    return res.json({ url });
  }
  res.json({ url: null });
});

// ---------- Helpers ----------
function findLesson(modules, lessonId) {
  for (const m of modules || []) {
    const l = (m.lessons || []).find((x) => x.id === lessonId);
    if (l) return l;
  }
  return null;
}
function findModuleId(modules, lessonId) {
  for (const m of modules || []) {
    if ((m.lessons || []).some((x) => x.id === lessonId)) return m.id;
  }
  return null;
}
function findNextLesson(modules, lessonId) {
  const flat = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  const i = flat.findIndex((l) => l.id === lessonId);
  return i >= 0 && i < flat.length - 1 ? flat[i + 1] : null;
}
function findPrevLesson(modules, lessonId) {
  const flat = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleId: m.id })));
  const i = flat.findIndex((l) => l.id === lessonId);
  return i > 0 ? flat[i - 1] : null;
}

async function getSignedUrl(gsUrl) {
  const path = gsUrl.replace(`gs://${process.env.FIREBASE_STORAGE_BUCKET}/`, "");
  const [url] = await storage.bucket().file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 60 * 60 * 1000
  });
  return url;
}

export { router as lessonsRouter };
