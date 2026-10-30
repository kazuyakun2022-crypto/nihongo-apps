import type { ChatMessage, ConversationContext, ConversationEmotion, ConversationMode, Correction, ScenarioListItem, VoiceSpeed } from "./Conversation";

export interface SessionRow {
  id: string;
  userId: string;
  levelId: number;
  mode: ConversationMode;
  scenarioId: string | null;
  turnCount: number;
  maxTurns: number;
  endedAt: Date | null;
}

export interface ConversationRepository {
  loadContext(userId: string, scenarioId: string | null): Promise<ConversationContext>;
  /** Skenario terbit sampai level user, urut level lalu urutan. */
  listScenarios(userId: string): Promise<ScenarioListItem[]>;
  countSessionsSince(userId: string, since: Date): Promise<number>;
  createSession(data: { userId: string; mascotId: number; levelId: number; scenarioId: string | null; mode: ConversationMode }): Promise<SessionRow>;
  findSession(id: string): Promise<SessionRow | null>;
  listMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(sessionId: string, sender: "user" | "mascot", text: string, correction?: Correction | null): Promise<void>;
  incrementTurn(sessionId: string): Promise<void>;
  endSession(sessionId: string, now: Date, summary: string): Promise<void>;
  saveMistakeMemory(userId: string, content: string): Promise<void>;
}

export interface AiReply {
  reply: string;
  correction: Correction | null;
  /** Tidak ada bila AI tidak menulis emosi atau nilainya tidak dikenal. */
  emotion?: ConversationEmotion;
  /** Kecepatan bicara yang dipilih AI; default "normal" bila tidak ada. */
  voiceSpeed?: VoiceSpeed;
}

/** Port penyedia AI. Ganti model/penyedia cukup dengan membuat kelas baru yang mengimplementasikan ini. */
export interface AiChatProvider {
  reply(systemPrompt: string, history: ChatMessage[], extraInstruction?: string): Promise<AiReply>;
}
