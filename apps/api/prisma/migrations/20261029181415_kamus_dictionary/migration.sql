-- CreateTable
CREATE TABLE "dictionary_categories" (
    "id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "key" VARCHAR(40) NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "title_ja" VARCHAR(40),
    "title_kana" VARCHAR(60),
    "cover_url" TEXT,
    "tint" VARCHAR(9),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "dictionary_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dictionary_entries" (
    "id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "category_id" UUID,
    "term" VARCHAR(100) NOT NULL,
    "reading" VARCHAR(150),
    "romaji" VARCHAR(150),
    "meaning" VARCHAR(500) NOT NULL,
    "onyomi" VARCHAR(100),
    "kunyomi" VARCHAR(100),
    "explanation" TEXT,
    "note" VARCHAR(500),
    "example_sentence" TEXT,
    "example_translation" TEXT,
    "image_url" TEXT,
    "status" VARCHAR(20) NOT NULL DEFAULT 'published',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "source_key" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "dictionary_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_categories_type_key_key" ON "dictionary_categories"("type", "key");

-- CreateIndex
CREATE UNIQUE INDEX "dictionary_entries_source_key_key" ON "dictionary_entries"("source_key");

-- CreateIndex
CREATE INDEX "dictionary_entries_type_level_id_status_idx" ON "dictionary_entries"("type", "level_id", "status");

-- CreateIndex
CREATE INDEX "dictionary_entries_category_id_idx" ON "dictionary_entries"("category_id");

-- AddForeignKey
ALTER TABLE "dictionary_entries" ADD CONSTRAINT "dictionary_entries_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dictionary_entries" ADD CONSTRAINT "dictionary_entries_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "dictionary_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
