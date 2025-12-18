export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: ApiErrorCode;
  public readonly details?: unknown;

  constructor(status: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toApiError(e: unknown): ApiError {
  if (e instanceof ApiError) return e;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyE = e as any;
  if (anyE?.code === "UNAUTHORIZED") return new ApiError(401, "UNAUTHORIZED", "Unauthorized");
  return new ApiError(500, "INTERNAL_ERROR", "Internal error");
}
