-- CreateEnum
CREATE TYPE "Role" AS ENUM ('guest', 'student', 'premium', 'teacher', 'admin');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'pending_deletion');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('jlpt', 'kerja', 'hobi', 'wisata');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('google', 'apple');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('monthly', 'yearly');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('midtrans', 'xendit');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('draft', 'review', 'published');

-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('pilihan_ganda', 'susun_kalimat', 'mendengar');

-- CreateEnum
CREATE TYPE "ChapterProgressStatus" AS ENUM ('locked', 'open', 'completed');

-- CreateEnum
CREATE TYPE "SrsItemType" AS ENUM ('vocab', 'kanji');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('placement', 'level_up', 'jlpt_sim');

-- CreateEnum
CREATE TYPE "FuriganaRule" AS ENUM ('full', 'hard_only', 'none');

-- CreateEnum
CREATE TYPE "ConversationMode" AS ENUM ('scenario', 'free');

-- CreateEnum
CREATE TYPE "InputMode" AS ENUM ('text', 'voice');

-- CreateEnum
CREATE TYPE "MessageSender" AS ENUM ('user', 'mascot');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('interest', 'mistake', 'fact');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255),
    "password_hash" VARCHAR(255),
    "is_guest" BOOLEAN NOT NULL DEFAULT false,
    "display_name" VARCHAR(50) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'student',
    "status" "UserStatus" NOT NULL DEFAULT 'active',
    "current_level_id" SMALLINT,
    "learning_goal" "LearningGoal",
    "daily_target_min" SMALLINT,
    "xp_total" INTEGER NOT NULL DEFAULT 0,
    "streak_count" INTEGER NOT NULL DEFAULT 0,
    "last_active_date" DATE,
    "email_verified_at" TIMESTAMPTZ,
    "failed_login_count" SMALLINT NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ,
    "last_login_at" TIMESTAMPTZ,
    "totp_secret" VARCHAR(64),
    "deletion_requested_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_user_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(255) NOT NULL,
    "device_name" VARCHAR(100),
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "revoked_at" TIMESTAMPTZ,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_resets" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "requested_ip" INET,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "used_at" TIMESTAMPTZ,

    CONSTRAINT "password_resets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" BIGSERIAL NOT NULL,
    "actor_id" UUID NOT NULL,
    "target_user_id" UUID,
    "action" VARCHAR(50) NOT NULL,
    "details" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "provider_ref" VARCHAR(255),
    "status" "SubscriptionStatus" NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievements" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon_url" TEXT,

    CONSTRAINT "achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "user_id" UUID NOT NULL,
    "achievement_id" INTEGER NOT NULL,
    "earned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("user_id","achievement_id")
);

-- CreateTable
CREATE TABLE "levels" (
    "id" SMALLINT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "sort_order" SMALLINT NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" UUID NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "explanation" TEXT,
    "sort_order" SMALLINT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID,
    "approved_by" UUID,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vocabularies" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "word" VARCHAR(50) NOT NULL,
    "reading" VARCHAR(50) NOT NULL,
    "meaning_id" VARCHAR(255) NOT NULL,
    "example_sentence" TEXT,
    "example_translation" TEXT,
    "audio_url" TEXT,

    CONSTRAINT "vocabularies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kanji" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "character" VARCHAR(1) NOT NULL,
    "onyomi" VARCHAR(50),
    "kunyomi" VARCHAR(50),
    "meaning_id" VARCHAR(255) NOT NULL,
    "stroke_order_url" TEXT,

    CONSTRAINT "kanji_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grammar_points" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "pattern" VARCHAR(100) NOT NULL,
    "explanation" TEXT NOT NULL,
    "example_sentence" TEXT,

    CONSTRAINT "grammar_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "type" "QuizType" NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT NOT NULL,
    "audio_url" TEXT,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scenarios" (
    "id" UUID NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "goal" TEXT NOT NULL,
    "mascot_role" TEXT NOT NULL,
    "target_vocab" JSONB,
    "max_turns" SMALLINT NOT NULL DEFAULT 20,
    "status" "ContentStatus" NOT NULL DEFAULT 'draft',
    "created_by" UUID,

    CONSTRAINT "scenarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_chapter_progress" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "status" "ChapterProgressStatus" NOT NULL DEFAULT 'open',
    "best_score" SMALLINT,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "user_chapter_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "srs_cards" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "item_type" "SrsItemType" NOT NULL,
    "item_id" UUID NOT NULL,
    "ease_factor" DECIMAL(3,2) NOT NULL DEFAULT 2.5,
    "interval_days" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "lapse_count" INTEGER NOT NULL DEFAULT 0,
    "due_date" DATE NOT NULL,
    "is_weak" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "srs_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "type" "ExamType" NOT NULL,
    "score" SMALLINT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "details" JSONB,
    "taken_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mascots" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "personality" TEXT NOT NULL,
    "avatar_url" TEXT,
    "voice_id" VARCHAR(100),

    CONSTRAINT "mascots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_level_prompts" (
    "id" SERIAL NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "max_sentence_words" SMALLINT NOT NULL,
    "furigana_rule" "FuriganaRule" NOT NULL,
    "speech_rate" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_level_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "mascot_id" INTEGER NOT NULL,
    "scenario_id" UUID,
    "level_id" SMALLINT NOT NULL,
    "mode" "ConversationMode" NOT NULL,
    "input_mode" "InputMode" NOT NULL DEFAULT 'text',
    "turn_count" SMALLINT NOT NULL DEFAULT 0,
    "pronunciation_score" SMALLINT,
    "summary" TEXT,
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL,
    "session_id" UUID NOT NULL,
    "sender" "MessageSender" NOT NULL,
    "text" TEXT NOT NULL,
    "furigana_html" TEXT,
    "audio_url" TEXT,
    "correction" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_memory" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "MemoryType" NOT NULL,
    "content" TEXT NOT NULL,
    "weight" SMALLINT NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_mascots" (
    "user_id" UUID NOT NULL,
    "mascot_id" INTEGER NOT NULL,
    "affinity_points" INTEGER NOT NULL DEFAULT 0,
    "unlocked_items" JSONB,

    CONSTRAINT "user_mascots_pkey" PRIMARY KEY ("user_id","mascot_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_user_id_key" ON "oauth_accounts"("provider", "provider_user_id");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "email_verifications_token_hash_key" ON "email_verifications"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "password_resets_token_hash_key" ON "password_resets"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "achievements_code_key" ON "achievements"("code");

-- CreateIndex
CREATE UNIQUE INDEX "levels_code_key" ON "levels"("code");

-- CreateIndex
CREATE INDEX "chapters_level_id_sort_order_idx" ON "chapters"("level_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "user_chapter_progress_user_id_chapter_id_key" ON "user_chapter_progress"("user_id", "chapter_id");

-- CreateIndex
CREATE INDEX "srs_cards_user_id_due_date_idx" ON "srs_cards"("user_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "srs_cards_user_id_item_type_item_id_key" ON "srs_cards"("user_id", "item_type", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_level_prompts_level_id_key" ON "ai_level_prompts"("level_id");

-- CreateIndex
CREATE INDEX "conversation_sessions_user_id_started_at_idx" ON "conversation_sessions"("user_id", "started_at");

-- CreateIndex
CREATE INDEX "conversation_messages_session_id_created_at_idx" ON "conversation_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "user_memory_user_id_idx" ON "user_memory"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_current_level_id_fkey" FOREIGN KEY ("current_level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verifications" ADD CONSTRAINT "email_verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_resets" ADD CONSTRAINT "password_resets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_fkey" FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vocabularies" ADD CONSTRAINT "vocabularies_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kanji" ADD CONSTRAINT "kanji_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grammar_points" ADD CONSTRAINT "grammar_points_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_progress" ADD CONSTRAINT "user_chapter_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_chapter_progress" ADD CONSTRAINT "user_chapter_progress_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "srs_cards" ADD CONSTRAINT "srs_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_level_prompts" ADD CONSTRAINT "ai_level_prompts_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_level_prompts" ADD CONSTRAINT "ai_level_prompts_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_mascot_id_fkey" FOREIGN KEY ("mascot_id") REFERENCES "mascots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_scenario_id_fkey" FOREIGN KEY ("scenario_id") REFERENCES "scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_sessions" ADD CONSTRAINT "conversation_sessions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_memory" ADD CONSTRAINT "user_memory_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mascots" ADD CONSTRAINT "user_mascots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_mascots" ADD CONSTRAINT "user_mascots_mascot_id_fkey" FOREIGN KEY ("mascot_id") REFERENCES "mascots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
