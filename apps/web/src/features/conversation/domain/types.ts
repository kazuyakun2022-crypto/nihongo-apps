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
}

export interface SessionReport {
  turns: number;
  corrections: Correction[];
  summary: string;
}

export interface ConversationRepository {
  start(scenarioId: string | null): Promise<StartedSession>;
  send(sessionId: string, text: string): Promise<{ message: { sender: "mascot"; text: string }; correction: Correction | null; turnsLeft: number }>;
  end(sessionId: string): Promise<SessionReport>;
}
