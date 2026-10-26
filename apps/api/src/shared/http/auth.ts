import type { NextFunction, Request, Response } from "express";
import { Errors } from "../domain/errors";
import type { AuthUser, Role } from "../domain/types";

/** Port kecil agar middleware tidak bergantung pada implementasi JWT. */
export interface AccessTokenVerifier {
  verify(token: string): AuthUser;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function requireAuth(verifier: AccessTokenVerifier) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    if (!header?.startsWith("Bearer ")) return next(Errors.unauthorized());
    try {
      req.user = verifier.verify(header.slice("Bearer ".length));
      next();
    } catch {
      next(Errors.unauthorized("Sesi berakhir. Silakan masuk lagi."));
    }
  };
}

/** Pengecekan role di setiap endpoint, bukan hanya di tampilan (dokumen 10.6). */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(Errors.unauthorized());
    if (req.user.role === "super_admin" || roles.includes(req.user.role)) {
      return next();
    }
    next(Errors.forbidden());
  };
}

export function currentUser(req: Request): AuthUser {
  if (!req.user) throw Errors.unauthorized();
  return req.user;
}
