import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Tema dipakai untuk mengelompokkan kosakata menjadi bab; urutan = urutan bab di setiap level. */
export const THEMES = [
  { id: "salam_ungkapan", title: "Salam & Ungkapan" },
  { id: "orang_keluarga", title: "Orang & Keluarga" },
  { id: "angka_jumlah", title: "Angka & Jumlah" },
  { id: "waktu_kalender", title: "Waktu & Kalender" },
  { id: "makanan_minuman", title: "Makanan & Minuman" },
  { id: "rumah_benda", title: "Rumah & Benda" },
  { id: "kota_tempat", title: "Kota & Tempat" },
  { id: "transportasi_arah", title: "Transportasi & Arah" },
  { id: "tubuh_kesehatan", title: "Tubuh & Kesehatan" },
  { id: "alam_cuaca", title: "Alam & Cuaca" },
  { id: "sekolah_kerja", title: "Sekolah & Pekerjaan" },
  { id: "hobi_kegiatan", title: "Hobi & Kegiatan" },
  { id: "belanja_uang", title: "Belanja & Uang" },
  { id: "komunikasi_bahasa", title: "Komunikasi & Bahasa" },
  { id: "perasaan_sifat", title: "Perasaan & Sifat" },
  { id: "kata_kerja_umum", title: "Kata Kerja Sehari-hari" },
  { id: "kata_sifat_umum", title: "Kata Sifat Umum" },
  { id: "kata_keterangan_penghubung", title: "Kata Keterangan & Penghubung" },
  { id: "masyarakat_abstrak", title: "Masyarakat & Konsep" },
  { id: "lainnya", title: "Kosakata Lainnya" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export interface VocabRow {
  expression: string;
  reading: string;
  meaning: string;
  guid: string;
}

export interface TranslatedVocab {
  meaningId: string;
  theme: string;
}

// Dijalankan dari folder apps/api
export const DATA_DIR = join(process.cwd(), "prisma", "data", "jlpt-vocab");

/** Parser CSV kecil yang paham kutip ganda; cukup untuk file open-anki-jlpt-decks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

export function readVocabCsv(level: number): VocabRow[] {
  const [header, ...rows] = parseCsv(readFileSync(join(DATA_DIR, `n${level}.csv`), "utf8"));
  const col = (name: string) => header.indexOf(name);
  const seen = new Set<string>();
  return rows
    .map((r) => ({ expression: r[col("expression")], reading: r[col("reading")], meaning: r[col("meaning")], guid: r[col("guid")] }))
    .filter((r) => r.expression && r.guid && !seen.has(r.guid) && seen.add(r.guid));
}
