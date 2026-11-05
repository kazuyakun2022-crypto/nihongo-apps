/**
 * Impor paket soal Simulasi JLPT dari prisma/data/jlpt-sim/*.json ke bank soal (examType jlpt_sim).
 * Format file sama dengan tombol "Impor paket JSON" di Admin > Konten > Ujian > Simulasi JLPT.
 * Aman diulang: soal dengan examSlug + bagian + nomor yang sama diperbarui, bukan digandakan.
 *
 * Jalankan dari apps/api: npm run content:jlpt-sim
 */
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { jlptPackageSchema, mapJlptPackage } from "../../src/modules/exam/domain/jlptImport";

const db = new PrismaClient();
const DIR = join(process.cwd(), "prisma", "data", "jlpt-sim");

async function main() {
  const files = readdirSync(DIR).filter((f) => f.endsWith(".json")).sort();
  let failed = 0;
  for (const file of files) {
    const parsed = jlptPackageSchema.safeParse(JSON.parse(readFileSync(join(DIR, file), "utf8")));
    if (!parsed.success) {
      failed++;
      console.error(`${file}: format tidak valid\n  ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  ")}`);
      continue;
    }
    const { level: code, questions, errors } = mapJlptPackage(parsed.data);
    if (errors.length) {
      failed++;
      console.error(`${file}:\n  ${errors.join("\n  ")}`);
      continue;
    }
    const level = await db.level.findUnique({ where: { code } });
    if (!level) throw new Error(`Level ${code} belum ada; jalankan seed lebih dulu.`);
    await db.$transaction(
      questions.map((q) => {
        const data = { ...q, levelId: level.id, examType: "jlpt_sim" as const, status: "published", options: q.options };
        return db.examQuestion.upsert({ where: { sourceKey: q.sourceKey }, create: data, update: data });
      }),
    );
    console.log(`${file}: ${questions.length} soal ${code} (${parsed.data.examSlug})`);
  }
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
