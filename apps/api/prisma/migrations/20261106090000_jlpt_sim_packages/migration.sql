-- Simulasi JLPT: soal dikelompokkan ke paket 1-10 (pilihan siswa); kosong = bank campuran
ALTER TABLE "exam_questions" ADD COLUMN "package_no" SMALLINT;
CREATE INDEX "exam_questions_level_id_exam_type_package_no_idx" ON "exam_questions"("level_id", "exam_type", "package_no");

-- Paket contoh yang sudah diimpor (jlpt-nX-mock-01) menjadi Paket 1
UPDATE "exam_questions" SET "package_no" = CAST(SUBSTRING("source_key" FROM '^jlpt-n[1-5]-mock-([0-9]{2}):') AS SMALLINT)
WHERE "exam_type" = 'jlpt_sim' AND "source_key" ~ '^jlpt-n[1-5]-mock-[0-9]{2}:';
