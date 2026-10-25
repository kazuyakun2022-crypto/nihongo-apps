import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { GetChapter, GetLevelProgress, GetNextChapter, ListChapters, ListLevels, SubmitQuiz } from "../application/LearningUseCases";

export function learningRoutes(uc: { listLevels: ListLevels; listChapters: ListChapters; getChapter: GetChapter; getNextChapter: GetNextChapter; submitQuiz: SubmitQuiz; getLevelProgress: GetLevelProgress }) {
  const r = Router();

  r.get("/levels", asyncHandler(async (req, res) => {
    res.json({ levels: await uc.listLevels.execute(currentUser(req)) });
  }));

  r.get("/levels/:levelId/chapters", asyncHandler(async (req, res) => {
    res.json({ chapters: await uc.listChapters.execute(currentUser(req), Number(req.params.levelId)) });
  }));

  r.get("/next-chapter", asyncHandler(async (req, res) => {
    res.json(await uc.getNextChapter.execute(currentUser(req)));
  }));

  r.get("/progress", asyncHandler(async (req, res) => {
    const levelId = parseInt(req.query["levelId"] as string, 10);
    if (isNaN(levelId)) { res.status(400).json({ error: "levelId diperlukan" }); return; }
    const progress = await uc.getLevelProgress.execute(currentUser(req), levelId);
    res.json({ progress });
  }));

  r.get("/chapters/:chapterId", asyncHandler(async (req, res) => {
    res.json({ chapter: await uc.getChapter.execute(currentUser(req), req.params.chapterId) });
  }));

  r.post("/chapters/:chapterId/quiz", asyncHandler(async (req, res) => {
    const { answers } = parseBody(
      z.object({ answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string().min(1) })).min(1).max(100) }),
      req.body,
    );
    res.json(await uc.submitQuiz.execute(currentUser(req), req.params.chapterId, answers));
  }));

  return r;
}
