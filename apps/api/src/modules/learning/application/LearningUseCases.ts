import { Errors } from "../../../shared/domain/errors";
import type { AuthUser, Clock } from "../../../shared/domain/types";
import type { UserRepository } from "../../auth/domain/ports";
import type { OnboardingConfig } from "../domain/Onboarding";
import { PASSING_QUIZ_SCORE, levelLockReason, type LearningRepository, type Level, type LevelProgress, type QuizAnswer } from "../domain/Learning";

/** Tolak akses ke level yang terkunci untuk pelajar ini, dengan pesan sesuai alasannya. */
async function assertLevelOpen(repo: LearningRepository, user: AuthUser, level: Level) {
  const reason = levelLockReason(level, user.role, await repo.getLevelCeiling(user.id));
  if (reason === "premium") throw Errors.forbidden("Level ini tersedia untuk pengguna Premium.");
  if (reason === "level") throw Errors.forbidden("Level ini terbuka setelah kamu lulus tes naik tahap.");
}

export class ListLevels {
  constructor(private readonly deps: { repo: LearningRepository }) {}
  async execute(user: AuthUser) {
    const [levels, ceiling] = await Promise.all([this.deps.repo.listLevels(), this.deps.repo.getLevelCeiling(user.id)]);
    const isAdmin = user.role === "admin" || user.role === "super_admin";
    return levels.map((l) => {
      const lockReason = isAdmin ? null : levelLockReason(l, user.role, ceiling);
      return { ...l, locked: isAdmin || lockReason !== null, lockReason };
    });
  }
}

export class ListChapters {
  constructor(private readonly deps: { repo: LearningRepository }) {}
  async execute(user: AuthUser, levelId: number) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak ditujukan untuk jalur belajar siswa.");
    }
    const level = await this.deps.repo.findLevel(levelId);
    if (!level) throw Errors.notFound("Level");
    await assertLevelOpen(this.deps.repo, user, level);
    return this.deps.repo.listChaptersWithProgress(levelId, user.id);
  }
}

export class GetChapter {
  constructor(private readonly deps: { repo: LearningRepository }) {}
  async execute(user: AuthUser, chapterId: string) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak ditujukan untuk jalur belajar siswa.");
    }
    const chapter = await this.deps.repo.getChapter(chapterId);
    if (!chapter) throw Errors.notFound("Bab");
    const level = await this.deps.repo.findLevel(chapter.levelId);
    if (level) await assertLevelOpen(this.deps.repo, user, level);
    return chapter;
  }
}

export class GetNextChapter {
  constructor(private readonly deps: { repo: LearningRepository; users: UserRepository }) {}
  async execute(user: AuthUser) {
    if (user.role === "admin" || user.role === "super_admin") return { chapter: null };
    const fullUser = await this.deps.users.findById(user.id);
    if (!fullUser?.currentLevelId) return { chapter: null };
    const chapter = await this.deps.repo.getNextChapter(user.id, fullUser.currentLevelId);
    return { chapter };
  }
}

/** Nilai jawaban di server, simpan hasil, masukkan ke SRS, tambah XP. */
export class SubmitQuiz {
  constructor(private readonly deps: { repo: LearningRepository; clock: Clock }) {}
  async execute(user: AuthUser, chapterId: string, answers: QuizAnswer[]) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak dapat mengikuti kuis belajar.");
    }
    if (answers.length === 0) throw Errors.validation("Jawaban tidak boleh kosong.");
    const chapter = await this.deps.repo.getChapter(chapterId);
    if (!chapter) throw Errors.notFound("Bab");
    const level = await this.deps.repo.findLevel(chapter.levelId);
    if (level) await assertLevelOpen(this.deps.repo, user, level);
    const { score, results } = await this.deps.repo.gradeQuizAnswers(chapterId, answers);
    const now = this.deps.clock.now();
    const passed = score >= PASSING_QUIZ_SCORE;
    await this.deps.repo.saveQuizResult(user.id, chapterId, score, passed, now);
    let xp = 5;
    if (passed) {
      await this.deps.repo.enqueueChapterItemsToSrs(user.id, chapterId, now);
      xp = 20;
    }
    await this.deps.repo.addXp(user.id, xp);
    return { score, passed, xpEarned: xp, passingScore: PASSING_QUIZ_SCORE, results };
  }
}

export class GetLevelProgress {
  constructor(private readonly deps: { repo: LearningRepository }) {}

  async execute(user: AuthUser, levelId: number): Promise<LevelProgress> {
    if (user.role === "admin" || user.role === "super_admin") {
      return {
        vocabLearned: 0,
        vocabTarget: 0,
        kanjiLearned: 0,
        kanjiTarget: 0,
        chaptersCompleted: 0,
        chaptersTotal: 0,
      };
    }
    return this.deps.repo.getLevelProgress(user.id, levelId);
  }
}

/** Isi layar pendaftaran untuk siswa: hanya titik mulai yang aktif, lengkap dengan kode level. */
export class GetOnboardingOptions {
  constructor(private readonly deps: { repo: LearningRepository; loadConfig: () => Promise<OnboardingConfig> }) {}
  async execute() {
    const [config, levels] = await Promise.all([this.deps.loadConfig(), this.deps.repo.listLevels()]);
    const starts = config.starts.flatMap((s) => {
      const level = levels.find((l) => l.id === s.levelId);
      return s.enabled && level ? [{ ...s, levelCode: level.code, levelName: level.name }] : [];
    });
    return { ...config, starts };
  }
}
