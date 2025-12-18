import { NextResponse } from "next/server";
import { ApiError, toApiError } from "./errors";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T) {
  return NextResponse.json(data, { status: 201 });
}

export function jsonError(err: unknown) {
  const e = toApiError(err);
  return NextResponse.json(
    {
      error: {
        code: e.code,
        message: e.message,
        details: e.details ?? null
      }
    },
    { status: e.status }
  );
}

export function validationError(details: unknown) {
  return new ApiError(400, "VALIDATION_ERROR", "Validation error", details);
}
