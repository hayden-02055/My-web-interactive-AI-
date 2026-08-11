// Mirrors api/app/schemas — see docs/sdd/SDD-00-foundation.md §6.5.
// Backend wire format is snake_case; keep this file in sync by hand (no codegen, §6.5).

export type HealthResponse = {
  status: "ok";
};

export type ErrorCode =
  | "RATE_LIMITED"
  | "INVALID_REQUEST"
  | "AGENT_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";

export type ErrorResponse = {
  error: {
    code: ErrorCode;
    message: string;
    retry_after?: number;
  };
};
