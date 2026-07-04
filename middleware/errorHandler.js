import { HttpError } from "../utils/HttpError.js";

export function errorHandler(err, req, res, next) {
  const isHtmx  = req.headers["hx-request"] === "true";
  const status  = err.status || 500;
  const code    = err.code   || "server_error";
  const message = (status < 500 ? err.message : "Something went wrong");

  if (status >= 500) {
    console.error("[ERR]", { url: req.originalUrl, err });
  }

  if (isHtmx) {
    res.status(status).send(buildHtmxErrorPayload(message, code, status));
    return;
  }

  res.status(status).render(status === 404 ? "pages/404" : "pages/error", {
    error: { status, code, message }
  });
}

function buildHtmxErrorPayload(message, code, status) {
  return `<script>
    window.dispatchEvent(new CustomEvent("lms:error", {
      detail: { message: ${JSON.stringify(message)}, code: ${JSON.stringify(code)}, status: ${status} }
    }));
    window.showToast(${JSON.stringify(message)}, "error");
  </script>`;
}
