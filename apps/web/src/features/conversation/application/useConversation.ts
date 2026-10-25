"use client";

import { useCallback, useRef, useState } from "react";
import { ApiError } from "@/core/http/apiClient";
import { conversationApi } from "../data/conversationApi";
import type { ChatMessage, ConversationRepository, SessionReport, StartedSession } from "../domain/types";

type Phase = "idle" | "starting" | "chatting" | "waiting" | "ended";

/** Logika layar ngobrol (dokumen 8.4), terpisah dari tampilan agar mudah diubah atau diuji. */
export function useConversation(repo: ConversationRepository = conversationApi) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<StartedSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [turnsLeft, setTurnsLeft] = useState<number | null>(null);
  const [report, setReport] = useState<SessionReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const nextId = () => `m${++seq.current}`;

  const fail = (err: unknown) => setError(err instanceof ApiError ? err.message : "Neko-sensei tidak bisa dihubungi. Periksa koneksimu.");

  const start = useCallback(
    async (scenarioId: string | null = null) => {
      setPhase("starting");
      setError(null);
      setReport(null);
      try {
        const s = await repo.start(scenarioId);
        setSession(s);
        setMessages([{ id: nextId(), sender: "mascot", text: s.message.text }]);
        setTurnsLeft(s.maxTurns);
        setPhase("chatting");
      } catch (err) {
        fail(err);
        setPhase("idle");
      }
    },
    [repo],
  );

  const send = useCallback(
    async (text: string) => {
      if (!session || !text.trim()) return;
      setMessages((m) => [...m, { id: nextId(), sender: "user", text }]);
      setPhase("waiting");
      setError(null);
      try {
        const res = await repo.send(session.sessionId, text);
        setMessages((m) => [...m, { id: nextId(), sender: "mascot", text: res.message.text, correction: res.correction }]);
        setTurnsLeft(res.turnsLeft);
        setPhase("chatting");
      } catch (err) {
        fail(err);
        setPhase("chatting");
      }
    },
    [repo, session],
  );

  const end = useCallback(async () => {
    if (!session) return;
    try {
      setReport(await repo.end(session.sessionId));
      setPhase("ended");
    } catch (err) {
      fail(err);
    }
  }, [repo, session]);

  return { phase, session, messages, turnsLeft, report, error, start, send, end };
}
