import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { AuthUser, Role } from "../../../shared/domain/types";
import type { AccessTokenService, PasswordHasher, TokenGenerator } from "../domain/ports";

/** bcrypt dipakai karena tidak butuh kompilasi native. Ganti ke argon2 kapan saja lewat port ini. */
export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds = 12) {}
  hash(plain: string) {
    return bcrypt.hash(plain, this.rounds);
  }
  verify(plain: string, hash: string) {
    return bcrypt.compare(plain, hash);
  }
}

export class JwtAccessTokenService implements AccessTokenService {
  constructor(private readonly secret: string, private readonly ttlMinutes: number) {}

  issue(user: AuthUser): string {
    return jwt.sign({ role: user.role }, this.secret, { subject: user.id, expiresIn: `${this.ttlMinutes}m` });
  }

  verify(token: string): AuthUser {
    const payload = jwt.verify(token, this.secret) as jwt.JwtPayload;
    return { id: String(payload.sub), role: payload.role as Role };
  }
}

/** Token acak 32 byte; yang disimpan di database hanya hash SHA-256-nya. */
export class CryptoTokenGenerator implements TokenGenerator {
  generate() {
    const token = randomBytes(32).toString("base64url");
    return { token, hash: this.hash(token) };
  }
  hash(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
