import { Router } from "express";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import type { Db } from "../../../shared/infrastructure/prisma";
import { ACHIEVEMENTS } from "../domain/achievements";
import { visibleStreak } from "../domain/streak";
import type { PrismaActivityRecorder } from "../infrastructure/PrismaActivityRecorder";

export function progressRoutes(db: Db, recorder: PrismaActivityRecorder) {
  const r = Router();

  // GET /api/progress: streak, XP, dan semua lencana (yang sudah dan belum didapat)
  r.get("/", asyncHandler(async (req, res) => {
    const user = currentUser(req);
    await recorder.catalog();
    const [me, owned] = await Promise.all([
      db.user.findUnique({ where: { id: user.id }, select: { streakCount: true, lastActiveDate: true, xpTotal: true } }),
      db.userAchievement.findMany({ where: { userId: user.id }, select: { earnedAt: true, achievement: { select: { code: true } } } }),
    ]);
    const earnedAt = new Map(owned.map((o) => [o.achievement.code, o.earnedAt]));
    res.json({
      streak: me ? visibleStreak(me.streakCount, me.lastActiveDate, new Date()) : 0,
      xpTotal: me?.xpTotal ?? 0,
      achievements: ACHIEVEMENTS.map((a) => ({
        code: a.code,
        name: a.name,
        description: a.description,
        earnedAt: earnedAt.get(a.code)?.toISOString() ?? null,
      })),
    });
  }));

  return r;
}
