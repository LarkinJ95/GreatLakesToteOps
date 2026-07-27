export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
  toResponse(): Response {
    return Response.json({ error: { code: this.code, message: this.message } }, { status: this.status });
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") { super(401, "unauthorized", message); }
}
export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission for this action") { super(403, "forbidden", message); }
}
export class NotFoundError extends ApiError {
  constructor(entity = "Record") { super(404, "not_found", `${entity} not found`); }
}
export class ValidationError extends ApiError {
  constructor(message: string) { super(400, "validation_error", message); }
}
export class InvalidTransitionError extends ApiError {
  constructor(from: string, to: string) {
    super(409, "invalid_transition", `Transition from '${from}' to '${to}' is not allowed`);
  }
}
export class ConflictError extends ApiError {
  constructor(message = "The record was changed by someone else; reload and retry") {
    super(409, "version_conflict", message);
  }
}
export class StateConflictError extends ApiError {
  constructor(message: string) { super(409, "state_conflict", message); }
}

/** Wrap a route handler so ApiError subclasses become proper JSON responses. */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>,
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) return err.toResponse();
      console.error("Unhandled route error:", err);
      return Response.json(
        { error: { code: "internal_error", message: "An unexpected error occurred" } },
        { status: 500 },
      );
    }
  };
}
