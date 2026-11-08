import type { PrismaClient, AiFeature, AiProvider, AiFeatureRoute } from "@prisma/client";

export const DEFAULT_FEATURE_ROUTES: Record<
  AiFeature,
  {
    primaryProvider: AiProvider;
    primaryModelId: string;
    backupProvider: AiProvider;
    backupModelId: string;
    fallbackProvider: AiProvider;
    fallbackModelId: string;
    temperature: number;
    maxTokens: number;
  }
> = {
  neko_chat: {
    primaryProvider: "groq",
    primaryModelId: "llama-3.3-70b-versatile",
    backupProvider: "gemini",
    backupModelId: "gemini-1.5-flash",
    fallbackProvider: "openrouter",
    fallbackModelId: "mistralai/mixtral-8x7b-instruct",
    temperature: 0.75,
    maxTokens: 2048,
  },
  voice_overlay: {
    primaryProvider: "groq",
    primaryModelId: "llama-3.3-70b-versatile",
    backupProvider: "openai",
    backupModelId: "gpt-4o-mini",
    fallbackProvider: "gemini",
    fallbackModelId: "gemini-1.5-flash",
    temperature: 0.85,
    maxTokens: 512,
  },
  vision_scanner: {
    primaryProvider: "gemini",
    primaryModelId: "gemini-2.0-flash",
    backupProvider: "gemini",
    backupModelId: "gemini-1.5-flash",
    fallbackProvider: "openai",
    fallbackModelId: "gpt-4o-mini",
    temperature: 0.2,
    maxTokens: 3000,
  },
  workbook_evaluator: {
    primaryProvider: "gemini",
    primaryModelId: "gemini-1.5-flash",
    backupProvider: "anthropic",
    backupModelId: "claude-3-5-haiku-20241022",
    fallbackProvider: "openai",
    fallbackModelId: "gpt-4o",
    temperature: 0.2,
    maxTokens: 4096,
  },
};

/**
 * Memastikan rute default untuk keempat fitur utama terdaftar di basis data.
 */
export async function ensureDefaultFeatureRoutes(prisma: PrismaClient): Promise<void> {
  for (const [feat, def] of Object.entries(DEFAULT_FEATURE_ROUTES) as [AiFeature, typeof DEFAULT_FEATURE_ROUTES[AiFeature]][]) {
    const existing = await prisma.aiFeatureRoute.findUnique({ where: { feature: feat } });
    if (!existing) {
      await prisma.aiFeatureRoute.create({
        data: {
          feature: feat,
          primaryProvider: def.primaryProvider,
          primaryModelId: def.primaryModelId,
          backupProvider: def.backupProvider,
          backupModelId: def.backupModelId,
          fallbackProvider: def.fallbackProvider,
          fallbackModelId: def.fallbackModelId,
          temperature: def.temperature,
          maxTokens: def.maxTokens,
          timeoutMs: 15000,
        },
      });
    }
  }
}

/**
 * Mendapatkan rute aktif untuk suatu fitur (dengan fallback jika DB belum disetel).
 */
export async function getFeatureRoute(prisma: PrismaClient, feature: AiFeature): Promise<AiFeatureRoute> {
  const route = await prisma.aiFeatureRoute.findUnique({ where: { feature } });
  if (route) return route;

  const def = DEFAULT_FEATURE_ROUTES[feature];
  return {
    feature,
    primaryProvider: def.primaryProvider,
    primaryModelId: def.primaryModelId,
    backupProvider: def.backupProvider,
    backupModelId: def.backupModelId,
    fallbackProvider: def.fallbackProvider,
    fallbackModelId: def.fallbackModelId,
    temperature: def.temperature as any,
    maxTokens: def.maxTokens,
    timeoutMs: 15000,
    updatedById: null,
    updatedAt: new Date(),
  };
}

