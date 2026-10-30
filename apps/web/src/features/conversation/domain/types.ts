/** Emosi dominan Miu-chan pada balasan terakhir. */
export type ConversationEmotion = "playful" | "encouraging" | "thinking" | "excited";

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  sender: "user" | "mascot";
  text: string;
  correction?: Correction | null;
}

export interface StartedSession {
  sessionId: string;
  mascot: { name: string };
  level: string;
  furiganaRule: "full" | "hard_only" | "none";
  speechRate: number;
  maxTurns: number;
  message: { sender: "mascot"; text: string };
  emotion?: ConversationEmotion;
}

export interface SessionReport {
  turns: number;
  corrections: Correction[];
  summary: string;
}

/** Skenario latihan ngobrol yang bisa dipilih siswa. */
export interface ScenarioItem {
  id: string;
  title: string;
  goal: string;
  levelCode: string;
  chapterId: string | null;
  chapterTitle: string | null;
  targetGrammar: string[];
}

export interface ConversationRepository {
  start(scenarioId: string | null): Promise<StartedSession>;
  send(
    sessionId: string,
    text: string,
  ): Promise<{ message: { sender: "mascot"; text: string }; correction: Correction | null; emotion?: ConversationEmotion; turnsLeft: number }>;
  end(sessionId: string): Promise<SessionReport>;
}
