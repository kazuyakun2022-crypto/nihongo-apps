import type { AiProvider, AiCapability } from "@prisma/client";

export interface DiscoveredModel {
  modelId: string;
  displayName: string;
  capabilities: AiCapability[];
  contextLength?: number;
}

/**
 * Menentukan kapabilitas model AI (TEXT_LLM, VISION_OCR, AUDIO_STT, AUDIO_TTS)
 * secara cerdas berdasarkan ID model, pola penamaan, dan metadata penyedia.
 */
export function determineCapabilities(
  provider: AiProvider,
  modelId: string,
  extraMeta?: { supportedGenerationMethods?: string[]; modalities?: string[] },
): AiCapability[] {
  const idLower = modelId.toLowerCase();
  const caps = new Set<AiCapability>();

  // 1. Audio Speech-to-Text (STT)
  if (idLower.includes("whisper") || idLower.includes("stt") || idLower.includes("speech-to-text")) {
    caps.add("AUDIO_STT");
  }

  // 2. Audio Text-to-Speech (TTS)
  if (idLower.includes("tts") || idLower.includes("speech") || idLower.includes("elevenlabs") || idLower.includes("cartesia")) {
    caps.add("AUDIO_TTS");
  }

  // 3. Vision / Multimodal OCR
  const isVisionModel =
    idLower.includes("vision") ||
    idLower.includes("ocr") ||
    idLower.includes("gpt-4o") ||
    idLower.includes("gpt-4-turbo") ||
    idLower.includes("claude-3-5") ||
    idLower.includes("claude-3-opus") ||
    idLower.includes("claude-3-sonnet") ||
    idLower.includes("claude-3-haiku") ||
    idLower.includes("gemini-1.5") ||
    idLower.includes("gemini-2.0") ||
    idLower.includes("pixtral") ||
    idLower.includes("llava") ||
    (extraMeta?.modalities && extraMeta.modalities.includes("image"));

  if (isVisionModel) {
    caps.add("VISION_OCR");
  }

  // 4. Text LLM (Penalaran teks, chat, tata bahasa, terjemahan)
  // Sebagian besar model multi-modal dan LLM murni memiliki kapabilitas ini
  if (!caps.has("AUDIO_STT") && !caps.has("AUDIO_TTS")) {
    caps.add("TEXT_LLM");
  } else if (isVisionModel || idLower.includes("llama") || idLower.includes("gpt") || idLower.includes("gemini")) {
    caps.add("TEXT_LLM");
  }

  // Khusus Gemini method check
  if (extraMeta?.supportedGenerationMethods?.includes("generateContent")) {
    caps.add("TEXT_LLM");
  }

  return Array.from(caps);
}

/**
 * Memanggil REST API resmi penyedia untuk menguji validitas kunci
 * dan menarik daftar model aktif (Dynamic Model Discovery Ping).
 */
export async function fetchDiscoveredModels(
  provider: AiProvider,
  rawApiKey: string,
): Promise<DiscoveredModel[]> {
  const key = rawApiKey.trim();
  const timeoutMs = 15000;

  switch (provider) {
    case "groq": {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Groq API gagal (${res.status}): ${errText || res.statusText}`);
      }

      const data = (await res.json()) as { data?: { id: string; context_window?: number }[] };
      const items = data.data || [];

      return items
        .filter((m) => !m.id.includes("guard") && !m.id.includes("whisper-large-v3-turbo-deprecated"))
        .map((m) => ({
          modelId: m.id,
          displayName: formatDisplayName(m.id),
          capabilities: determineCapabilities("groq", m.id),
          contextLength: m.context_window || 8192,
        }));
    }

    case "gemini": {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, {
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Google Gemini API gagal (${res.status}): ${errText || res.statusText}`);
      }

      const data = (await res.json()) as {
        models?: {
          name: string;
          displayName?: string;
          supportedGenerationMethods?: string[];
          inputTokenLimit?: number;
        }[];
      };

      const items = data.models || [];
      return items
        .filter((m) => {
          // Hanya sertakan model yang mendukung generateContent
          const methods = m.supportedGenerationMethods || [];
          return methods.includes("generateContent");
        })
        .map((m) => {
          // name berformat "models/gemini-1.5-flash" -> ambil "gemini-1.5-flash"
          const cleanId = m.name.replace(/^models\//, "");
          return {
            modelId: cleanId,
            displayName: m.displayName || formatDisplayName(cleanId),
            capabilities: determineCapabilities("gemini", cleanId, {
              supportedGenerationMethods: m.supportedGenerationMethods,
            }),
            contextLength: m.inputTokenLimit || 1048576,
          };
        });
    }

    case "openai": {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenAI API gagal (${res.status}): ${errText || res.statusText}`);
      }

      const data = (await res.json()) as { data?: { id: string }[] };
      const items = data.data || [];

      // Filter model relevan untuk NihonGo (gpt, o1, whisper, tts)
      const allowed = items.filter((m) => {
        const id = m.id.toLowerCase();
        return (
          id.startsWith("gpt-") ||
          id.startsWith("o1") ||
          id.startsWith("chatgpt-") ||
          id.includes("whisper") ||
          id.includes("tts")
        );
      });

      return allowed.map((m) => ({
        modelId: m.id,
        displayName: formatDisplayName(m.id),
        capabilities: determineCapabilities("openai", m.id),
        contextLength: m.id.includes("mini") ? 128000 : 128000,
      }));
    }

    case "anthropic": {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`Anthropic API gagal (${res.status}): ${errText || res.statusText}`);
      }

      const data = (await res.json()) as { data?: { id: string; display_name?: string }[] };
      const items = data.data || [];

      return items.map((m) => ({
        modelId: m.id,
        displayName: m.display_name || formatDisplayName(m.id),
        capabilities: determineCapabilities("anthropic", m.id),
        contextLength: 200000,
      }));
    }

    case "openrouter": {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: {
          Authorization: `Bearer ${key}`,
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        throw new Error(`OpenRouter API gagal (${res.status}): ${errText || res.statusText}`);
      }

      const data = (await res.json()) as {
        data?: {
          id: string;
          name?: string;
          context_length?: number;
          architecture?: { modality?: string };
        }[];
      };

      const items = data.data || [];
      return items.slice(0, 100).map((m) => ({
        modelId: m.id,
        displayName: m.name || m.id,
        capabilities: determineCapabilities("openrouter", m.id, {
          modalities: m.architecture?.modality ? [m.architecture.modality] : [],
        }),
        contextLength: m.context_length || 32768,
      }));
    }

    default:
      throw new Error(`Penyedia AI '${provider}' belum didukung untuk auto-discovery.`);
  }
}

/**
 * Format nama tampilan yang rapi dari ID model.
 */
function formatDisplayName(modelId: string): string {
  return modelId
    .replace(/^openai\//, "")
    .replace(/^qwen\//, "")
    .replace(/^meta-llama\//, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

