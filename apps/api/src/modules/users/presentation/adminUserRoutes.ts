import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { ChangeUserRole, SearchUsers, SuspendUser } from "../application/UserAdminUseCases";

const roles = ["guest", "student", "premium", "teacher", "admin"] as const;
const statuses = ["active", "suspended", "pending_deletion"] as const;

export function adminUserRoutes(uc: { search: SearchUsers; changeRole: ChangeUserRole; suspend: SuspendUser }) {
  const r = Router();

  r.get("/", asyncHandler(async (req, res) => {
    const q = parseBody(
      z.object({
        q: z.string().optional(),
        role: z.enum(roles).optional(),
        status: z.enum(statuses).optional(),
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
      }),
      req.query,
    );
    res.json(await uc.search.execute(q));
  }));

  r.patch("/:userId/role", asyncHandler(async (req, res) => {
    const { role } = parseBody(z.object({ role: z.enum(roles) }), req.body);
    await uc.changeRole.execute(currentUser(req), req.params.userId, role);
    res.status(204).end();
  }));

  r.post("/:userId/suspend", asyncHandler(async (req, res) => {
    const { reason } = parseBody(z.object({ reason: z.string().trim().min(3) }), req.body);
    await uc.suspend.execute(currentUser(req), req.params.userId, reason);
    res.status(204).end();
  }));

  return r;
}
