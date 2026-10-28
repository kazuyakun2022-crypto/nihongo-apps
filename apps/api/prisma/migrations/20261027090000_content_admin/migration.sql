-- AlterTable
ALTER TABLE "chapters" ADD COLUMN     "source_key" VARCHAR(100);

-- AlterTable
ALTER TABLE "exam_questions" ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "source_key" VARCHAR(100);

-- AlterTable
ALTER TABLE "grammar_points" ADD COLUMN     "example_translation" TEXT;

-- AlterTable
ALTER TABLE "quiz_questions" ADD COLUMN     "explanation" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "chapters_source_key_key" ON "chapters"("source_key");

-- CreateIndex
CREATE UNIQUE INDEX "exam_questions_source_key_key" ON "exam_questions"("source_key");

