import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { progressService } from "../services/progressService.js";
import { rateLimit } from "../middleware/rateLimit.js";

const router = Router();

// POST /progress/complete — emits OOB swaps for button + sidebar progress
router.post("/complete", verifyToken, rateLimit({ capacity: 60, refillPerSec: 2 }), async (req, res) => {
  const { courseId, moduleId, lessonId } = req.body;
  try {
    const { progressPct } = await progressService.markComplete({
      userId: req.user.uid, courseId, moduleId, lessonId
    });

    // 1) Lesson button (primary swap target)
    res.write(`<div id="progress-${lessonId}" hx-swap-oob="outerHTML">
      <div class="flex items-center gap-2 text-sm text-emerald-700">
        <svg class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fill-rule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-7 7a1 1 0 01-1.4 0l-3-3a1 1 0 011.4-1.4L9 11.6l6.3-6.3a1 1 0 011.4 0z" clip-rule="evenodd"/>
        </svg>
        Completed · Course ${progressPct}%
      </div>
    </div>`);

    // 2) Sidebar progress bar
    res.write(`<progress
        id="course-progress"
        data-progress-bar
        hx-swap-oob="outerHTML"
        class="w-full h-1.5"
        value="${progressPct}"
        max="100"
        aria-label="Overall course progress"></progress>`);

    // 3) Sidebar progress label
    res.write(`<span data-progress-label hx-swap-oob="true">${progressPct}%</span>`);

    res.end();
  } catch (err) {
    res.status(400).render("partials/toast-error", { message: err.message, layout: false });
  }
});

export { router as progressRouter };
