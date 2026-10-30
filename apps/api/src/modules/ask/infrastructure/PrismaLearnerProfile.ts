import type { Db } from "../../../shared/infrastructure/prisma";
import { currentChapter, goalLabel } from "../../conversation/infrastructure/PrismaConversationRepository";
import type { AskUser } from "./learnerContext";

/** Nama, jenis kelamin, level, panduan level, bab aktif, dan memori akun terdaftar untuk prompt Miu-chan; null untuk tamu. */
export async function loadLearnerProfile(db: Db, userId: string): Promise<AskUser | null> {
  // Per tipe supaya hobi tidak tergeser oleh catatan kesalahan yang bertambah tiap koreksi
  const memoriesOf = async (type: "interest" | "mistake") =>
    (
      await db.userMemory.findMany({
        where: { userId, type },
        orderBy: [{ weight: "desc" }, { updatedAt: "desc" }],
        take: 5,
        select: { content: true },
      })
    ).map((m) => m.content);

  const [user, interests, weakTopics] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        displayName: true,
        gender: true,
        isGuest: true,
        learningGoal: true,
        currentLevel: {
          select: {
            id: true,
            code: true,
            prompt: { select: { systemPrompt: true, maxSentenceWords: true, furiganaRule: true, speechRate: true } },
          },
        },
      },
    }),
    memoriesOf("interest"),
    memoriesOf("mistake"),
  ]);
  if (!user || user.isGuest) return null;
  const level = user.currentLevel;
  const prompt = level?.prompt;
  return {
    name: user.displayName,
    gender: user.gender ?? null,
    level: level?.code ?? null,
    interests,
    weakTopics,
    levelGuide: prompt
      ? { systemPrompt: prompt.systemPrompt, maxSentenceWords: prompt.maxSentenceWords, furiganaRule: prompt.furiganaRule, speechRate: Number(prompt.speechRate) }
      : null,
    lesson: level ? await currentChapter(db, userId, level.id) : null,
    goal: await goalLabel(db, user.learningGoal),
  };
}
