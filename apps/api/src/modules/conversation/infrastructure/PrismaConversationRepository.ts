import type { Prisma } from "@prisma/client";
import type { Db } from "../../../shared/infrastructure/prisma";
import { Errors } from "../../../shared/domain/errors";
import {
  DEFAULT_MAX_TURNS,
  type ChatMessage,
  type ConversationContext,
  type ConversationMode,
  type Correction,
  type LevelRules,
} from "../domain/Conversation";
import type { ConversationRepository, SessionRow } from "../domain/ports";

const FALLBACK_RULES: Omit<LevelRules, "levelId" | "levelCode"> = {
  systemPrompt: "Gunakan bentuk sopan です/ます dan kalimat sangat sederhana.",
  maxSentenceWords: 8,
  furiganaRule: "full",
  speechRate: 0.8,
};

export class PrismaConversationRepository implements ConversationRepository {
  constructor(private readonly db: Db) {}

  async loadContext(userId: string, scenarioId: string | null): Promise<ConversationContext> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      select: { displayName: true, role: true, currentLevel: { include: { prompt: true } } },
    });
    if (!user) throw Errors.notFound("Pengguna");

    const level = user.currentLevel ?? (await this.db.level.findFirst({ orderBy: { sortOrder: "asc" }, include: { prompt: true } }));
    if (!level) throw Errors.notFound("Level (jalankan seed database)");

    const mascot = await this.db.mascot.findFirst({ orderBy: { id: "asc" } });
    if (!mascot) throw Errors.notFound("Maskot (jalankan seed database)");

    const scenario = scenarioId
      ? await this.db.scenario.findFirst({ where: { id: scenarioId, status: "published", level: { sortOrder: { lte: level.sortOrder } } } })
      : null;
    if (scenarioId && !scenario) throw Errors.notFound("Skenario");

    // Per tipe supaya hobi tidak tergeser oleh catatan kesalahan yang bertambah tiap koreksi
    const memoriesOf = async (type: "interest" | "mistake" | "fact") =>
      (
        await this.db.userMemory.findMany({
          where: { userId, type },
          orderBy: [{ weight: "desc" }, { updatedAt: "desc" }],
          take: 5,
          select: { content: true },
        })
      ).map((m) => m.content);
    const [interests, weakTopics, facts, kanji] = await Promise.all([
      memoriesOf("interest"),
      memoriesOf("mistake"),
      memoriesOf("fact"),
      this.db.kanji.findMany({
        where: { chapter: { status: "published", level: { sortOrder: { lte: level.sortOrder } } } },
        select: { character: true },
      }),
    ]);

    const p = level.prompt;
    return {
      displayName: user.displayName,
      role: user.role,
      rules: {
        levelId: level.id,
        levelCode: level.code,
        systemPrompt: p?.systemPrompt ?? FALLBACK_RULES.systemPrompt,
        maxSentenceWords: p?.maxSentenceWords ?? FALLBACK_RULES.maxSentenceWords,
        furiganaRule: p?.furiganaRule ?? FALLBACK_RULES.furiganaRule,
        speechRate: p ? Number(p.speechRate) : FALLBACK_RULES.speechRate,
      },
      mascot: { id: mascot.id, name: mascot.name, personality: mascot.personality },
      scenario: scenario
        ? { id: scenario.id, title: scenario.title, goal: scenario.goal, mascotRole: scenario.mascotRole, maxTurns: scenario.maxTurns }
        : null,
      memories: { interests, weakTopics, facts },
      allowedKanji: new Set(kanji.map((k) => k.character)),
    };
  }

  countSessionsSince(userId: string, since: Date): Promise<number> {
    return this.db.conversationSession.count({ where: { userId, startedAt: { gte: since } } });
  }

  async createSession(data: { userId: string; mascotId: number; levelId: number; scenarioId: string | null; mode: ConversationMode }): Promise<SessionRow> {
    const s = await this.db.conversationSession.create({ data, include: { scenario: { select: { maxTurns: true } } } });
    return toRow(s);
  }

  async findSession(id: string): Promise<SessionRow | null> {
    const s = await this.db.conversationSession.findUnique({ where: { id }, include: { scenario: { select: { maxTurns: true } } } });
    return s ? toRow(s) : null;
  }

  async listMessages(sessionId: string): Promise<ChatMessage[]> {
    const rows = await this.db.conversationMessage.findMany({ where: { sessionId }, orderBy: { createdAt: "asc" } });
    return rows.map((m) => ({ sender: m.sender, text: m.text, correction: (m.correction as Correction | null) ?? null }));
  }

  async addMessage(sessionId: string, sender: "user" | "mascot", text: string, correction?: Correction | null): Promise<void> {
    await this.db.conversationMessage.create({ data: { sessionId, sender, text, correction: (correction ?? undefined) as Prisma.InputJsonValue | undefined } });
  }

  async incrementTurn(sessionId: string): Promise<void> {
    await this.db.conversationSession.update({ where: { id: sessionId }, data: { turnCount: { increment: 1 } } });
  }

  async endSession(sessionId: string, now: Date, summary: string): Promise<void> {
    await this.db.conversationSession.update({ where: { id: sessionId }, data: { endedAt: now, summary } });
  }

  async saveMistakeMemory(userId: string, content: string): Promise<void> {
    await this.db.userMemory.create({ data: { userId, type: "mistake", content } });
  }
}

function toRow(s: {
  id: string;
  userId: string;
  levelId: number;
  mode: ConversationMode;
  scenarioId: string | null;
  turnCount: number;
  endedAt: Date | null;
  scenario: { maxTurns: number } | null;
}): SessionRow {
  return {
    id: s.id,
    userId: s.userId,
    levelId: s.levelId,
    mode: s.mode,
    scenarioId: s.scenarioId,
    turnCount: s.turnCount,
    maxTurns: s.scenario?.maxTurns ?? DEFAULT_MAX_TURNS,
    endedAt: s.endedAt,
  };
}
