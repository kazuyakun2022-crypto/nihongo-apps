import type { Db } from "../../../shared/infrastructure/prisma";
import type { Clock } from "../../../shared/domain/types";
import { ACHIEVEMENTS, candidatesFor, type ProgressStat } from "../domain/achievements";
import type { ActivityKind, ActivityRecorder, ActivityResult, EarnedAchievement } from "../domain/activity";
import { dbDateFromDay, nextStreak } from "../domain/streak";
import type { Notifier } from "../../notifications/domain/types";

/** SRS dianggap dikuasai bila jeda ulangnya sudah 3 minggu. */
const SRS_MASTERED_DAYS = 21;

export class PrismaActivityRecorder implements ActivityRecorder {
  private catalogSynced: Promise<Map<string, number>> | null = null;

  constructor(private readonly db: Db, private readonly clock: Clock, private readonly notifier?: Notifier) {}

  async record(userId: string, kind: ActivityKind, xp: number): Promise<ActivityResult> {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { streakCount: true, lastActiveDate: true, role: true } });
    // Admin tidak belajar; akun yang sudah dihapus juga diabaikan
    if (!user || user.role === "admin" || user.role === "super_admin") {
      return { xpEarned: 0, xpTotal: 0, streak: 0, newAchievements: [] };
    }

    const { streak, today } = nextStreak(user.streakCount, user.lastActiveDate, this.clock.now());
    const updated = await this.db.user.update({
      where: { id: userId },
      data: { streakCount: streak, lastActiveDate: dbDateFromDay(today), xpTotal: { increment: Math.max(0, xp) } },
      select: { xpTotal: true },
    });

    let newAchievements: EarnedAchievement[] = [];
    try {
      newAchievements = await this.awardAchievements(userId, kind, { streak, xp: updated.xpTotal });
    } catch (err) {
      // Lencana tidak boleh menggagalkan kuis atau ujian yang sudah tersimpan
      console.error("[progress] gagal memberi lencana", err instanceof Error ? err.message : err);
    }

    if (newAchievements.length && this.notifier) {
      await Promise.all(
        newAchievements.map((achievement) =>
          this.notifier!.notify(userId, {
            type: "achievement",
            title: `Lencana baru: ${achievement.name}`,
            body: achievement.description ?? "Kamu membuka lencana baru. Cek profil untuk melihat koleksimu.",
            url: "/profil",
            metadata: { achievementCode: achievement.code },
            dedupeKey: `achievement:${userId}:${achievement.code}`,
          }).catch((err) => {
            console.error("[notifications] gagal membuat notifikasi lencana", err instanceof Error ? err.message : err);
          }),
        ),
      );
    }

    return { xpEarned: Math.max(0, xp), xpTotal: updated.xpTotal, streak, newAchievements };
  }

  /** Sinkronkan katalog lencana ke tabel sekali per proses, lalu kembalikan peta code -> id. */
  catalog(): Promise<Map<string, number>> {
    this.catalogSynced ??= (async () => {
      const ids = new Map<string, number>();
      for (const a of ACHIEVEMENTS) {
        const row = await this.db.achievement.upsert({
          where: { code: a.code },
          create: { code: a.code, name: a.name, description: a.description },
          update: { name: a.name, description: a.description },
          select: { id: true },
        });
        ids.set(a.code, row.id);
      }
      return ids;
    })().catch((err) => {
      this.catalogSynced = null;
      throw err;
    });
    return this.catalogSynced;
  }

  private async awardAchievements(userId: string, kind: ActivityKind, known: { streak: number; xp: number }) {
    const ids = await this.catalog();
    const owned = await this.db.userAchievement.findMany({ where: { userId }, select: { achievement: { select: { code: true } } } });
    const candidates = candidatesFor(kind, new Set(owned.map((o) => o.achievement.code)));
    if (!candidates.length) return [];

    const stats = new Map<ProgressStat, number>([["streak", known.streak], ["xp", known.xp]]);
    // Pemeriksaan tulisan yang sempurna tidak meninggalkan catatan masalah, jadi aktivitas ini sendiri yang dihitung
    if (kind === "handwriting") stats.set("handwritingChecks", 1);
    const statOf = async (stat: ProgressStat) => {
      if (!stats.has(stat)) stats.set(stat, await this.countStat(userId, stat));
      return stats.get(stat)!;
    };

    const earned: EarnedAchievement[] = [];
    for (const a of candidates) {
      if ((await statOf(a.stat)) < a.min) continue;
      const achievementId = ids.get(a.code);
      if (!achievementId) continue;
      const created = await this.db.userAchievement.createMany({ data: [{ userId, achievementId }], skipDuplicates: true });
      if (created.count) earned.push({ code: a.code, name: a.name, description: a.description });
    }
    return earned;
  }

  private countStat(userId: string, stat: ProgressStat): Promise<number> {
    const db = this.db;
    switch (stat) {
      case "chaptersCompleted":
        return db.userChapterProgress.count({ where: { userId, status: "completed" } });
      case "conversationsDone":
        return db.conversationSession.count({ where: { userId, endedAt: { not: null }, turnCount: { gt: 0 } } });
      case "srsMastered":
        return db.srsCard.count({ where: { userId, intervalDays: { gte: SRS_MASTERED_DAYS } } });
      case "masteryGatePassed":
        return db.examAttempt.count({ where: { userId, type: "level_up", passed: true, details: { path: ["masteryGate"], equals: true } } });
      case "levelUpPassed":
        return db.examAttempt.count({ where: { userId, type: "level_up", passed: true } });
      case "jlptSimPassed":
        return db.examAttempt.count({ where: { userId, type: "jlpt_sim", passed: true } });
      case "workbookPassed":
        return db.examAttempt.count({ where: { userId, type: "workbook", passed: true } });
      case "streak":
      case "xp":
      case "handwritingChecks":
        return Promise.resolve(0);
    }
  }
}
