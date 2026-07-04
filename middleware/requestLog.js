export function requestLog(req, res, next) {
  const start = Date.now();
  res.on("finish", () => {
    console.log(JSON.stringify({
      severity: res.statusCode >= 500 ? "ERROR" : "INFO",
      time: new Date().toISOString(),
      msg: "request",
      httpRequest: {
        requestMethod: req.method,
        requestUrl:    req.originalUrl,
        status:        res.statusCode
      },
      ms:  Date.now() - start,
      uid: req.user?.uid,
      hx:  req.headers["hx-request"] === "true"
    }));
  });
  next();
}
