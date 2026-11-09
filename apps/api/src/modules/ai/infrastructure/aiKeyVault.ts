import crypto from "crypto";

/**
 * Mendapatkan master key 32-byte (256-bit) untuk enkripsi AES-256-GCM.
 * Prioritas: AI_VAULT_SECRET di .env, atau derivasi deterministik dari SESSION_SECRET.
 */
function getVaultMasterKey(): Buffer {
  const secret = process.env.AI_VAULT_SECRET || process.env.SESSION_SECRET || "nihongo-ai-vault-master-key-fallback-2026";
  return crypto.scryptSync(secret, "nihongo-ai-salt-v1", 32);
}

/**
 * Menghasilkan petunjuk kunci (key hint) bertopeng agar admin dapat mengenali kunci
 * tanpa membocorkan isi kredensial mentah (contoh: "gsk_••••••••••••9mKa").
 */
export function createKeyHint(rawKey: string): string {
  const trimmed = rawKey.trim();
  if (trimmed.length <= 8) {
    return "••••••••";
  }
  // Ambil awalan (misal gsk_, sk-, AIza) maksimal 4 karakter
  const prefix = trimmed.slice(0, 4);
  // Ambil 4 karakter terakhir
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••••••${suffix}`;
}

/**
 * Mengenkripsi kunci API mentah dengan algoritma AES-256-GCM standar militer.
 * Mengembalikan ciphertext hex, iv hex, authTag hex, dan petunjuk visual (keyHint).
 */
export function encryptApiKey(rawKey: string): {
  encryptedKey: string;
  keyIv: string;
  keyTag: string;
  keyHint: string;
} {
  const masterKey = getVaultMasterKey();
  const iv = crypto.randomBytes(12); // 96-bit IV standar untuk GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", masterKey, iv);

  let encrypted = cipher.update(rawKey.trim(), "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return {
    encryptedKey: encrypted,
    keyIv: iv.toString("hex"),
    keyTag: tag.toString("hex"),
    keyHint: createKeyHint(rawKey),
  };
}

/**
 * Mendekripsi kunci API dari vault database.
 * Jika IV atau auth tag diubah / rusak, fungsi ini melempar error otentikasi.
 */
export function decryptApiKey(encryptedKey: string, keyIv: string, keyTag: string): string {
  const masterKey = getVaultMasterKey();
  const iv = Buffer.from(keyIv, "hex");
  const authTag = Buffer.from(keyTag, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", masterKey, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedKey, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

