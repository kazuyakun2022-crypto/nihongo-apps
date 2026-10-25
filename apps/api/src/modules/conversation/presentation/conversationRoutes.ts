import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../../../shared/http/asyncHandler";
import { currentUser } from "../../../shared/http/auth";
import { parseBody } from "../../../shared/http/validate";
import type { EndConversation, SendMessage, StartConversation } from "../application/ConversationUseCases";

export function conversationRoutes(uc: { start: StartConversation; send: SendMessage; end: EndConversation }) {
  const r = Router();

  r.post("/sessions", asyncHandler(async (req, res) => {
    const body = parseBody(z.object({ scenarioId: z.string().uuid().nullable().default(null) }), req.body ?? {});
    res.status(201).json(await uc.start.execute(currentUser(req), body));
  }));

  r.post("/sessions/:sessionId/messages", asyncHandler(async (req, res) => {
    const { text } = parseBody(z.object({ text: z.string().trim().min(1).max(500) }), req.body);
    res.json(await uc.send.execute(currentUser(req), req.params.sessionId, text));
  }));

  r.post("/sessions/:sessionId/end", asyncHandler(async (req, res) => {
    res.json(await uc.end.execute(currentUser(req), req.params.sessionId));
  }));

  return r;
}
