/**
 * Membuat (atau memperbarui) akun siswa uji di level tertentu, khusus database lokal.
 * Email langsung terverifikasi dan onboarding dianggap selesai, jadi bisa langsung masuk dan mencoba fitur level itu.
 *
 * Jalankan dari apps/api:
 *   npx tsx scripts/createTestLearner.ts N3
 *   npx tsx scripts/createTestLearner.ts N5 siswa.n5@nihongo.local RahasiaKu123
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const [codeArg = "N3", emailArg, passwordArg] = process.argv.slice(2);
const code = codeArg.toUpperCase();
const email = (emailArg ?? `siswa.${code.toLowerCase()}@nihongo.local`).toLowerCase();
const password = passwordArg ?? `Siswa${code}12345`;

const dbUrl = process.env.DATABASE_URL ?? "";
if (process.env.NODE_ENV === "production" || !/@(localhost|127\.0\.0\.1)(:\d+)?\//.test(dbUrl)) {
  console.error("Ditolak: skrip ini hanya untuk database lokal (localhost), bukan production.");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const level = await db.level.findUnique({ where: { code } });
  if (!level) throw new Error(`Level ${code} tidak ada. Jalankan npm run db:seed dulu.`);

  const data = {
    passwordHash: await bcrypt.hash(password, 12),
    displayName: `Siswa ${code}`,
    role: "student" as const,
    status: "active" as const,
    isGuest: false,
    currentLevelId: level.id,
    pendingLevelId: null,
    emailVerifiedAt: new Date(),
    failedLoginCount: 0,
    lockedUntil: null,
  };
  await db.user.upsert({ where: { email }, create: { email, ...data }, update: data });
  console.log(`Akun siswa ${level.name} siap.\n  Email   : ${email}\n  Password: ${password}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
