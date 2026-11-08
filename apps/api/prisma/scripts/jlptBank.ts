/**
 * Modul bank soal Simulasi JLPT: membuat, mengekspor, dan menginjeksi banyak paket sekaligus.
 * Panduan lengkap: docs/jlpt-bank.md
 *
 *   npm run soal:jlpt -- buat    --tingkat N4,N3 --paket 2-5     buat paket dengan AI → DRAFT di database ini
 *   npm run soal:jlpt -- ekspor  [--tingkat ..] [--paket ..]     database ini → file bank (setelah direview admin)
 *   npm run soal:jlpt -- injeksi [--tingkat ..] [--paket ..]     file bank → database tujuan (DATABASE_URL)
 *
 * Opsi injeksi:
 *   --uji                 tampilkan rencana saja, tidak menulis apa pun
 *   --status=ikut-file    status soal mengikuti file (bawaan) | draft | published
 *   --tarik-yang-hilang   soal terbit di database yang tidak ada lagi di file paketnya ditarik ke draft
 *   --ya                  lewati konfirmasi untuk database selain localhost (dipakai isi-production.sh)
 *   --dir=<folder>        folder bank (bawaan prisma/data/jlpt-sim/bank)
 */
import "dotenv/config";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { createInterface } from "node:readline/promises";
import { PrismaClient } from "@prisma/client";
import { SIM_QUESTION_TYPES, type JlptCode, type SimSection } from "../../src/modules/exam/domain/JlptSim";
import { jlptPackageSchema, mapJlptPackage, type ImportedQuestion } from "../../src/modules/exam/domain/jlptImport";
import {
  buildBankFiles,
  parseLevels,
  parsePackages,
  planInjection,
  resolveStatus,
  type BankRow,
  type PlanEntry,
  type StatusMode,
} from "../../src/modules/exam/domain/jlptBank";
import { GenerationStopped, generatePackage } from "./generateJlptPackage";

const DEFAULT_DIR = join(process.cwd(), "prisma", "data", "jlpt-sim", "bank");

const USAGE = `Bank soal Simulasi JLPT (panduan: docs/jlpt-bank.md)

  npm run soal:jlpt -- buat    --tingkat N4,N3 --paket 2-5   buat paket dengan AI, masuk DRAFT ke database ini
  npm run soal:jlpt -- ekspor  [--tingkat ..] [--paket ..]   database ini -> file bank (setelah direview admin)
  npm run soal:jlpt -- injeksi [--tingkat ..] [--paket ..]   file bank -> database DATABASE_URL

Opsi injeksi:
  --uji                 tampilkan rencana saja, tidak menulis apa pun
  --status=ikut-file    status soal mengikuti file (bawaan) | draft | published
  --tarik-yang-hilang   soal terbit di database yang tidak ada lagi di file paketnya ditarik ke draft
  --ya                  lewati konfirmasi untuk database selain localhost
  --dir=<folder>        folder bank (bawaan prisma/data/jlpt-sim/bank)

--tingkat: N5,N4 atau semua (bawaan semua). --paket: 2-5,7 atau semua.`;
const pad = (n: number) => String(n).padStart(2, "0");
const paketLabel = (n: number | null) => (n ? `Paket ${pad(n)}` : "Campuran");

// ── Argumen ──
function parseArgs(argv: string[]) {
  const [command, ...rest] = argv;
  const flags = new Map<string, string | true>();
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (!a.startsWith("--")) continue;
    const [k, v] = a.slice(2).split("=", 2);
    if (v !== undefined) flags.set(k, v);
    else if (rest[i + 1] && !rest[i + 1].startsWith("--")) flags.set(k, rest[++i]);
    else flags.set(k, true);
  }
  const str = (k: string) => (typeof flags.get(k) === "string" ? (flags.get(k) as string) : undefined);
  return { command, flags, str, has: (k: string) => flags.has(k) };
}

// ── Database tujuan ──
function targetInfo() {
  const raw = process.env.DATABASE_URL ?? "";
  try {
    const u = new URL(raw);
    const local = /^(localhost|127\.0\.0\.1|::1)$/.test(u.hostname);
    return { label: `${u.hostname}:${u.port || 5432}${u.pathname}`, local };
  } catch {
    throw new Error("DATABASE_URL kosong atau tidak valid.");
  }
}

async function confirmRemote(action: string, skip: boolean) {
  const t = targetInfo();
  console.log(`Database tujuan: ${t.label}${t.local ? " (lokal)" : ""}`);
  if (t.local || skip) return;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`${action} ke database BUKAN lokal. Ketik 'ya' untuk lanjut: `);
  rl.close();
  if (answer.trim() !== "ya") {
    console.log("Dibatalkan.");
    process.exit(1);
  }
}

function printTable(head: string[], rows: (string | number)[][]) {
  const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => String(r[i]).length)));
  const line = (cells: (string | number)[]) => cells.map((c, i) => String(c).padEnd(widths[i])).join("  ");
  console.log(line(head));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));
}

function listJson(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return listJson(p);
    return name.endsWith(".json") ? [p] : [];
  });
}

// ── ekspor: database → file ──
async function ekspor(db: PrismaClient, args: ReturnType<typeof parseArgs>) {
  const levels = parseLevels(args.str("tingkat"));
  const packages = args.str("paket") ? parsePackages(args.str("paket")) : null;
  const dir = args.str("dir") ?? DEFAULT_DIR;
  console.log(`Sumber: ${targetInfo().label}`);

  const rows = await db.examQuestion.findMany({
    where: {
      examType: "jlpt_sim",
      type: { in: [...SIM_QUESTION_TYPES] },
      level: { code: { in: levels } },
      ...(packages ? { packageNo: { in: packages } } : {}),
    },
    include: { level: { select: { code: true } } },
    orderBy: [{ levelId: "asc" }, { packageNo: "asc" }],
  });
  const bankRows: BankRow[] = rows.map((r) => ({
    id: r.id,
    levelCode: r.level.code as JlptCode,
    packageNo: r.packageNo,
    section: r.section as SimSection,
    category: r.category,
    question: r.question,
    passage: r.passage,
    options: Array.isArray(r.options) ? (r.options as unknown[]).map(String) : [],
    correctAnswer: r.correctAnswer,
    audioUrl: r.audioUrl,
    imageUrl: r.imageUrl,
    explanation: r.explanation,
    difficulty: r.difficulty,
    status: r.status,
    sourceKey: r.sourceKey,
  }));
  const { files, skipped } = buildBankFiles(bankRows);
  for (const f of files) {
    const p = join(dir, f.path);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(f.pkg, null, 2) + "\n");
  }
  printTable(
    ["File", "Soal", "Terbit", "Draft"],
    files.map((f) => {
      const qs = f.pkg.sections.flatMap((s) => s.questions);
      return [f.path, qs.length, qs.filter((q) => q.status === "published").length, qs.filter((q) => q.status !== "published").length];
    }),
  );
  for (const s of skipped) console.warn(`Peringatan: ${s}`);
  console.log(`\n${files.length} file ditulis ke ${relative(process.cwd(), dir)}. Commit folder itu supaya bisa diinjeksi ke production.`);
}

// ── injeksi: file → database ──
async function injeksi(db: PrismaClient, args: ReturnType<typeof parseArgs>) {
  const levels = new Set(parseLevels(args.str("tingkat")));
  const packages = args.str("paket") ? new Set(parsePackages(args.str("paket"))) : null;
  const dir = args.str("dir") ?? DEFAULT_DIR;
  const modeRaw = args.str("status") ?? "ikut-file";
  if (!["ikut-file", "draft", "published"].includes(modeRaw)) throw new Error(`--status harus ikut-file, draft, atau published.`);
  const mode = modeRaw as StatusMode;

  const files = listJson(dir);
  if (!files.length) throw new Error(`Tidak ada file paket di ${relative(process.cwd(), dir)}. Jalankan "ekspor" dulu.`);

  // 1. Validasi SEMUA file sebelum menulis apa pun
  const errors: string[] = [];
  const items: { level: JlptCode; q: ImportedQuestion; file: string }[] = [];
  for (const file of files) {
    const rel = relative(process.cwd(), file);
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      errors.push(`${rel}: bukan JSON yang valid.`);
      continue;
    }
    const parsed = jlptPackageSchema.safeParse(json);
    if (!parsed.success) {
      for (const i of parsed.error.issues.slice(0, 10)) errors.push(`${rel}: ${i.path.join(".")}: ${i.message}`);
      continue;
    }
    const { level, questions, errors: mapErrors } = mapJlptPackage(parsed.data);
    for (const e of mapErrors) errors.push(`${rel}: ${e}`);
    if (!levels.has(level)) continue;
    for (const q of questions) {
      if (packages && (q.packageNo === null || !packages.has(q.packageNo))) continue;
      items.push({ level, q, file: rel });
    }
  }
  const seen = new Map<string, string>();
  for (const { q, file } of items) {
    const other = seen.get(q.sourceKey);
    if (other) errors.push(`sourceKey ${q.sourceKey} muncul di ${other} dan ${file}.`);
    seen.set(q.sourceKey, file);
  }
  if (errors.length) {
    console.error(`File bank belum valid (${errors.length} masalah), tidak ada yang ditulis:\n- ${errors.slice(0, 40).join("\n- ")}`);
    process.exit(1);
  }
  if (!items.length) {
    console.log("Tidak ada soal yang cocok dengan filter --tingkat/--paket.");
    return;
  }

  // 2. Cocokkan dengan database tujuan
  console.log(`Sumber file: ${relative(process.cwd(), dir)} (${files.length} file)`);
  const levelRows = await db.level.findMany({ where: { code: { in: [...levels] } }, select: { id: true, code: true } });
  const levelId = new Map(levelRows.map((l) => [l.code, l.id]));
  const missingLevels = [...new Set(items.map((i) => i.level))].filter((l) => !levelId.has(l));
  if (missingLevels.length) throw new Error(`Level ${missingLevels.join(", ")} belum ada di database tujuan. Jalankan seed dulu.`);

  const keys = items.map((i) => i.q.sourceKey);
  const existingRows: { sourceKey: string | null; examType: string; levelId: number }[] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    existingRows.push(...(await db.examQuestion.findMany({ where: { sourceKey: { in: keys.slice(i, i + 1000) } }, select: { sourceKey: true, examType: true, levelId: true } })));
  }
  // sourceKey unik di seluruh bank; jangan sampai menimpa soal tes naik tahap atau soal level lain
  const conflicts = existingRows.filter((r) => {
    const it = items.find((i) => i.q.sourceKey === r.sourceKey)!;
    return r.examType !== "jlpt_sim" || r.levelId !== levelId.get(it.level);
  });
  if (conflicts.length) {
    console.error(`Dibatalkan: ${conflicts.length} sourceKey sudah dipakai soal lain (jenis/level berbeda), mis. ${conflicts[0].sourceKey}.`);
    process.exit(1);
  }
  const existing = new Set(existingRows.map((r) => r.sourceKey!));
  const plan = planInjection(items, existing, mode);

  console.log(`\nRencana injeksi (status: ${mode}):`);
  printTable(
    ["Tingkat", "Paket", "Soal", "Baru", "Diperbarui", "Terbit", "Draft"],
    plan.map((p) => [p.level, paketLabel(p.packageNo), p.total, p.created, p.updated, p.published, p.draft]),
  );
  const total = plan.reduce((n, p) => n + p.total, 0);
  console.log(`Total ${total} soal.`);
  if (args.has("uji")) {
    console.log("\nMode uji: tidak ada yang ditulis.");
    return;
  }

  await confirmRemote(`Menulis ${total} soal`, args.has("ya"));

  // 3. Tulis per paket, satu transaksi per paket
  for (const p of plan) {
    const group = items.filter((i) => i.level === p.level && i.q.packageNo === p.packageNo);
    const lid = levelId.get(p.level)!;
    await db.$transaction(
      group.map(({ q }) => {
        const { status: _fileStatus, ...rest } = q;
        const data = { ...rest, levelId: lid, examType: "jlpt_sim" as const, status: resolveStatus(q, mode), options: q.options };
        return db.examQuestion.upsert({ where: { sourceKey: q.sourceKey }, create: data, update: data });
      }),
    );
    let pulled = 0;
    if (args.has("tarik-yang-hilang")) {
      const res = await db.examQuestion.updateMany({
        where: {
          levelId: lid,
          examType: "jlpt_sim",
          packageNo: p.packageNo,
          status: "published",
          sourceKey: { not: null, notIn: group.map((g) => g.q.sourceKey) },
        },
        data: { status: "draft" },
      });
      pulled = res.count;
    }
    console.log(`${p.level} ${paketLabel(p.packageNo)}: ${group.length} soal ditulis${pulled ? `, ${pulled} soal lama ditarik ke draft` : ""}.`);
  }

  // 4. Verifikasi: hitung ulang isi database tujuan
  await verify(db, plan, levelId);
}

async function verify(db: PrismaClient, plan: PlanEntry[], levelId: Map<string, number>) {
  const rows = await db.examQuestion.groupBy({
    by: ["levelId", "packageNo", "status"],
    where: { examType: "jlpt_sim", levelId: { in: [...new Set(plan.map((p) => levelId.get(p.level)!))] } },
    _count: { _all: true },
  });
  const count = (lid: number, no: number | null, status: string) =>
    rows.find((r) => r.levelId === lid && r.packageNo === no && r.status === status)?._count._all ?? 0;
  console.log("\nIsi database setelah injeksi:");
  let mismatch = 0;
  printTable(
    ["Tingkat", "Paket", "Terbit", "Draft", "Cek"],
    plan.map((p) => {
      const lid = levelId.get(p.level)!;
      const pub = count(lid, p.packageNo, "published");
      const dr = count(lid, p.packageNo, "draft");
      // Database boleh berisi soal lain di paket yang sama (mis. buatan admin di sana), jadi minimal sebanyak rencana
      const ok = pub >= p.published && pub + dr >= p.total;
      if (!ok) mismatch++;
      return [p.level, paketLabel(p.packageNo), pub, dr, ok ? "cocok" : "BERBEDA"];
    }),
  );
  if (mismatch) {
    console.error(`\n${mismatch} paket tidak sesuai rencana. Periksa log di atas.`);
    process.exit(1);
  }
  console.log("\nSelesai. Semua paket sesuai rencana.");
}

// ── buat: AI → draft di database ini ──
async function buat(db: PrismaClient, args: ReturnType<typeof parseArgs>) {
  if (!args.str("tingkat") || !args.str("paket")) throw new Error('Isi --tingkat dan --paket, mis. buat --tingkat N4,N3 --paket 2-5');
  const levels = parseLevels(args.str("tingkat"));
  const packages = parsePackages(args.str("paket"));
  const jobs = levels.flatMap((l) => packages.map((p) => ({ level: l, paket: p })));
  await confirmRemote(`Membuat ${jobs.length} paket (draft)`, args.has("ya"));
  const done: string[] = [];
  for (const [i, job] of jobs.entries()) {
    console.log(`\n=== [${i + 1}/${jobs.length}] ${job.level} ${paketLabel(job.paket)} ===`);
    try {
      const r = await generatePackage(job.level, job.paket, { db, fileOnly: args.has("hanya-file"), skipCheck: args.has("tanpa-cek") });
      done.push(`${job.level} ${paketLabel(job.paket)}: ${r.total} soal (${r.created} baru)`);
    } catch (err) {
      if (!(err instanceof GenerationStopped)) throw err;
      const left = jobs.slice(i).map((j) => `${j.level}/${j.paket}`).join(", ");
      console.error(`\n${err.message}\nBelum selesai: ${left}. Jalankan perintah yang sama nanti; paket yang sudah jadi dilewati otomatis.`);
      break;
    }
  }
  if (done.length) console.log(`\nSelesai dibuat:\n- ${done.join("\n- ")}\nTinjau & terbitkan di Admin, lalu jalankan "ekspor".`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const db = new PrismaClient();
  try {
    if (args.command === "ekspor") await ekspor(db, args);
    else if (args.command === "injeksi") await injeksi(db, args);
    else if (args.command === "buat") await buat(db, args);
    else {
      console.log(USAGE);
      process.exitCode = args.command ? 1 : 0;
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
