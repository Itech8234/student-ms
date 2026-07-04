export function noCacheForHtmx(req, res, next) {
  if (req.headers["hx-request"] === "true") {
    res.set("Cache-Control", "private, no-store");
  }
  next();
}
