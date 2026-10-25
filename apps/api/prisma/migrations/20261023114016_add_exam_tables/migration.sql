-- CreateEnum
CREATE TYPE "ExamSection" AS ENUM ('kosakata', 'tata_bahasa', 'membaca', 'mendengar');

-- AlterTable
ALTER TABLE "exam_attempts" ADD COLUMN     "exam_id" TEXT,
ADD COLUMN     "finished_at" TIMESTAMPTZ,
ADD COLUMN     "result_level_id" SMALLINT,
ADD COLUMN     "section_scores" JSONB,
ADD COLUMN     "started_at" TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "pending_level_id" SMALLINT;

-- CreateTable
CREATE TABLE "level_exams" (
    "id" TEXT NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "type" "ExamType" NOT NULL,
    "question_count" SMALLINT NOT NULL DEFAULT 20,
    "time_limit_min" SMALLINT NOT NULL DEFAULT 15,
    "pass_score" SMALLINT NOT NULL DEFAULT 70,
    "section_min_score" SMALLINT NOT NULL DEFAULT 50,
    "cooldown_hours" SMALLINT NOT NULL DEFAULT 0,
    "min_chapter_completion" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "level_exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_questions" (
    "id" TEXT NOT NULL,
    "level_id" SMALLINT NOT NULL,
    "section" "ExamSection" NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'pilihan_ganda',
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "audio_url" TEXT,
    "difficulty" SMALLINT NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'published',

    CONSTRAINT "exam_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempt_answers" (
    "id" UUID NOT NULL,
    "attempt_id" UUID NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL,

    CONSTRAINT "exam_attempt_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "level_exams_level_id_type_key" ON "level_exams"("level_id", "type");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_pending_level_id_fkey" FOREIGN KEY ("pending_level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "level_exams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_result_level_id_fkey" FOREIGN KEY ("result_level_id") REFERENCES "levels"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_exams" ADD CONSTRAINT "level_exams_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_questions" ADD CONSTRAINT "exam_questions_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "levels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempt_answers" ADD CONSTRAINT "exam_attempt_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "exam_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
