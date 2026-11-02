-- CreateTable
CREATE TABLE "tts_cache" (
    "key" VARCHAR(64) NOT NULL,
    "voice" VARCHAR(60) NOT NULL,
    "text" VARCHAR(300) NOT NULL,
    "mime_type" VARCHAR(30) NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tts_cache_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "tts_cache_text_idx" ON "tts_cache"("text");
