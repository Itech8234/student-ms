export class HttpError extends Error {
  constructor(status, code, message, meta) {
    super(message);
    this.status = status;
    this.code   = code;
    this.meta   = meta;
  }
  static badRequest(msg, meta)            { return new HttpError(400, "bad_request",  msg, meta); }
  static unauthorized(msg = "Sign in required") { return new HttpError(401, "unauthorized", msg); }
  static forbidden(msg = "Not allowed")   { return new HttpError(403, "forbidden", msg); }
  static notFound(msg = "Not found")      { return new HttpError(404, "not_found", msg); }
  static conflict(msg)                    { return new HttpError(409, "conflict", msg); }
  static server(msg = "Something went wrong") { return new HttpError(500, "server_error", msg); }
}
