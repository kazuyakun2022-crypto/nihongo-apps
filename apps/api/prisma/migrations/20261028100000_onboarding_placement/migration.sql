-- Tujuan belajar kini diatur admin, jadi bukan enum tetap lagi
ALTER TABLE "users" ALTER COLUMN "learning_goal" TYPE VARCHAR(50) USING "learning_goal"::text;
DROP TYPE "LearningGoal";

-- Bank soal terpisah untuk tes naik tahap dan tes penempatan
ALTER TABLE "exam_questions" ADD COLUMN "exam_type" "ExamType" NOT NULL DEFAULT 'level_up';
CREATE INDEX "exam_questions_level_id_exam_type_idx" ON "exam_questions"("level_id", "exam_type");

-- Pengaturan aplikasi yang bisa diubah admin
CREATE TABLE "app_settings" (
    "key" VARCHAR(50) NOT NULL,
    "value" JSONB NOT NULL,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);
