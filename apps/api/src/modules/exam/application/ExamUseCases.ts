import { Errors } from "../../../shared/domain/errors";
import type { AuthUser } from "../../../shared/domain/types";
import {
  PLACEMENT_PASSING_SCORE,
  PLACEMENT_QUESTION_COUNT,
  requiresPlacementTest,
  sourceLevelId,
  type ExamRepository,
  type PlacementAnswer,
} from "../domain/Exam";

export class GetPlacementQuestions {
  constructor(private readonly deps: { repo: ExamRepository }) {}

  async execute(user: AuthUser, targetLevelId: number) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak mengikuti tes penempatan siswa.");
    }
    if (!requiresPlacementTest(targetLevelId)) {
      throw Errors.validation("Level ini tidak memerlukan tes penempatan.");
    }
    const src = sourceLevelId(targetLevelId);
    const questions = await this.deps.repo.getPlacementQuestions(src, PLACEMENT_QUESTION_COUNT);
    if (questions.length === 0) {
      throw Errors.notFound("Soal tes penempatan");
    }
    return { questions, total: questions.length, passingScore: PLACEMENT_PASSING_SCORE };
  }
}

export class SubmitPlacementExam {
  constructor(private readonly deps: { repo: ExamRepository }) {}

  async execute(user: AuthUser, targetLevelId: number, answers: PlacementAnswer[]) {
    if (user.role === "admin" || user.role === "super_admin") {
      throw Errors.forbidden("Akun Administrator tidak mengikuti tes penempatan siswa.");
    }
    if (!requiresPlacementTest(targetLevelId)) {
      throw Errors.validation("Level ini tidak memerlukan tes penempatan.");
    }
    if (answers.length === 0) {
      throw Errors.validation("Jawaban tidak boleh kosong.");
    }

    const correct = await this.deps.repo.gradeAnswers(answers);
    const total = answers.length;
    const score = Math.round((correct / total) * 100);
    const passed = score >= PLACEMENT_PASSING_SCORE;

    await this.deps.repo.saveAttempt(user.id, targetLevelId, "placement", score, passed);

    if (passed) {
      await this.deps.repo.updateUserLevel(user.id, targetLevelId);
    }

    return { score, passed, correct, total, passingScore: PLACEMENT_PASSING_SCORE };
  }
}
