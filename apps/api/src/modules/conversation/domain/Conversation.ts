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
  /** Kalimat pembuka dari admin; null = dibuat AI. */
  initialMessage: string | null;
  /** Pola tata bahasa yang dilatih dalam skenario. */
  targetGrammar: string[];
}

/** Skenario yang bisa dipilih siswa di daftar latihan ngobrol. */
export interface ScenarioListItem {
  id: string;
  title: string;
  goal: string;
  levelCode: string;
  chapterId: string | null;
  chapterTitle: string | null;
  targetGrammar: string[];
}

/** Emosi dominan Neko-sensei per balasan (ditulis AI di <correction_data>). */
export const CONVERSATION_EMOTIONS = ["playful", "encouraging", "thinking", "excited"] as const;
export type ConversationEmotion = (typeof CONVERSATION_EMOTIONS)[number];

/** Kecepatan TTS per balasan yang dipilih AI berdasarkan konteks. */
export const VOICE_SPEEDS = ["lambat", "normal", "cepat"] as const;
export type VoiceSpeed = (typeof VOICE_SPEEDS)[number];

const VOICE_SPEED_MULTIPLIER: Record<VoiceSpeed, number> = { lambat: 0.82, normal: 1.0, cepat: 1.12 };

/** Hitung speech rate final: base level × multiplier per konteks. */
export function finalSpeechRate(baseLevelRate: number, speed?: VoiceSpeed): number {
  const factor = VOICE_SPEED_MULTIPLIER[speed ?? "normal"];
  return Math.round(baseLevelRate * factor * 100) / 100;
}

export interface LearnerMemories {
  /** Hobi/minat (user_memory.type = interest). */
  interests: string[];
  /** Kesalahan yang sering muncul (user_memory.type = mistake). */
  weakTopics: string[];
  /** Fakta lain tentang pengguna (user_memory.type = fact). */
  facts: string[];
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
  memories: LearnerMemories;
  /** Kanji yang sudah dipelajari sampai level pengguna. Kosong berarti pemula: hindari kanji. */
  allowedKanji: Set<string>;
  /** Tujuan belajar dari pendaftaran (mis. "Kerja atau magang di Jepang"). */
  learningGoal?: string | null;
  /** Bab yang sedang dipelajari beserta pola tata bahasanya. */
  currentChapter?: { title: string; grammar: string[] } | null;
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
