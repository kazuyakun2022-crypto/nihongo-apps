import { Errors } from "../../../shared/domain/errors";
import type { AuthUser, Clock } from "../../../shared/domain/types";
import { dailySessionQuota, type ChatMessage } from "../domain/Conversation";
import { buildSystemPrompt, findDisallowedKanji, rewriteInstruction } from "../domain/LevelPolicy";
import type { AiChatProvider, AiReply, ConversationRepository } from "../domain/ports";

interface Deps {
  repo: ConversationRepository;
  ai: AiChatProvider;
  clock: Clock;
  freeDailyLimit: number;
}

/** Meminta balasan AI, lalu memastikan kanjinya sesuai level (maksimal 1 kali tulis ulang). */
async function replyWithinLevel(deps: Deps, userId: string, scenarioId: string | null, history: ChatMessage[]): Promise<AiReply> {
  const ctx = await deps.repo.loadContext(userId, scenarioId);
  const system = buildSystemPrompt(ctx);
  const answer = await deps.ai.reply(system, history);
  const hardOnly = ctx.rules.furiganaRule === "hard_only";
  const disallowed = findDisallowedKanji(answer.reply, ctx.allowedKanji, hardOnly);
  if (disallowed.length === 0) return answer;
  const rewritten = await deps.ai.reply(system, history, rewriteInstruction(disallowed, answer.reply, hardOnly));
  // Koreksi dari jawaban pertama tetap dipakai bila tulisan ulang tidak menyertakannya
  return { ...rewritten, correction: rewritten.correction ?? answer.correction };
}

/** Daftar skenario latihan ngobrol untuk siswa. */
export class ListScenarios {
  constructor(private readonly deps: Pick<Deps, "repo">) {}

  execute(user: AuthUser) {
    return this.deps.repo.listScenarios(user.id);
  }
}

/** Dokumen 8.4 langkah 1–3. */
export class StartConversation {
  constructor(private readonly deps: Deps) {}

  async execute(user: AuthUser, input: { scenarioId: string | null }) {
    const quota = dailySessionQuota(user.role, this.deps.freeDailyLimit);
    if (quota !== null) {
      const startOfDay = new Date(this.deps.clock.now());
      startOfDay.setHours(0, 0, 0, 0);
      const used = await this.deps.repo.countSessionsSince(user.id, startOfDay);
      if (used >= quota) throw Errors.quota(`Kuota ngobrol hari ini (${quota} sesi) sudah habis. Coba lagi besok atau upgrade ke Premium.`);
    }

    const ctx = await this.deps.repo.loadContext(user.id, input.scenarioId);
    const session = await this.deps.repo.createSession({
      userId: user.id,
      mascotId: ctx.mascot.id,
      levelId: ctx.rules.levelId,
      scenarioId: input.scenarioId,
      mode: input.scenarioId ? "scenario" : "free",
    });

    // Skenario dengan kalimat pembuka dari admin tidak perlu memanggil AI untuk pesan pertama
    const opening: AiReply = ctx.scenario?.initialMessage
      ? { reply: ctx.scenario.initialMessage.replaceAll("{{user_name}}", ctx.displayName), correction: null, emotion: "playful" }
      : await replyWithinLevel(this.deps, user.id, input.scenarioId, []);
    await this.deps.repo.addMessage(session.id, "mascot", opening.reply);

    return {
      sessionId: session.id,
      mascot: { name: ctx.mascot.name },
      level: ctx.rules.levelCode,
      furiganaRule: ctx.rules.furiganaRule,
      speechRate: ctx.rules.speechRate,
      maxTurns: session.maxTurns,
      message: { sender: "mascot" as const, text: opening.reply },
      emotion: opening.emotion ?? "playful",
    };
  }
}

/** Dokumen 8.4 langkah 4–6. */
export class SendMessage {
  constructor(private readonly deps: Deps) {}

  async execute(user: AuthUser, sessionId: string, text: string) {
    const session = await this.deps.repo.findSession(sessionId);
    if (!session || session.userId !== user.id) throw Errors.notFound("Sesi percakapan");
    if (session.endedAt) throw Errors.validation("Sesi ini sudah selesai. Mulai sesi baru untuk ngobrol lagi.");
    if (session.turnCount >= session.maxTurns) throw Errors.validation("Batas giliran sesi ini sudah tercapai. Akhiri sesi untuk melihat laporan.");

    await this.deps.repo.addMessage(sessionId, "user", text);
    const history = await this.deps.repo.listMessages(sessionId);
    const answer = await replyWithinLevel(this.deps, user.id, session.scenarioId, history);

    await this.deps.repo.addMessage(sessionId, "mascot", answer.reply, answer.correction);
    await this.deps.repo.incrementTurn(sessionId);
    if (answer.correction) {
      await this.deps.repo.saveMistakeMemory(user.id, `${answer.correction.original} => ${answer.correction.corrected}`);
    }

    return {
      message: { sender: "mascot" as const, text: answer.reply },
      correction: answer.correction,
      emotion: answer.emotion ?? (answer.correction ? "encouraging" : "playful"),
      turnsLeft: session.maxTurns - session.turnCount - 1,
    };
  }
}

/** Dokumen 8.4 langkah 7–8: akhiri sesi dan buat laporan singkat. */
export class EndConversation {
  constructor(private readonly deps: Pick<Deps, "repo" | "clock">) {}

  async execute(user: AuthUser, sessionId: string) {
    const session = await this.deps.repo.findSession(sessionId);
    if (!session || session.userId !== user.id) throw Errors.notFound("Sesi percakapan");
    const messages = await this.deps.repo.listMessages(sessionId);
    const corrections = messages.flatMap((m) => (m.correction ? [m.correction] : []));
    const turns = messages.filter((m) => m.sender === "user").length;
    const summary = `${turns} giliran, ${corrections.length} koreksi`;
    if (!session.endedAt) await this.deps.repo.endSession(sessionId, this.deps.clock.now(), summary);
    return { turns, corrections, summary };
  }
}
