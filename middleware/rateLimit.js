const buckets = new Map();

export function rateLimit({ capacity = 30, refillPerSec = 1 } = {}) {
  return (req, res, next) => {
    const key = (req.user?.uid || req.ip) + ":" + req.route?.path;
    const now = Date.now();
    const b   = buckets.get(key) || { tokens: capacity, last: now };
    const refill = ((now - b.last) / 1000) * refillPerSec;
    b.tokens  = Math.min(capacity, b.tokens + refill);
    b.last    = now;
    if (b.tokens < 1) {
      return res.status(429).render("partials/toast-error", {
        message: "You're going a bit fast — try again in a moment.",
        layout: false
      });
    }
    b.tokens -= 1;
    buckets.set(key, b);
    next();
  };
}
