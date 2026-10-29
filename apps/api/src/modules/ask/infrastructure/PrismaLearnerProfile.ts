import type { Db } from "../../../shared/infrastructure/prisma";
import type { AskUser } from "./learnerContext";

/** Nama, jenis kelamin, level, dan memori akun terdaftar untuk prompt Miu-chan; null untuk tamu. */
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
      select: { displayName: true, gender: true, isGuest: true, currentLevel: { select: { code: true } } },
    }),
    memoriesOf("interest"),
    memoriesOf("mistake"),
  ]);
  if (!user || user.isGuest) return null;
  return {
    name: user.displayName,
    gender: user.gender ?? null,
    level: user.currentLevel?.code ?? null,
    interests,
    weakTopics,
  };
}
