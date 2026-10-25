import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { GetPlacementQuestions, SubmitPlacementExam } from "../application/ExamUseCases";

export function examRoutes(uc: { getPlacementQuestions: GetPlacementQuestions; submitPlacementExam: SubmitPlacementExam }) {
  const r = Router();

  r.get("/placement", asyncHandler(async (req, res) => {
    const targetLevelId = Number(req.query.targetLevelId);
    if (!Number.isInteger(targetLevelId) || targetLevelId < 3) {
      return res.status(400).json({ error: { code: "VALIDATION", message: "targetLevelId tidak valid." } });
    }
    res.json(await uc.getPlacementQuestions.execute(currentUser(req), targetLevelId));
  }));

  r.post("/placement", asyncHandler(async (req, res) => {
    const body = parseBody(
      z.object({
        targetLevelId: z.number().int().min(3).max(6),
        answers: z.array(z.object({ questionId: z.string().uuid(), answer: z.string().min(1) })).min(1).max(30),
      }),
      req.body,
    );
    res.json(await uc.submitPlacementExam.execute(currentUser(req), body.targetLevelId, body.answers));
  }));

  return r;
}
