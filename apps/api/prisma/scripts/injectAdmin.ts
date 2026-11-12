import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Ambil DATABASE_URL dari argument CLI jika disediakan (misal: tsx injectAdmin.ts "postgresql://...")
const targetUrl = process.argv[2] && process.argv[2].startsWith("postgres")
  ? process.argv[2]
  : process.env.DATABASE_URL || process.env.PROD_DATABASE_URL;

if (!targetUrl) {
  console.error("\n❌ [ERROR] DATABASE_URL tidak ditemukan!");
  console.error("Silakan berikan DATABASE_URL lewat environment variable atau parameter:");
  console.error("Contoh: npx tsx prisma/scripts/injectAdmin.ts \"postgresql://user:pass@host:5432/dbname?sslmode=require\"\n");
  process.exit(1);
}

const dbUrl: string = targetUrl;

const db = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

async function main() {
  console.log("\n=======================================================");
  console.log("🚀 INJEKSI AKUN ADMIN & SUPER ADMIN");
  console.log("=======================================================");

  // Sensor URL untuk keamanan tampilan
  try {
    const parsed = new URL(dbUrl.replace("postgresql://", "http://").replace("postgres://", "http://"));
    console.log(`📡 Target Database: ${parsed.hostname}:${parsed.port || "5432"}${parsed.pathname}`);
  } catch {
    console.log("📡 Target Database URL terdeteksi.");
  }

  // Kredensial Super Admin
  const superEmail = (process.env.SEED_SUPERADMIN_EMAIL || "superadmin@nihongo.app").toLowerCase().trim();
  const superPassword = process.env.SEED_SUPERADMIN_PASSWORD || "SuperAdmin12345!";
  const superHash = await bcrypt.hash(superPassword, 12);

  // Kredensial Admin
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@nihongo.app").toLowerCase().trim();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";
  const adminHash = await bcrypt.hash(adminPassword, 12);

  console.log("\nMemproses akun Super Admin...");
  const superUser = await db.user.upsert({
    where: { email: superEmail },
    create: {
      email: superEmail,
      passwordHash: superHash,
      displayName: "Super Admin",
      role: "super_admin",
      status: "active",
      currentLevelId: 6,
      emailVerifiedAt: new Date(),
    },
    update: {
      role: "super_admin",
      status: "active",
      passwordHash: superHash,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("✅ Super Admin berhasil diinjeksi:");
  console.log(`   - ID       : ${superUser.id}`);
  console.log(`   - Email    : ${superEmail}`);
  console.log(`   - Password : ${superPassword}`);
  console.log(`   - Role     : ${superUser.role}`);

  console.log("\nMemproses akun Admin...");
  const adminUser = await db.user.upsert({
    where: { email: adminEmail },
    create: {
      email: adminEmail,
      passwordHash: adminHash,
      displayName: "Admin",
      role: "admin",
      status: "active",
      currentLevelId: 6,
      emailVerifiedAt: new Date(),
    },
    update: {
      role: "admin",
      status: "active",
      passwordHash: adminHash,
      emailVerifiedAt: new Date(),
    },
  });

  console.log("✅ Admin berhasil diinjeksi:");
  console.log(`   - ID       : ${adminUser.id}`);
  console.log(`   - Email    : ${adminEmail}`);
  console.log(`   - Password : ${adminPassword}`);
  console.log(`   - Role     : ${adminUser.role}`);

  console.log("\n=======================================================");
  console.log("🎉 SELESAI: Kredensial di atas siap digunakan untuk login!");
  console.log("=======================================================\n");
}

main()
  .catch((err) => {
    console.error("\n❌ Gagal menginjeksi akun admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
