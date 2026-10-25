import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { GetDueCards, ReviewCard } from "../application/SrsUseCases";

export function srsRoutes(uc: { getDue: GetDueCards; review: ReviewCard }) {
  const r = Router();

  r.get("/due", asyncHandler(async (req, res) => {
    res.json(await uc.getDue.execute(currentUser(req)));
  }));

  r.post("/cards/:cardId/review", asyncHandler(async (req, res) => {
    const { grade } = parseBody(z.object({ grade: z.enum(["lupa", "sulit", "bisa", "mudah"]) }), req.body);
    res.json(await uc.review.execute(currentUser(req), req.params.cardId, grade));
  }));

  return r;
}
