-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "module_title" VARCHAR(120);

-- AlterTable
ALTER TABLE "exam_questions" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "grammar_points" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "vocabularies" ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "lesson_blocks" (
    "id" UUID NOT NULL,
    "chapter_id" UUID NOT NULL,
    "type" VARCHAR(20) NOT NULL DEFAULT 'teks',
    "title" VARCHAR(150),
    "body" TEXT,
    "image_url" TEXT,
    "caption" VARCHAR(255),
    "sort_order" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL,
    "mime_type" VARCHAR(50) NOT NULL,
    "data" BYTEA NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_blocks_chapter_id_sort_order_idx" ON "lesson_blocks"("chapter_id", "sort_order");

-- AddForeignKey
ALTER TABLE "lesson_blocks" ADD CONSTRAINT "lesson_blocks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
