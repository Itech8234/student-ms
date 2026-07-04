import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import { enrollmentService } from "../services/enrollmentService.js";

const router = Router();

router.get("/mine", verifyToken, async (req, res) => {
  const items = await enrollmentService.listForUser(req.user.uid);
  res.render("partials/my-enrollments", { items, layout: false });
});

export { router as enrollmentsRouter };
