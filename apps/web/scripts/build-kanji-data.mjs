import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../../api/prisma/data/kanji-data/kanji.json");
const OUT = resolve(here, "../src/features/huruf/data/kanji");

const toKatakana = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
const unique = (xs) => [...new Set(xs)];

const kun = (r) => {
  const [stem, okurigana] = r.replace(/^-|-$/g, "").split(".");
  return okurigana ? `${stem}(${okurigana})` : stem;
};

// "-び" / "お-" are affix-only forms; show them only when a kanji has nothing else.
const standalone = (readings) => {
  const full = readings.filter((r) => !/^-|-$/.test(r));
  return full.length ? full : readings;
};

// KANJIDIC lists a few loanword units (デシメートル, シリング) as kun readings.
const isKana = (r) => !/[ァ-ヺ]/.test(r);

// Drop dictionary bookkeeping; zodiac labels stay only for kanji whose sole meaning is the zodiac sign (辰, 寅…).
const NOTE = /radical|kokuji|^\d{1,2}(am|pm)?-\d{1,2}(am|pm)$/i;
const ZODIAC = /sign of|zodiac|calendar sign/i;
const meanings = (ms) => {
  const kept = ms.filter((m) => !NOTE.test(m)).map((m) => m.replace(/10\*\*(\d+)/g, "10^$1"));
  const plain = kept.filter((m) => !ZODIAC.test(m));
  return (plain.length ? plain : kept).slice(0, 3).join(", ");
};

const data = JSON.parse(readFileSync(SRC, "utf8"));
mkdirSync(OUT, { recursive: true });

for (const n of [5, 4, 3, 2, 1]) {
  const level = `N${n}`;
  const entries = Object.entries(data)
    .filter(([, k]) => k.jlpt_new === n)
    .sort(([, a], [, b]) => (a.freq ?? Infinity) - (b.freq ?? Infinity))
    .map(([character, k]) => ({
      character,
      onyomi: unique(standalone(k.readings_on ?? []).map((r) => toKatakana(r.replace(/^-|-$/g, ""))))
        .slice(0, 3)
        .join("・"),
      kunyomi: unique(standalone((k.readings_kun ?? []).filter(isKana)).map(kun)).slice(0, 4).join("・"),
      meaningEn: meanings(k.meanings ?? []),
      level,
      strokeCount: k.strokes,
    }));
  writeFileSync(resolve(OUT, `${level.toLowerCase()}.json`), JSON.stringify(entries));
  console.log(`${level}: ${entries.length} kanji`);
}
