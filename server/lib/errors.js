export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function errorResponse(error) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {})
        }
      }
    };
  }

  if (error?.name === "ZodError") {
    return {
      status: 400,
      body: {
        error: {
          code: "INVALID_REQUEST",
          message: "The request did not pass validation.",
          details: error.issues
        }
      }
    };
  }

  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR",
        message: "The server could not complete the request."
      }
    }
  };
}
