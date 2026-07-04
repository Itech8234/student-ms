import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { courseService } from "../services/courseService.js";
import { enrollmentService } from "../services/enrollmentService.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

router.get("/", async (req, res) => {
  const { items, nextCursor } = await courseService.list({
    category: req.query.category,
    q: req.query.q
  });
  res.render("pages/catalog", { courses: items, cursor: nextCursor, filters: req.query });
});

router.get("/grid", async (req, res) => {
  const { items } = await courseService.list({
    category: req.query.category,
    q: req.query.q
  });
  res.render("partials/course-grid", { courses: items, layout: false });
});

router.get("/:slug", async (req, res) => {
  const course = await courseService.getBySlug(req.params.slug);
  if (!course) return res.status(404).render("pages/404", {
    error: { status: 404, code: "not_found", message: "Course not found" }
  });

  const curriculum = await courseService.getFullCurriculum(course.id);
  const isEnrolled = req.user
    ? !!(await enrollmentService.getOne(req.user.uid, course.id))
    : false;

  res.render("pages/course-detail", { course: curriculum, isEnrolled });
});

router.post("/:id/enroll", verifyToken, rateLimit({ capacity: 10, refillPerSec: 0.5 }), async (req, res) => {
  try {
    await enrollmentService.enroll(req.user.uid, req.params.id);
    res.render("partials/enroll-success", { courseId: req.params.id, layout: false });
  } catch (err) {
    res.status(400).render("partials/toast-error", { message: err.message, layout: false });
  }
});

export { router as coursesRouter };
