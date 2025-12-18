import { ApiError, type ApiErrorCode } from "./ApiError";

export { ApiError, ApiErrorCode };

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;

  if (typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === "UNAUTHORIZED") {
    return new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  }

  return new ApiError(500, "INTERNAL_ERROR", "Internal error");
}

export function unauthorized(message = "Unauthorized", details?: unknown) {
  return new ApiError(401, "UNAUTHORIZED", message, details);
}

export function forbidden(message = "Forbidden", details?: unknown) {
  return new ApiError(403, "FORBIDDEN", message, details);
}

export function validationError(details: unknown) {
  return new ApiError(400, "VALIDATION_ERROR", "Validation error", details);
}

export function notFound(message = "Not found", details?: unknown) {
  return new ApiError(404, "NOT_FOUND", message, details);
}

export function conflict(message = "Conflict", details?: unknown) {
  return new ApiError(409, "CONFLICT", message, details);
}
