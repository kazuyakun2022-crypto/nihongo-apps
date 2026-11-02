import { Router } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { Errors } from "../../shared/domain/errors";
import { asyncHandler } from "../../shared/http/asyncHandler";
import { currentUser } from "../../shared/http/auth";
import { parseBody } from "../../shared/http/validate";
import { prisma } from "../../shared/infrastructure/prisma";

/**
 * Pemantauan belajar seluruh pengguna (dipasang di /api/admin/learners, khusus super admin).
 * "Pelajar" = akun terdaftar ber-role student atau premium. Progres level = bab terbit yang selesai
 * di level yang sedang ditempati dibanding seluruh bab terbit di level itu.
 */

const LEARNER = Prisma.sql`u.is_guest = false AND u.role IN ('student', 'premium')`;
const DAY_MS = 86_400_000;

const listQuery = z.object({
  q: z.string().trim().max(100).optional(),
  levelId: z.union([z.literal("none"), z.coerce.number().int().min(1)]).optional(),
  activity: z.enum(["today", "7d", "30d", "inactive7", "inactive30", "never"]).optional(),
  plan: z.enum(["premium", "free"]).optional(),
  status: z.enum(["active", "suspended", "pending_deletion"]).optional(),
  sort: z.enum(["lastActive", "xp", "streak", "progress", "chapters", "level", "newest", "name", "score"]).default("lastActive"),
  order: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
type ListQuery = z.infer<typeof listQuery>;

const SORTS: Record<ListQuery["sort"], string> = {
  lastActive: "u.last_active_date",
  xp: "u.xp_total",
  streak: "u.streak_count",
  progress: "level_progress",
  chapters: "chapters_done",
  level: "l.sort_order",
  newest: "u.created_at",
  name: "LOWER(u.display_name)",
  score: "avg_score",
};

interface LearnerRow {
  id: string;
  display_name: string;
  email: string | null;
  role: string;
  status: string;
  avatar_url: string | null;
  level_id: number | null;
  level_code: string | null;
  level_name: string | null;
  pending_code: string | null;
  xp_total: number;
  streak_count: number;
  last_active_date: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  level_done: number;
  level_total: number;
  level_progress: number;
  chapters_done: number;
  avg_score: number | null;
  exams_taken: number;
  exams_passed: number;
  conversations: number;
  achievements: number;
  is_premium: boolean;
  total_count: number;
}

function listWhere(q: ListQuery): Prisma.Sql {
  const parts: Prisma.Sql[] = [LEARNER];
  if (q.q) {
    const like = `%${q.q}%`;
    parts.push(Prisma.sql`(u.display_name ILIKE ${like} OR u.email ILIKE ${like})`);
  }
  if (q.levelId === "none") parts.push(Prisma.sql`u.current_level_id IS NULL`);
  else if (q.levelId) parts.push(Prisma.sql`u.current_level_id = ${q.levelId}`);
  if (q.status) parts.push(Prisma.sql`u.status::text = ${q.status}`);
  if (q.plan === "premium") parts.push(Prisma.sql`(u.role = 'premium' OR sub.user_id IS NOT NULL)`);
  if (q.plan === "free") parts.push(Prisma.sql`(u.role <> 'premium' AND sub.user_id IS NULL)`);
  switch (q.activity) {
    case "today":
      parts.push(Prisma.sql`u.last_active_date >= CURRENT_DATE`);
      break;
    case "7d":
      parts.push(Prisma.sql`u.last_active_date >= CURRENT_DATE - 6`);
      break;
    case "30d":
      parts.push(Prisma.sql`u.last_active_date >= CURRENT_DATE - 29`);
      break;
    case "inactive7":
      parts.push(Prisma.sql`u.last_active_date < CURRENT_DATE - 7`);
      break;
    case "inactive30":
      parts.push(Prisma.sql`u.last_active_date < CURRENT_DATE - 30`);
      break;
    case "never":
      parts.push(Prisma.sql`u.last_active_date IS NULL`);
      break;
  }
  return Prisma.join(parts, " AND ");
}

export async function queryLearners(q: ListQuery, limit: number, offset: number) {
  const dir = q.order === "asc" ? "ASC" : "DESC";
  const orderBy = Prisma.raw(`${SORTS[q.sort]} ${dir} NULLS LAST, u.id`);
  const rows = await prisma.$queryRaw<LearnerRow[]>`
    WITH pub AS (
      SELECT level_id, COUNT(*)::int AS total FROM chapters WHERE status = 'published' GROUP BY level_id
    ),
    done AS (
      SELECT p.user_id,
        COUNT(*) FILTER (WHERE p.status = 'completed')::int AS all_done,
        COUNT(*) FILTER (WHERE p.status = 'completed' AND c.status = 'published' AND c.level_id = u.current_level_id)::int AS level_done,
        (AVG(p.best_score) FILTER (WHERE p.best_score IS NOT NULL))::float AS avg_score
      FROM user_chapter_progress p
      JOIN chapters c ON c.id = p.chapter_id
      JOIN users u ON u.id = p.user_id
      GROUP BY p.user_id
    ),
    ex AS (
      SELECT user_id, COUNT(*)::int AS taken, (COUNT(*) FILTER (WHERE passed))::int AS passed FROM exam_attempts GROUP BY user_id
    ),
    cv AS (SELECT user_id, COUNT(*)::int AS sessions FROM conversation_sessions GROUP BY user_id),
    ach AS (SELECT user_id, COUNT(*)::int AS cnt FROM user_achievements GROUP BY user_id),
    sub AS (SELECT DISTINCT user_id FROM subscriptions WHERE status = 'active' AND expires_at > now())
    SELECT u.id, u.display_name, u.email, u.role::text AS role, u.status::text AS status, u.avatar_url,
      u.current_level_id AS level_id, l.code AS level_code, l.name AS level_name, pl.code AS pending_code,
      u.xp_total, u.streak_count, u.last_active_date, u.last_login_at, u.created_at,
      COALESCE(d.level_done, 0) AS level_done,
      COALESCE(pub.total, 0) AS level_total,
      CASE WHEN COALESCE(pub.total, 0) = 0 THEN 0
        ELSE LEAST(100, ROUND(100.0 * COALESCE(d.level_done, 0) / pub.total))::int END AS level_progress,
      COALESCE(d.all_done, 0) AS chapters_done,
      d.avg_score,
      COALESCE(ex.taken, 0) AS exams_taken,
      COALESCE(ex.passed, 0) AS exams_passed,
      COALESCE(cv.sessions, 0) AS conversations,
      COALESCE(ach.cnt, 0) AS achievements,
      (u.role = 'premium' OR sub.user_id IS NOT NULL) AS is_premium,
      (COUNT(*) OVER ())::int AS total_count
    FROM users u
    LEFT JOIN levels l ON l.id = u.current_level_id
    LEFT JOIN levels pl ON pl.id = u.pending_level_id
    LEFT JOIN pub ON pub.level_id = u.current_level_id
    LEFT JOIN done d ON d.user_id = u.id
    LEFT JOIN ex ON ex.user_id = u.id
    LEFT JOIN cv ON cv.user_id = u.id
    LEFT JOIN ach ON ach.user_id = u.id
    LEFT JOIN sub ON sub.user_id = u.id
    WHERE ${listWhere(q)}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}`;

  return {
    total: rows[0]?.total_count ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      displayName: r.display_name,
      email: r.email,
      role: r.role,
      status: r.status,
      avatarUrl: r.avatar_url,
      level: r.level_id ? { id: r.level_id, code: r.level_code, name: r.level_name } : null,
      pendingLevelCode: r.pending_code,
      xpTotal: r.xp_total,
      streakCount: r.streak_count,
      lastActiveDate: r.last_active_date,
      lastLoginAt: r.last_login_at,
      createdAt: r.created_at,
      levelChaptersDone: r.level_done,
      levelChaptersTotal: r.level_total,
      levelProgress: r.level_progress,
      chaptersCompleted: r.chapters_done,
      avgScore: r.avg_score === null ? null : Math.round(r.avg_score),
      examsTaken: r.exams_taken,
      examsPassed: r.exams_passed,
      conversations: r.conversations,
      achievements: r.achievements,
      isPremium: r.is_premium,
    })),
  };
}

const levelName = (code: string) => (code === "PEMULA" ? "Pemula" : code);

const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS);

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Deret harian `days` hari terakhir (UTC), hari tanpa data bernilai 0. */
function fillDays<T extends string>(days: number, rows: { day: Date; kind: T; n: number }[], kinds: readonly T[]) {
  const byDay = new Map<string, Record<T, number>>();
  for (let i = days - 1; i >= 0; i--) {
    byDay.set(dateKey(daysAgo(i)), Object.fromEntries(kinds.map((k) => [k, 0])) as Record<T, number>);
  }
  for (const r of rows) {
    const slot = byDay.get(dateKey(r.day));
    if (slot) slot[r.kind] = r.n;
  }
  return [...byDay].map(([date, counts]) => ({ date, ...counts }));
}

export async function overview() {
  const [totals] = await prisma.$queryRaw<
    {
      learners: number;
      premium: number;
      active_today: number;
      active7: number;
      active30: number;
      new7: number;
      no_level: number;
      avg_streak: number | null;
      max_streak: number | null;
      total_xp: number | null;
      avg_xp: number | null;
    }[]
  >`
    SELECT COUNT(*)::int AS learners,
      (COUNT(*) FILTER (WHERE u.role = 'premium' OR EXISTS (
        SELECT 1 FROM subscriptions s WHERE s.user_id = u.id AND s.status = 'active' AND s.expires_at > now())))::int AS premium,
      (COUNT(*) FILTER (WHERE u.last_active_date >= CURRENT_DATE))::int AS active_today,
      (COUNT(*) FILTER (WHERE u.last_active_date >= CURRENT_DATE - 6))::int AS active7,
      (COUNT(*) FILTER (WHERE u.last_active_date >= CURRENT_DATE - 29))::int AS active30,
      (COUNT(*) FILTER (WHERE u.created_at >= now() - interval '7 days'))::int AS new7,
      (COUNT(*) FILTER (WHERE u.current_level_id IS NULL))::int AS no_level,
      AVG(u.streak_count)::float AS avg_streak,
      MAX(u.streak_count)::int AS max_streak,
      SUM(u.xp_total)::float AS total_xp,
      AVG(u.xp_total)::float AS avg_xp
    FROM users u WHERE ${LEARNER}`;

  const [learning] = await prisma.$queryRaw<
    {
      chapters_done: number;
      chapters_done7: number;
      avg_score: number | null;
      exams: number;
      exams_passed: number;
      level_ups30: number;
      conversations: number;
      conversations7: number;
      voice_sessions: number;
      avg_turns: number | null;
      srs_cards: number;
      weak_cards: number;
      achievements: number;
    }[]
  >`
    SELECT
      (SELECT COUNT(*) FROM user_chapter_progress p JOIN users u ON u.id = p.user_id WHERE ${LEARNER} AND p.status = 'completed')::int AS chapters_done,
      (SELECT COUNT(*) FROM user_chapter_progress p JOIN users u ON u.id = p.user_id WHERE ${LEARNER} AND p.status = 'completed' AND p.completed_at >= now() - interval '7 days')::int AS chapters_done7,
      (SELECT AVG(p.best_score) FROM user_chapter_progress p JOIN users u ON u.id = p.user_id WHERE ${LEARNER} AND p.best_score IS NOT NULL)::float AS avg_score,
      (SELECT COUNT(*) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER})::int AS exams,
      (SELECT COUNT(*) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER} AND e.passed)::int AS exams_passed,
      (SELECT COUNT(*) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER} AND e.passed AND e.type = 'level_up' AND e.taken_at >= now() - interval '30 days')::int AS level_ups30,
      (SELECT COUNT(*) FROM conversation_sessions c JOIN users u ON u.id = c.user_id WHERE ${LEARNER})::int AS conversations,
      (SELECT COUNT(*) FROM conversation_sessions c JOIN users u ON u.id = c.user_id WHERE ${LEARNER} AND c.started_at >= now() - interval '7 days')::int AS conversations7,
      (SELECT COUNT(*) FROM conversation_sessions c JOIN users u ON u.id = c.user_id WHERE ${LEARNER} AND c.input_mode = 'voice')::int AS voice_sessions,
      (SELECT AVG(c.turn_count) FROM conversation_sessions c JOIN users u ON u.id = c.user_id WHERE ${LEARNER})::float AS avg_turns,
      (SELECT COUNT(*) FROM srs_cards s JOIN users u ON u.id = s.user_id WHERE ${LEARNER})::int AS srs_cards,
      (SELECT COUNT(*) FROM srs_cards s JOIN users u ON u.id = s.user_id WHERE ${LEARNER} AND s.is_weak)::int AS weak_cards,
      (SELECT COUNT(*) FROM user_achievements a JOIN users u ON u.id = a.user_id WHERE ${LEARNER})::int AS achievements`;

  const levels = await prisma.$queryRaw<
    {
      id: number;
      code: string;
      name: string;
      learners: number;
      pending: number;
      published: number;
      avg_progress: number | null;
      exams: number;
      exams_passed: number;
      avg_exam_score: number | null;
    }[]
  >`
    WITH pub AS (SELECT level_id, COUNT(*)::int AS total FROM chapters WHERE status = 'published' GROUP BY level_id),
    prog AS (
      SELECT u.id AS user_id, u.current_level_id AS level_id,
        COUNT(p.id) FILTER (WHERE p.status = 'completed' AND c.status = 'published' AND c.level_id = u.current_level_id) AS done
      FROM users u
      LEFT JOIN user_chapter_progress p ON p.user_id = u.id
      LEFT JOIN chapters c ON c.id = p.chapter_id
      WHERE ${LEARNER} AND u.current_level_id IS NOT NULL
      GROUP BY u.id
    )
    SELECT l.id, l.code, l.name,
      (SELECT COUNT(*) FROM users u WHERE ${LEARNER} AND u.current_level_id = l.id)::int AS learners,
      (SELECT COUNT(*) FROM users u WHERE ${LEARNER} AND u.pending_level_id = l.id)::int AS pending,
      COALESCE(pub.total, 0) AS published,
      (SELECT AVG(LEAST(100, 100.0 * prog.done / NULLIF(pub.total, 0))) FROM prog WHERE prog.level_id = l.id)::float AS avg_progress,
      (SELECT COUNT(*) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER} AND e.level_id = l.id AND e.type = 'level_up')::int AS exams,
      (SELECT COUNT(*) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER} AND e.level_id = l.id AND e.type = 'level_up' AND e.passed)::int AS exams_passed,
      (SELECT AVG(e.score) FROM exam_attempts e JOIN users u ON u.id = e.user_id WHERE ${LEARNER} AND e.level_id = l.id AND e.type = 'level_up')::float AS avg_exam_score
    FROM levels l
    LEFT JOIN pub ON pub.level_id = l.id
    ORDER BY l.sort_order`;

  const activityRows = await prisma.$queryRaw<{ day: Date; kind: "chapters" | "conversations" | "exams" | "signups" | "active"; n: number }[]>`
    SELECT date_trunc('day', p.completed_at) AS day, 'chapters' AS kind, COUNT(*)::int AS n
      FROM user_chapter_progress p JOIN users u ON u.id = p.user_id
      WHERE ${LEARNER} AND p.status = 'completed' AND p.completed_at >= CURRENT_DATE - 29 GROUP BY 1
    UNION ALL
    SELECT date_trunc('day', c.started_at), 'conversations', COUNT(*)::int
      FROM conversation_sessions c JOIN users u ON u.id = c.user_id
      WHERE ${LEARNER} AND c.started_at >= CURRENT_DATE - 29 GROUP BY 1
    UNION ALL
    SELECT date_trunc('day', e.taken_at), 'exams', COUNT(*)::int
      FROM exam_attempts e JOIN users u ON u.id = e.user_id
      WHERE ${LEARNER} AND e.taken_at >= CURRENT_DATE - 29 GROUP BY 1
    UNION ALL
    SELECT date_trunc('day', u.created_at), 'signups', COUNT(*)::int
      FROM users u WHERE ${LEARNER} AND u.created_at >= CURRENT_DATE - 29 GROUP BY 1`;

  const leaderboardSelect = {
    id: true,
    displayName: true,
    xpTotal: true,
    streakCount: true,
    lastActiveDate: true,
    currentLevel: { select: { code: true } },
  } as const;
  const learnerWhere: Prisma.UserWhereInput = { isGuest: false, role: { in: ["student", "premium"] } };
  const [topXp, topStreak, atRisk, recentLevelUps] = await Promise.all([
    prisma.user.findMany({ where: learnerWhere, select: leaderboardSelect, orderBy: { xpTotal: "desc" }, take: 5 }),
    prisma.user.findMany({ where: { ...learnerWhere, streakCount: { gt: 0 } }, select: leaderboardSelect, orderBy: { streakCount: "desc" }, take: 5 }),
    // Pernah belajar (punya XP) tapi sudah lebih dari 7 hari tidak aktif
    prisma.user.findMany({
      where: { ...learnerWhere, status: "active", xpTotal: { gt: 0 }, lastActiveDate: { lt: daysAgo(7) } },
      select: leaderboardSelect,
      orderBy: { xpTotal: "desc" },
      take: 8,
    }),
    prisma.examAttempt.findMany({
      where: { passed: true, type: "level_up", user: learnerWhere },
      select: {
        id: true,
        score: true,
        takenAt: true,
        level: { select: { code: true } },
        resultLevel: { select: { code: true } },
        user: { select: { id: true, displayName: true } },
      },
      orderBy: { takenAt: "desc" },
      take: 8,
    }),
  ]);

  const leader = (u: (typeof topXp)[number]) => ({
    id: u.id,
    displayName: u.displayName,
    levelCode: u.currentLevel?.code ?? null,
    xpTotal: u.xpTotal,
    streakCount: u.streakCount,
    lastActiveDate: u.lastActiveDate,
  });

  return {
    totals: {
      learners: totals.learners,
      premium: totals.premium,
      activeToday: totals.active_today,
      active7d: totals.active7,
      active30d: totals.active30,
      newThisWeek: totals.new7,
      withoutLevel: totals.no_level,
      avgStreak: Math.round((totals.avg_streak ?? 0) * 10) / 10,
      maxStreak: totals.max_streak ?? 0,
      totalXp: Math.round(totals.total_xp ?? 0),
      avgXp: Math.round(totals.avg_xp ?? 0),
      chaptersCompleted: learning.chapters_done,
      chaptersCompleted7d: learning.chapters_done7,
      avgChapterScore: learning.avg_score === null ? null : Math.round(learning.avg_score),
      examAttempts: learning.exams,
      examPassRate: learning.exams ? Math.round((100 * learning.exams_passed) / learning.exams) : null,
      levelUps30d: learning.level_ups30,
      conversations: learning.conversations,
      conversations7d: learning.conversations7,
      voiceConversations: learning.voice_sessions,
      avgTurns: Math.round((learning.avg_turns ?? 0) * 10) / 10,
      srsCards: learning.srs_cards,
      weakCards: learning.weak_cards,
      achievementsEarned: learning.achievements,
    },
    levels: levels.map((l) => ({
      id: l.id,
      code: l.code,
      name: l.name,
      learners: l.learners,
      pendingExam: l.pending,
      publishedChapters: l.published,
      avgProgress: l.avg_progress === null ? null : Math.round(l.avg_progress),
      levelUpAttempts: l.exams,
      levelUpPassed: l.exams_passed,
      passRate: l.exams ? Math.round((100 * l.exams_passed) / l.exams) : null,
      avgExamScore: l.avg_exam_score === null ? null : Math.round(l.avg_exam_score),
    })),
    daily: fillDays(30, activityRows, ["chapters", "conversations", "exams", "signups"] as const),
    topXp: topXp.map(leader),
    topStreak: topStreak.map(leader),
    atRisk: atRisk.map(leader),
    recentLevelUps: recentLevelUps.map((e) => ({
      id: e.id,
      userId: e.user.id,
      displayName: e.user.displayName,
      fromLevel: e.level.code,
      toLevel: e.resultLevel?.code ?? null,
      score: e.score,
      takenAt: e.takenAt,
    })),
  };
}

async function chapterProgress(userId: string, levelId: number) {
  const chapters = await prisma.chapter.findMany({
    where: { levelId, status: "published" },
    select: {
      id: true,
      title: true,
      moduleTitle: true,
      sortOrder: true,
      passScore: true,
      progress: { where: { userId }, select: { status: true, bestScore: true, completedAt: true } },
    },
    orderBy: { sortOrder: "asc" },
  });
  return chapters.map((c) => ({
    id: c.id,
    title: c.title,
    moduleTitle: c.moduleTitle,
    sortOrder: c.sortOrder,
    passScore: c.passScore ?? 70,
    status: c.progress[0]?.status ?? "locked",
    bestScore: c.progress[0]?.bestScore ?? null,
    completedAt: c.progress[0]?.completedAt ?? null,
  }));
}

export async function learnerDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      email: true,
      role: true,
      status: true,
      isGuest: true,
      gender: true,
      learningGoal: true,
      dailyTargetMin: true,
      avatarUrl: true,
      xpTotal: true,
      streakCount: true,
      lastActiveDate: true,
      lastLoginAt: true,
      emailVerifiedAt: true,
      createdAt: true,
      currentLevel: { select: { id: true, code: true, name: true, sortOrder: true } },
      pendingLevel: { select: { id: true, code: true, name: true } },
      subscriptions: { select: { plan: true, status: true, startedAt: true, expiresAt: true }, orderBy: { expiresAt: "desc" }, take: 1 },
    },
  });
  if (!user || user.isGuest) throw Errors.notFound("Pengguna");

  const [levels, perLevel, exams, conversations, convTotals, achievements, srs, memories, activityRows] = await Promise.all([
    prisma.level.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, code: true, name: true, sortOrder: true } }),
    prisma.$queryRaw<{ level_id: number; published: number; done: number; avg_score: number | null; last_done: Date | null }[]>`
      SELECT c.level_id,
        COUNT(*)::int AS published,
        (COUNT(p.id) FILTER (WHERE p.status = 'completed'))::int AS done,
        (AVG(p.best_score) FILTER (WHERE p.best_score IS NOT NULL))::float AS avg_score,
        MAX(p.completed_at) AS last_done
      FROM chapters c
      LEFT JOIN user_chapter_progress p ON p.chapter_id = c.id AND p.user_id = ${userId}::uuid
      WHERE c.status = 'published'
      GROUP BY c.level_id`,
    prisma.examAttempt.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        score: true,
        passed: true,
        sectionScores: true,
        startedAt: true,
        finishedAt: true,
        takenAt: true,
        level: { select: { id: true, code: true } },
        resultLevel: { select: { code: true } },
      },
      orderBy: { takenAt: "desc" },
      take: 40,
    }),
    prisma.conversationSession.findMany({
      where: { userId },
      select: {
        id: true,
        mode: true,
        inputMode: true,
        turnCount: true,
        pronunciationScore: true,
        summary: true,
        startedAt: true,
        endedAt: true,
        scenario: { select: { title: true } },
        level: { select: { code: true } },
      },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    prisma.conversationSession.aggregate({ where: { userId }, _count: { id: true }, _sum: { turnCount: true }, _avg: { pronunciationScore: true } }),
    prisma.achievement.findMany({
      select: { id: true, code: true, name: true, description: true, users: { where: { userId }, select: { earnedAt: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.$queryRaw<{ item_type: string; total: number; due: number; weak: number; mastered: number }[]>`
      SELECT item_type::text,
        COUNT(*)::int AS total,
        (COUNT(*) FILTER (WHERE due_date <= CURRENT_DATE))::int AS due,
        (COUNT(*) FILTER (WHERE is_weak))::int AS weak,
        (COUNT(*) FILTER (WHERE interval_days >= 21))::int AS mastered
      FROM srs_cards WHERE user_id = ${userId}::uuid GROUP BY item_type`,
    prisma.userMemory.findMany({ where: { userId }, select: { type: true, content: true, weight: true }, orderBy: { weight: "desc" }, take: 30 }),
    prisma.$queryRaw<{ day: Date; kind: "chapters" | "conversations" | "exams"; n: number }[]>`
      SELECT date_trunc('day', completed_at) AS day, 'chapters' AS kind, COUNT(*)::int AS n FROM user_chapter_progress
        WHERE user_id = ${userId}::uuid AND status = 'completed' AND completed_at >= CURRENT_DATE - 83 GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', started_at), 'conversations', COUNT(*)::int FROM conversation_sessions
        WHERE user_id = ${userId}::uuid AND started_at >= CURRENT_DATE - 83 GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', taken_at), 'exams', COUNT(*)::int FROM exam_attempts
        WHERE user_id = ${userId}::uuid AND taken_at >= CURRENT_DATE - 83 GROUP BY 1`,
  ]);

  const currentOrder = user.currentLevel?.sortOrder ?? 0;
  const byLevel = new Map(perLevel.map((r) => [r.level_id, r]));
  const journey = levels.map((l) => {
    const stats = byLevel.get(l.id);
    const levelExams = exams.filter((e) => e.level.id === l.id && e.type === "level_up");
    const passedExam = levelExams.find((e) => e.passed);
    return {
      id: l.id,
      code: l.code,
      name: l.name,
      state: l.sortOrder < currentOrder ? "passed" : l.sortOrder === currentOrder ? "current" : "locked",
      publishedChapters: stats?.published ?? 0,
      chaptersDone: stats?.done ?? 0,
      progress: stats?.published ? Math.min(100, Math.round((100 * stats.done) / stats.published)) : 0,
      avgScore: stats?.avg_score == null ? null : Math.round(stats.avg_score),
      lastCompletedAt: stats?.last_done ?? null,
      levelUpAttempts: levelExams.length,
      bestExamScore: levelExams.length ? Math.max(...levelExams.map((e) => e.score)) : null,
      passedAt: passedExam?.takenAt ?? null,
    };
  });

  const sub = user.subscriptions[0];
  const premiumActive = !!sub && sub.status === "active" && sub.expiresAt > new Date();

  const timeline: { at: Date; kind: "exam" | "conversation" | "achievement" | "chapter"; title: string; detail: string }[] = [
    ...exams.map((e) => ({
      at: e.takenAt,
      kind: "exam" as const,
      title: `${e.type === "level_up" ? "Ujian naik level" : e.type === "placement" ? "Tes penempatan" : "Simulasi JLPT"} ${levelName(e.level.code)}`,
      detail: `Nilai ${e.score} · ${e.passed ? "lulus" : "belum lulus"}${
        e.passed && e.resultLevel && e.resultLevel.code !== e.level.code ? ` → ${levelName(e.resultLevel.code)}` : ""
      }`,
    })),
    ...conversations.map((c) => ({
      at: c.startedAt,
      kind: "conversation" as const,
      title: c.scenario?.title ? `Skenario: ${c.scenario.title}` : `Ngobrol bebas (${c.inputMode === "voice" ? "suara" : "teks"})`,
      detail: `${c.turnCount} giliran · ${levelName(c.level.code)}`,
    })),
    ...achievements.flatMap((a) =>
      a.users[0] ? [{ at: a.users[0].earnedAt, kind: "achievement" as const, title: `Pencapaian: ${a.name}`, detail: a.description ?? "" }] : [],
    ),
  ];
  const recentChapters = await prisma.userChapterProgress.findMany({
    where: { userId, status: "completed", completedAt: { not: null } },
    select: { completedAt: true, bestScore: true, chapter: { select: { title: true, level: { select: { code: true } } } } },
    orderBy: { completedAt: "desc" },
    take: 20,
  });
  for (const p of recentChapters) {
    timeline.push({
      at: p.completedAt as Date,
      kind: "chapter",
      title: `Bab selesai: ${p.chapter.title}`,
      detail: `${levelName(p.chapter.level.code)}${p.bestScore !== null ? ` · nilai ${p.bestScore}` : ""}`,
    });
  }
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());

  const srsTotals = srs.reduce(
    (acc, r) => ({ total: acc.total + r.total, due: acc.due + r.due, weak: acc.weak + r.weak, mastered: acc.mastered + r.mastered }),
    { total: 0, due: 0, weak: 0, mastered: 0 },
  );

  return {
    profile: {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      status: user.status,
      gender: user.gender,
      learningGoal: user.learningGoal,
      dailyTargetMin: user.dailyTargetMin,
      avatarUrl: user.avatarUrl,
      xpTotal: user.xpTotal,
      streakCount: user.streakCount,
      lastActiveDate: user.lastActiveDate,
      lastLoginAt: user.lastLoginAt,
      emailVerified: !!user.emailVerifiedAt,
      createdAt: user.createdAt,
      currentLevel: user.currentLevel ? { id: user.currentLevel.id, code: user.currentLevel.code, name: user.currentLevel.name } : null,
      pendingLevel: user.pendingLevel,
      premium: {
        active: user.role === "premium" || premiumActive,
        plan: sub?.plan ?? null,
        expiresAt: sub?.expiresAt ?? null,
      },
    },
    journey,
    currentChapters: user.currentLevel ? await chapterProgress(userId, user.currentLevel.id) : [],
    exams: exams.map((e) => ({
      id: e.id,
      type: e.type,
      levelCode: e.level.code,
      resultLevelCode: e.resultLevel?.code ?? null,
      score: e.score,
      passed: e.passed,
      sectionScores: (e.sectionScores as Record<string, number> | null) ?? null,
      durationMin: e.startedAt && e.finishedAt ? Math.max(1, Math.round((e.finishedAt.getTime() - e.startedAt.getTime()) / 60000)) : null,
      takenAt: e.takenAt,
    })),
    conversations: {
      total: convTotals._count.id,
      totalTurns: convTotals._sum.turnCount ?? 0,
      avgPronunciation: convTotals._avg.pronunciationScore === null ? null : Math.round(convTotals._avg.pronunciationScore),
      recent: conversations.map((c) => ({
        id: c.id,
        mode: c.mode,
        inputMode: c.inputMode,
        scenarioTitle: c.scenario?.title ?? null,
        levelCode: c.level.code,
        turnCount: c.turnCount,
        pronunciationScore: c.pronunciationScore,
        summary: c.summary,
        startedAt: c.startedAt,
        durationMin: c.endedAt ? Math.max(1, Math.round((c.endedAt.getTime() - c.startedAt.getTime()) / 60000)) : null,
      })),
    },
    achievements: achievements.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      description: a.description,
      earnedAt: a.users[0]?.earnedAt ?? null,
    })),
    srs: { ...srsTotals, byType: srs.map((r) => ({ type: r.item_type, total: r.total, due: r.due, weak: r.weak, mastered: r.mastered })) },
    memories: {
      interests: memories.filter((m) => m.type === "interest").map((m) => m.content),
      mistakes: memories.filter((m) => m.type === "mistake").map((m) => ({ content: m.content, weight: m.weight })),
    },
    activity: fillDays(84, activityRows, ["chapters", "conversations", "exams"] as const),
    timeline: timeline.slice(0, 30),
  };
}

export function learnerMonitorRoutes() {
  const r = Router();

  r.get("/overview", asyncHandler(async (_req, res) => {
    res.json(await overview());
  }));

  r.get("/", asyncHandler(async (req, res) => {
    const q = parseBody(listQuery, req.query);
    res.json(await queryLearners(q, q.pageSize, (q.page - 1) * q.pageSize));
  }));

  // Seluruh hasil filter (maks. 5000 baris) untuk diunduh sebagai CSV di browser
  r.get("/export", asyncHandler(async (req, res) => {
    const q = parseBody(listQuery, req.query);
    res.json(await queryLearners(q, 5000, 0));
  }));

  r.get("/:userId", asyncHandler(async (req, res) => {
    const { userId } = parseBody(z.object({ userId: z.string().uuid() }), req.params);
    res.json(await learnerDetail(userId));
  }));

  r.get("/:userId/chapters", asyncHandler(async (req, res) => {
    const { userId } = parseBody(z.object({ userId: z.string().uuid() }), req.params);
    const { levelId } = parseBody(z.object({ levelId: z.coerce.number().int().min(1) }), req.query);
    res.json(await chapterProgress(userId, levelId));
  }));

  // Menempatkan pelajar di level tertentu (mis. koreksi hasil tes penempatan); tercatat di audit log
  r.patch("/:userId/level", asyncHandler(async (req, res) => {
    const actor = currentUser(req);
    const { userId } = parseBody(z.object({ userId: z.string().uuid() }), req.params);
    const { levelId, reason } = parseBody(
      z.object({ levelId: z.number().int().min(1), reason: z.string().trim().min(3).max(300) }),
      req.body,
    );
    const [user, level] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { isGuest: true, currentLevel: { select: { code: true } } } }),
      prisma.level.findUnique({ where: { id: levelId }, select: { code: true } }),
    ]);
    if (!user || user.isGuest) throw Errors.notFound("Pengguna");
    if (!level) throw Errors.notFound("Level");
    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { currentLevelId: levelId, pendingLevelId: null } }),
      prisma.auditLog.create({
        data: {
          actorId: actor.id,
          targetUserId: userId,
          action: "learner.set_level",
          details: { from: user.currentLevel?.code ?? null, to: level.code, reason },
        },
      }),
    ]);
    res.status(204).end();
  }));

  return r;
}
