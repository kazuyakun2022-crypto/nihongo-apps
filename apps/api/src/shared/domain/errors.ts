/**
 * Error domain. Lapisan domain dan application hanya melempar error ini,
 * lalu lapisan HTTP menerjemahkannya menjadi status code (lihat shared/http/errorHandler.ts).
 */
export type ErrorCode =
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "LOCKED"
  | "QUOTA_EXCEEDED";

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  validation: (message: string, details?: unknown) => new AppError("VALIDATION", message, details),
  unauthorized: (message = "Silakan masuk terlebih dahulu.") => new AppError("UNAUTHORIZED", message),
  forbidden: (message = "Kamu tidak punya akses ke fitur ini.") => new AppError("FORBIDDEN", message),
  notFound: (what: string) => new AppError("NOT_FOUND", `${what} tidak ditemukan.`),
  conflict: (message: string) => new AppError("CONFLICT", message),
  locked: (message: string, until: Date) => new AppError("LOCKED", message, { until: until.toISOString() }),
  quota: (message: string) => new AppError("QUOTA_EXCEEDED", message),
};
