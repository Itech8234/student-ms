import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authRouter }        from "./routes/auth.js";
import { pagesRouter }       from "./routes/pages.js";
import { coursesRouter }     from "./routes/courses.js";
import { lessonsRouter }     from "./routes/lessons.js";
import { enrollmentsRouter } from "./routes/enrollments.js";
import { instructorRouter }  from "./routes/instructor.js";
import { progressRouter }    from "./routes/progress.js";
import { verifyToken }       from "./middleware/verifyToken.js";
import { errorHandler }      from "./middleware/errorHandler.js";
import { requestLog }        from "./middleware/requestLog.js";
import { noCacheForHtmx }    from "./middleware/cacheControl.js";
import { rateLimit }         from "./middleware/rateLimit.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app  = express();
const PORT = process.env.PORT || 3000;

// ---------- View engine ----------
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// ---------- Middleware ----------
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", "https://www.gstatic.com"],
      styleSrc:   ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc:    ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      imgSrc:     ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.googleapis.com", "https://identitytoolkit.googleapis.com"]
    }
  }
}));
app.use(compression());
app.use(express.urlencoded({ extended: true, limit: "2mb" }));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser(process.env.SESSION_SECRET));
app.use(requestLog);
app.use(noCacheForHtmx);

// Origin / CSRF guard for state-changing requests
app.use((req, res, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const origin = req.headers.origin;
    const allowed = (process.env.ALLOWED_ORIGIN || `http://localhost:${PORT}`).split(",");
    if (origin && !allowed.includes(origin)) {
      return res.status(403).json({ error: "bad origin" });
    }
  }
  next();
});

// Static assets
app.use("/static", express.static(path.join(__dirname, "public"), {
  maxAge: "7d",
  etag: true
}));

// Inject currentUser into every view (null if not signed in)
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.activeNav   = req.path.split("/")[1] || "home";
  next();
});

// ---------- Routes ----------
app.get("/healthz", async (req, res) => {
  try {
    const { db } = await import("./config/firebase-admin.js");
    await db.collection("_health").doc("ping").get();
    res.json({ ok: true, ts: Date.now() });
  } catch {
    res.status(503).json({ ok: false });
  }
});

app.use("/auth",        authRouter);
app.use("/",            pagesRouter);
app.use("/courses",     coursesRouter);
app.use("/lessons",     lessonsRouter);
app.use("/enrollments", enrollmentsRouter);
app.use("/progress",    progressRouter);
app.use("/instructor",  instructorRouter);

// 404
app.use((req, res) => {
  res.status(404).render("pages/404", { error: { status: 404, code: "not_found", message: "Page not found" } });
});

// Centralized error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 LMS server live on http://localhost:${PORT}`);
});
