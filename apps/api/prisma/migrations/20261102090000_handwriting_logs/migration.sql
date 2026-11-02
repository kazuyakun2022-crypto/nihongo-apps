-- Riwayat kesalahan tulisan tangan (Tulis di Buku) untuk variasi penjelasan
CREATE TABLE "handwriting_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "char" VARCHAR(4) NOT NULL,
    "issue" VARCHAR(40) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "handwriting_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "handwriting_logs_user_id_char_issue_key" ON "handwriting_logs"("user_id", "char", "issue");
CREATE INDEX "handwriting_logs_user_id_idx" ON "handwriting_logs"("user_id");

ALTER TABLE "handwriting_logs" ADD CONSTRAINT "handwriting_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
