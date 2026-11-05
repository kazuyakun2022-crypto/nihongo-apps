-- Simulasi JLPT mengikuti struktur resmi: bagian Dokkai, tipe soal (Daimon), dan teks bacaan/skrip dengar
ALTER TYPE "ExamSection" ADD VALUE 'dokkai';

ALTER TABLE "exam_questions" ADD COLUMN "category" VARCHAR(40);
ALTER TABLE "exam_questions" ADD COLUMN "passage" TEXT;

-- Skor simulasi JLPT kini disimpan dalam skala 0-180 (sebelumnya persen)
UPDATE "exam_attempts" SET "score" = ROUND("score" * 1.8) WHERE "type" = 'jlpt_sim' AND "finished_at" IS NOT NULL;
