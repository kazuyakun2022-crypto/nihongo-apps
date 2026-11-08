-- CreateEnum
CREATE TYPE "AiProvider" AS ENUM ('groq', 'gemini', 'openai', 'anthropic', 'openrouter');

-- CreateEnum
CREATE TYPE "AiKeyStatus" AS ENUM ('active', 'standby', 'degraded', 'exhausted', 'revoked');

-- CreateEnum
CREATE TYPE "AiCapability" AS ENUM ('TEXT_LLM', 'VISION_OCR', 'AUDIO_STT', 'AUDIO_TTS');

-- CreateEnum
CREATE TYPE "AiFeature" AS ENUM ('neko_chat', 'voice_overlay', 'vision_scanner', 'workbook_evaluator');

-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "dialogue_script" JSONB,
ADD COLUMN     "furigana_rule" "FuriganaRule" NOT NULL DEFAULT 'full',
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "keigo_type" VARCHAR(100),
ADD COLUMN     "location" VARCHAR(150),
ADD COLUMN     "speech_rate" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
ADD COLUMN     "system_prompt" TEXT,
ADD COLUMN     "user_role" VARCHAR(100);

-- CreateTable
CREATE TABLE "camera_scan_histories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "original_img_url" TEXT NOT NULL,
    "raw_japanese_text" TEXT NOT NULL,
    "furigana_html" TEXT NOT NULL,
    "romaji_text" TEXT NOT NULL,
    "indonesian_trans" TEXT NOT NULL,
    "detected_level" VARCHAR(10),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "camera_scan_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_token_details" (
    "id" UUID NOT NULL,
    "scan_id" UUID NOT NULL,
    "surface_form" VARCHAR(100) NOT NULL,
    "dictionary_form" VARCHAR(100) NOT NULL,
    "reading_kana" VARCHAR(100) NOT NULL,
    "romaji" VARCHAR(150) NOT NULL,
    "part_of_speech" VARCHAR(50) NOT NULL,
    "indonesian_mean" TEXT NOT NULL,
    "jlpt_level" VARCHAR(10) NOT NULL,
    "pitch_accent" VARCHAR(50),

    CONSTRAINT "scan_token_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" VARCHAR(300),
    "image_url" TEXT NOT NULL,
    "link_url" VARCHAR(500) NOT NULL,
    "badge" VARCHAR(50),
    "target" VARCHAR(20) NOT NULL DEFAULT '_self',
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "shading_opacity" INTEGER NOT NULL DEFAULT 60,
    "shading_position" VARCHAR(30) NOT NULL DEFAULT 'left',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_provider_keys" (
    "id" UUID NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "label" VARCHAR(100) NOT NULL,
    "encrypted_key" TEXT NOT NULL,
    "key_iv" VARCHAR(64) NOT NULL,
    "key_tag" VARCHAR(64) NOT NULL,
    "key_hint" VARCHAR(30) NOT NULL,
    "priority" SMALLINT NOT NULL DEFAULT 1,
    "weight" SMALLINT NOT NULL DEFAULT 100,
    "status" "AiKeyStatus" NOT NULL DEFAULT 'active',
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "last_latency_ms" INTEGER,
    "cooldown_until" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_provider_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_model_registry" (
    "id" UUID NOT NULL,
    "provider" "AiProvider" NOT NULL,
    "model_id" VARCHAR(120) NOT NULL,
    "display_name" VARCHAR(150) NOT NULL,
    "capabilities" "AiCapability"[],
    "context_length" INTEGER,
    "is_deprecated" BOOLEAN NOT NULL DEFAULT false,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_model_registry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_feature_routes" (
    "feature" "AiFeature" NOT NULL,
    "primary_provider" "AiProvider" NOT NULL,
    "primary_model_id" VARCHAR(120) NOT NULL,
    "backup_provider" "AiProvider",
    "backup_model_id" VARCHAR(120),
    "fallback_provider" "AiProvider",
    "fallback_model_id" VARCHAR(120),
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 2048,
    "timeout_ms" INTEGER NOT NULL DEFAULT 15000,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_feature_routes_pkey" PRIMARY KEY ("feature")
);

-- CreateTable
CREATE TABLE "ai_circuit_logs" (
    "id" BIGSERIAL NOT NULL,
    "provider_key_id" UUID,
    "provider" "AiProvider" NOT NULL,
    "feature" "AiFeature",
    "http_status" SMALLINT,
    "error_type" VARCHAR(50),
    "error_message" TEXT,
    "latency_ms" INTEGER,
    "failover_triggered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_circuit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "camera_scan_histories_user_id_created_at_idx" ON "camera_scan_histories"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "scan_token_details_scan_id_idx" ON "scan_token_details"("scan_id");

-- CreateIndex
CREATE INDEX "banners_is_active_order_idx" ON "banners"("is_active", "order");

-- CreateIndex
CREATE INDEX "ai_provider_keys_provider_status_priority_idx" ON "ai_provider_keys"("provider", "status", "priority");

-- CreateIndex
CREATE INDEX "ai_model_registry_provider_is_deprecated_idx" ON "ai_model_registry"("provider", "is_deprecated");

-- CreateIndex
CREATE UNIQUE INDEX "ai_model_registry_provider_model_id_key" ON "ai_model_registry"("provider", "model_id");

-- CreateIndex
CREATE INDEX "ai_circuit_logs_provider_created_at_idx" ON "ai_circuit_logs"("provider", "created_at");

-- AddForeignKey
ALTER TABLE "camera_scan_histories" ADD CONSTRAINT "camera_scan_histories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scan_token_details" ADD CONSTRAINT "scan_token_details_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "camera_scan_histories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_provider_keys" ADD CONSTRAINT "ai_provider_keys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feature_routes" ADD CONSTRAINT "ai_feature_routes_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_circuit_logs" ADD CONSTRAINT "ai_circuit_logs_provider_key_id_fkey" FOREIGN KEY ("provider_key_id") REFERENCES "ai_provider_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;
