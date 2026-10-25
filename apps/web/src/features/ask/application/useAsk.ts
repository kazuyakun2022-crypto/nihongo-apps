"use client";

import { useCallback, useState } from "react";
import { playReceiveSound, playSendSound } from "@/shared/lib/chatSounds";
import { type AskMessage, postQuestion } from "../data/askApi";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useAsk() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ask = useCallback(async (question: string) => {
    if (!question.trim() || loading) return;
    setError(null);

    const userMsg: DisplayMessage = { id: crypto.randomUUID(), role: "user", content: question };
    setMessages((prev) => [...prev, userMsg]);
    playSendSound();
    setLoading(true);

    try {
      // Kirim history tanpa id — backend hanya butuh role + content
      const history: AskMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
      const answer = await postQuestion(question, history);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: answer }]);
      playReceiveSound();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal menghubungi Sensei AI. Coba lagi.";
      setError(msg);
      // Hapus pesan user yang gagal agar tidak membingungkan
      setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, loading, error, ask, clear };
}
