import { auth } from "../config/firebase-admin.js";
import { db, COL } from "../config/firestore.js";

/**
 * Reads a Firebase ID token from either:
 *   - cookie "fb_token" (preferred for SSR)
 *   - Authorization: Bearer header (HTMX fallback)
 * On success, attaches `req.user = { uid, email, role, profile }`.
 */
export async function verifyToken(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).render("partials/auth-required", { layout: false });
    }

    const decoded = await auth.verifyIdToken(token);
    const profile = await loadProfile(decoded.uid);

    req.user = {
      uid:    decoded.uid,
      email:  decoded.email,
      role:   decoded.role || profile?.role || "student",
      profile
    };
    next();
  } catch (err) {
    console.error("[verifyToken]", err.message);
    return res.status(401).render("partials/auth-required", { layout: false });
  }
}

function extractToken(req) {
  if (req.cookies?.fb_token) return req.cookies.fb_token;
  const h = req.headers.authorization;
  if (h?.startsWith("Bearer ")) return h.slice(7);
  return null;
}

async function loadProfile(uid) {
  const snap = await db.collection(COL.USERS).doc(uid).get();
  return snap.exists ? { id: snap.id, ...snap.data() } : null;
}

// ---------- Role gates ----------
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).render("partials/auth-required", { layout: false });
  }
  if (!roles.includes(req.user.role)) {
    return res.status(403).render("partials/forbidden", { layout: false });
  }
  next();
};
