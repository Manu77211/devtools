export class AppError extends Error {
  constructor(statusCode, detail) {
    super(typeof detail === "string" ? detail : "request_failed");
    this.name = "AppError";
    this.statusCode = statusCode;
    this.detail = detail;
  }
}

export function createError(statusCode, error, detail) {
  return new AppError(statusCode, { error, code: statusCode, detail });
}

function normalizePayload(statusCode, detail) {
  if (
    detail &&
    typeof detail === "object" &&
    "error" in detail &&
    "code" in detail &&
    "detail" in detail
  ) {
    return {
      error: String(detail.error),
      code: Number(detail.code),
      detail: String(detail.detail)
    };
  }

  return {
    error: "request_failed",
    code: statusCode,
    detail: String(detail ?? "Unknown error")
  };
}

export function registerErrorHandlers(app) {
  app.use((req, res, next) => {
    if (!res.headersSent) {
      next(createError(404, "not_found", `Route not found: ${req.method} ${req.originalUrl}`));
      return;
    }
    next();
  });

  app.use((err, _req, res, _next) => {
    const statusCode = err instanceof AppError ? err.statusCode : 500;
    if (statusCode === 500) {
      const payload = {
        error: "internal_server_error",
        code: 500,
        detail: "Unexpected server error"
      };
      res.status(500).json(payload);
      return;
    }

    res.status(statusCode).json(normalizePayload(statusCode, err.detail ?? err.message));
  });
}