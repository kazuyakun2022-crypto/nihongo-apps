import type { Role } from "../../../shared/domain/types";

export type FuriganaRule = "full" | "hard_only" | "none";
export type ConversationMode = "scenario" | "free";

/** Aturan bahasa maskot per level, diambil dari tabel ai_level_prompts (bisa diubah Admin). */
export interface LevelRules {
  levelId: number;
  levelCode: string;
  systemPrompt: string;
  maxSentenceWords: number;
  furiganaRule: FuriganaRule;
  speechRate: number;
}

export interface MascotProfile {
  id: number;
  name: string;
  personality: string;
}

export interface ScenarioBrief {
  id: string;
  title: string;
  goal: string;
  mascotRole: string;
  maxTurns: number;
}

export interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

export interface ChatMessage {
  sender: "user" | "mascot";
  text: string;
  correction?: Correction | null;
}

export interface ConversationContext {
  displayName: string;
  role: Role;
  rules: LevelRules;
  mascot: MascotProfile;
  scenario: ScenarioBrief | null;
  memories: string[];
  /** Kanji yang sudah dipelajari sampai level pengguna. Kosong berarti pemula: hindari kanji. */
  allowedKanji: Set<string>;
}

export const DEFAULT_MAX_TURNS = 20;

/** Kuota sesi per hari per role (dokumen bagian 7). null = tanpa batas. */
export function dailySessionQuota(role: Role, freeDailyLimit: number): number | null {
  switch (role) {
    case "guest":
      return 1;
    case "student":
      return freeDailyLimit;
    default:
      return null;
  }
}
