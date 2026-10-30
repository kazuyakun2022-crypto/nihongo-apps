import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser, requireRole } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type {
  ChangeUserRole,
  GetSystemStats,
  GrantSubscription,
  ListAiLevelPrompts,
  ListAuditLogs,
  SearchUsers,
  SuspendUser,
  UnsuspendUser,
  UpdateAiLevelPrompt,
} from "../application/UserAdminUseCases";

const roles = ["guest", "student", "premium", "teacher", "admin", "super_admin"] as const;
const statuses = ["active", "suspended", "pending_deletion"] as const;
const furiganaRules = ["full", "hard_only", "none"] as const;

export interface AdminControllers {
  search: SearchUsers;
  changeRole: ChangeUserRole;
  suspend: SuspendUser;
  unsuspend: UnsuspendUser;
  stats: GetSystemStats;
  auditLogs: ListAuditLogs;
  aiPrompts: {
    list: ListAiLevelPrompts;
    update: UpdateAiLevelPrompt;
  };
  subscription: GrantSubscription;
}

export function adminRoutes(uc: AdminControllers) {
  const r = Router();

  // ── 1. Metrik & Statistik Sistem ──
  r.get("/stats", asyncHandler(async (_req, res) => {
    res.json(await uc.stats.execute());
  }));

  // ── 2. Manajemen Pengguna ──
  r.get("/users", asyncHandler(async (req, res) => {
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

  r.patch("/users/:userId/role", asyncHandler(async (req, res) => {
    const { role } = parseBody(z.object({ role: z.enum(roles) }), req.body);
    await uc.changeRole.execute(currentUser(req), req.params.userId, role);
    res.status(204).end();
  }));

  r.post("/users/:userId/suspend", asyncHandler(async (req, res) => {
    const { reason } = parseBody(z.object({ reason: z.string().trim().min(3) }), req.body);
    await uc.suspend.execute(currentUser(req), req.params.userId, reason);
    res.status(204).end();
  }));

  r.post("/users/:userId/unsuspend", asyncHandler(async (req, res) => {
    await uc.unsuspend.execute(currentUser(req), req.params.userId);
    res.status(204).end();
  }));

  // ── 3. Audit Log (Eksklusif Super Admin) ──
  r.get("/audit-logs", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const q = parseBody(
      z.object({
        page: z.coerce.number().int().min(1).default(1),
        pageSize: z.coerce.number().int().min(1).max(100).default(20),
        action: z.string().optional(),
      }),
      req.query,
    );
    res.json(await uc.auditLogs.execute(q));
  }));

  // ── 4. Konfigurasi AI Level Prompts ──
  r.get("/ai-prompts", asyncHandler(async (_req, res) => {
    res.json(await uc.aiPrompts.list.execute());
  }));

  r.put("/ai-prompts/:levelId", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const levelId = parseInt(req.params.levelId, 10);
    const body = parseBody(
      z.object({
        systemPrompt: z.string().min(5),
        // 0 = tanpa batas panjang kalimat
        maxSentenceWords: z.number().int().min(0).max(100),
        furiganaRule: z.enum(furiganaRules),
        speechRate: z.number().min(0.5).max(2.0),
      }),
      req.body,
    );
    await uc.aiPrompts.update.execute(currentUser(req), levelId, body);
    res.status(204).end();
  }));

  // ── 5. Manual Grant Premium Subscription (Eksklusif Super Admin) ──
  r.post("/subscriptions/grant", requireRole("super_admin"), asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        userId: z.string().uuid(),
        durationDays: z.number().int().min(1).max(3650),
        reason: z.string().min(3),
      }),
      req.body,
    );
    await uc.subscription.execute(currentUser(req), body.userId, body.durationDays, body.reason);
    res.status(204).end();
  }));

  return r;
}

export const adminUserRoutes = adminRoutes;
