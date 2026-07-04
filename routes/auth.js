import { Router } from "express";
import { auth } from "../config/firebase-admin.js";
import { db, COL } from "../config/firestore.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

// POST /auth/session — exchange ID token for HttpOnly session cookie
router.post("/session", async (req, res) => {
  try {
    const idToken = req.body.idToken;
    if (!idToken) return res.status(400).json({ error: "idToken required" });

    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 days
    const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn });

    res.cookie("fb_token", sessionCookie, {
      maxAge: expiresIn,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(401).json({ error: "Invalid ID token" });
  }
});

// POST /auth/register
router.post("/register", async (req, res) => {
  const { email, password, displayName, role } = req.body;
  try {
    const userRecord = await auth.createUser({ email, password, displayName });

    const assignedRole = role === "instructor" && process.env.ALLOW_INSTRUCTOR_SELF_SIGNUP === "true"
      ? "instructor" : "student";

    await auth.setCustomUserClaims(userRecord.uid, { role: assignedRole });
    await db.collection(COL.USERS).doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role: assignedRole,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    res.json({ ok: true, uid: userRecord.uid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("fb_token", { path: "/" });
  res.json({ ok: true });
});

// POST /auth/password-reset
router.post("/password-reset", async (req, res) => {
  try {
    const link = await auth.generatePasswordResetLink(req.body.email);
    res.json({
      ok: true,
      devLink: process.env.NODE_ENV !== "production" ? link : undefined
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /auth/me — HTMX widget refresh
router.get("/me", verifyToken, (req, res) => {
  res.render("partials/user-widget", { user: req.user, layout: false });
});

export { router as authRouter };
