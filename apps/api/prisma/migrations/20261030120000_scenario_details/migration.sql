-- AlterTable
ALTER TABLE "scenarios" ADD COLUMN     "chapter_id" UUID,
ADD COLUMN     "initial_message" TEXT,
ADD COLUMN     "sort_order" SMALLINT NOT NULL DEFAULT 0,
ADD COLUMN     "source_key" VARCHAR(100),
ADD COLUMN     "target_grammar" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "scenarios_source_key_key" ON "scenarios"("source_key");

-- AddForeignKey
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

