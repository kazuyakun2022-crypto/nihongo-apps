import type { ErrorRequestHandler } from "express";
import { AppError, type ErrorCode } from "../domain/errors";

const statusByCode: Record<ErrorCode, number> = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  LOCKED: 423,
  QUOTA_EXCEEDED: 429,
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(statusByCode[err.code]).json({ error: { code: err.code, message: err.message, details: err.details } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: "INTERNAL", message: "Terjadi kesalahan di server. Coba lagi sebentar lagi." } });
};
