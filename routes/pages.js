import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { courseService } from "../services/courseService.js";
import { enrollmentService } from "../services/enrollmentService.js";
import { progressService } from "../services/progressService.js";

const router = Router();

router.get("/", async (req, res) => {
  const { items } = await courseService.list({ status: "published" });
  res.render("pages/home", { featured: items.slice(0, 6) });
});

router.get("/dashboard", verifyToken, async (req, res) => {
  const enrollments = await enrollmentService.listForUser(req.user.uid);
  res.render("pages/dashboard", { enrollments });
});

router.get("/login",    (req, res) => res.render("pages/login"));
router.get("/register", (req, res) => res.render("pages/register"));
router.get("/reset",    (req, res) => res.render("pages/reset"));

// Course player shell
router.get("/learn/:courseId", verifyToken, async (req, res) => {
  const enrollment = await enrollmentService.getOne(req.user.uid, req.params.courseId);
  if (!enrollment) return res.redirect(`/courses/${req.params.courseId}`);

  const course     = await courseService.getFullCurriculum(req.params.courseId);
  const allFlat    = course?.modules?.flatMap(m => m.lessons.map(l => ({ ...l, moduleId: m.id }))) || [];
  const lessonId   = req.query.lesson || allFlat[0]?.id;
  const completed  = await progressService.getCourseProgress(req.user.uid, course.id);
  const overallPct = enrollment.progressPct || 0;

  res.render("pages/learn", {
    data: { course, lessonId, completedSet: [...completed], overallPct }
  });
});

export { router as pagesRouter };
