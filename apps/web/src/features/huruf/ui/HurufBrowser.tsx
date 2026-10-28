"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { useSpeech } from "@/shared/lib/useSpeech";
import {
  HIRAGANA_BASIC,
  KATAKANA_BASIC,
  DAKUTEN_CHARS,
  YOON_CHARS,
  type HiraganaChar,
  type KatakanaChar,
  type DakutenChar,
  type YoonChar,
  type KanjiChar,
  type JlptLevel,
} from "../data/characters";
import { loadKanji } from "../data/kanjiByLevel";
import { HiraganaWritingPractice, extractJapaneseWord } from "./HiraganaWritingPractice";
import styles from "./huruf.module.css";

type Tab = "hiragana" | "katakana" | "dakuten" | "yoon" | "kanji";
type Mode = "table" | "quiz" | "writing";
type KanaScript = "hiragana" | "katakana";

export interface CharCard {
  char: string;
  romaji: string;
  detail: string;
  example?: string;
  counterpart?: string;
  category?: string;
}


function toCard(
  item: HiraganaChar | KatakanaChar | DakutenChar | YoonChar | KanjiChar
): CharCard {
  if ("onyomi" in item) {
    const k = item as KanjiChar;
    return {
      char: k.character,
      romaji: k.kunyomi || k.onyomi,
      detail: `${k.meaningId ?? k.meaningEn} · ${k.strokeCount} goresan · Level ${k.level}`,
      example: k.example ? `${k.example} (${k.exampleReading}) = ${k.exampleMeaning}` : undefined,
      category: `Kanji ${k.level}`,
    };
  }
  if ("hiragana" in item) {
    const k = item as KatakanaChar;
    return {
      char: k.char,
      romaji: k.romaji,
      detail: "Katakana Dasar",
      counterpart: `Hiragana: ${k.hiragana}`,
      example: k.example,
      category: "Katakana",
    };
  }
  if ("base" in item) {
    const d = item as DakutenChar;
    return {
      char: d.char,
      romaji: d.romaji,
      detail: `Dasar: ${d.base} · ${d.type === "handakuten" ? "Handakuten ゜" : "Dakuten ゛"}`,
      category: d.type === "handakuten" ? "Handakuten" : "Dakuten",
    };
  }
  if ("group" in item) {
    const y = item as YoonChar;
    return {
      char: y.char,
      romaji: y.romaji,
      detail: `Kombinasi ${y.group} (${y.kana})${y.voiced ? " · Bersuara" : ""}`,
      category: "Yoon",
    };
  }
  const h = item as HiraganaChar;
  const kat = KATAKANA_BASIC.find((k) => k.romaji === h.romaji);
  return {
    char: h.char,
    romaji: h.romaji,
    detail: `Baris ${h.row} · Vokal ${h.col.toUpperCase()}`,
    counterpart: kat ? `Katakana: ${kat.char}` : undefined,
    example: h.example,
    category: "Hiragana",
  };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function getOptions(correct: string, pool: CharCard[]): string[] {
  const uniq = Array.from(new Set(pool.map((c) => c.romaji))).filter((r) => r !== correct);
  const wrong = shuffle(uniq).slice(0, 3);
  return shuffle([correct, ...wrong]);
}

const COLS: Array<"a" | "i" | "u" | "e" | "o"> = ["a", "i", "u", "e", "o"];

const GOJUON_BLOCK_1 = [
  { row: "∅", label: "A" },
  { row: "K", label: "Ka" },
  { row: "S", label: "Sa" },
  { row: "T", label: "Ta" },
  { row: "N", label: "Na" },
];

const GOJUON_BLOCK_2 = [
  { row: "H", label: "Ha" },
  { row: "M", label: "Ma" },
  { row: "Y", label: "Ya" },
  { row: "R", label: "Ra" },
  { row: "W", label: "Wa" },
  { row: "N'", label: "N" },
];

// ── HIRAGANA TABLE ──
function HiraganaTable({
  selected,
  onSelect,
  searchQuery,
}: {
  selected: CharCard | null;
  onSelect: (c: CharCard) => void;
  searchQuery: string;
}) {
  const q = searchQuery.trim().toLowerCase();

  const isMatch = (c: HiraganaChar) => {
    if (!q) return false;
    return c.char.includes(q) || c.romaji.toLowerCase().includes(q) || (c.example && c.example.toLowerCase().includes(q));
  };

  const renderBlock = (title: string, sub: string, rows: typeof GOJUON_BLOCK_1) => (
    <div className={styles.gojuonBlock}>
      <div className={styles.blockTitle}>
        <span>{title}</span>
        <span className={styles.subheading}>{sub}</span>
      </div>
      <div className={styles.colHeaders}>
        <div className={styles.colHeaderEmpty} />
        {COLS.map((c) => (
          <span key={c}>{c.toUpperCase()}</span>
        ))}
      </div>
      {rows.map(({ row, label }) => {
        const cells = HIRAGANA_BASIC.filter((c) => c.row === row);
        return (
          <div key={row} className={styles.kanaRow}>
            <span className={styles.rowLabel}>{label}</span>
            {COLS.map((col) => {
              const found = cells.find((c) => c.col === col);
              if (!found) return <div key={col} className={styles.kanaCellEmpty} />;
              const isSelected = selected?.char === found.char;
              const highlighted = isMatch(found);
              return (
                <button
                  key={col}
                  type="button"
                  className={`${styles.kanaCell} ${isSelected ? styles.kanaCellSelected : ""} ${
                    highlighted ? styles.kanaCellHighlighted : ""
                  }`}
                  onClick={() => onSelect(toCard(found))}
                  aria-label={`${found.char} (${found.romaji})`}
                >
                  <span className={styles.kanaCellChar} lang="ja">
                    {found.char}
                  </span>
                  <span className={styles.kanaCellRomaji}>{found.romaji}</span>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className={styles.gojuonContainer}>
      {renderBlock("Gojūon: Bagian 1", "Baris Vokal s/d N", GOJUON_BLOCK_1)}
      {renderBlock("Gojūon: Bagian 2", "Baris H s/d N'", GOJUON_BLOCK_2)}
    </div>
  );
}

// ── KATAKANA TABLE ──
const KAT_ROWS_B1 = [
  { label: "A", chars: ["ア", "イ", "ウ", "エ", "オ"] },
  { label: "Ka", chars: ["カ", "キ", "ク", "ケ", "コ"] },
  { label: "Sa", chars: ["サ", "シ", "ス", "セ", "ソ"] },
  { label: "Ta", chars: ["タ", "チ", "ツ", "テ", "ト"] },
  { label: "Na", chars: ["ナ", "ニ", "ヌ", "ネ", "ノ"] },
];

const KAT_ROWS_B2 = [
  { label: "Ha", chars: ["ハ", "ヒ", "フ", "ヘ", "ホ"] },
  { label: "Ma", chars: ["マ", "ミ", "ム", "メ", "モ"] },
  { label: "Ya", chars: ["ヤ", "", "ユ", "", "ヨ"] },
  { label: "Ra", chars: ["ラ", "リ", "ル", "レ", "ロ"] },
  { label: "Wa", chars: ["ワ", "", "", "", "ヲ"] },
  { label: "N", chars: ["ン", "", "", "", ""] },
];

function KatakanaTable({
  selected,
  onSelect,
  searchQuery,
}: {
  selected: CharCard | null;
  onSelect: (c: CharCard) => void;
  searchQuery: string;
}) {
  const q = searchQuery.trim().toLowerCase();

  const isMatch = (c: KatakanaChar) => {
    if (!q) return false;
    return c.char.includes(q) || c.romaji.toLowerCase().includes(q) || (c.example && c.example.toLowerCase().includes(q));
  };

  const renderBlock = (title: string, sub: string, rows: typeof KAT_ROWS_B1) => (
    <div className={styles.gojuonBlock}>
      <div className={styles.blockTitle}>
        <span>{title}</span>
        <span className={styles.subheading}>{sub}</span>
      </div>
      <div className={styles.colHeaders}>
        <div className={styles.colHeaderEmpty} />
        {COLS.map((c) => (
          <span key={c}>{c.toUpperCase()}</span>
        ))}
      </div>
      {rows.map(({ label, chars }) => (
        <div key={label} className={styles.kanaRow}>
          <span className={styles.rowLabel}>{label}</span>
          {chars.map((ch, idx) => {
            if (!ch) return <div key={idx} className={styles.kanaCellEmpty} />;
            const found = KATAKANA_BASIC.find((c) => c.char === ch);
            if (!found) return <div key={idx} className={styles.kanaCellEmpty} />;
            const isSelected = selected?.char === found.char;
            const highlighted = isMatch(found);
            return (
              <button
                key={idx}
                type="button"
                className={`${styles.kanaCell} ${isSelected ? styles.kanaCellSelected : ""} ${
                  highlighted ? styles.kanaCellHighlighted : ""
                }`}
                onClick={() => onSelect(toCard(found))}
                aria-label={`${found.char} (${found.romaji})`}
              >
                <span className={styles.kanaCellChar} lang="ja">
                  {found.char}
                </span>
                <span className={styles.kanaCellRomaji}>{found.romaji}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.gojuonContainer}>
      {renderBlock("Katakana: Bagian 1", "Baris Vokal s/d N", KAT_ROWS_B1)}
      {renderBlock("Katakana: Bagian 2", "Baris H s/d N", KAT_ROWS_B2)}
    </div>
  );
}

// ── DAKUTEN TABLE ──
function DakutenTable({
  selected,
  onSelect,
}: {
  selected: CharCard | null;
  onSelect: (c: CharCard) => void;
}) {
  const [script, setScript] = useState<KanaScript>("hiragana");
  const chars = DAKUTEN_CHARS.filter((c) => c.kana === script);
  const dakuten = chars.filter((c) => c.type === "dakuten");
  const handakuten = chars.filter((c) => c.type === "handakuten");

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${script === "hiragana" ? styles.toggleBtnActive : ""}`}
          onClick={() => setScript("hiragana")}
        >
          Hiragana
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${script === "katakana" ? styles.toggleBtnActive : ""}`}
          onClick={() => setScript("katakana")}
        >
          Katakana
        </button>
      </div>

      <div className={styles.gojuonContainer}>
        <div className={styles.dakutenCard}>
          <div className={styles.blockTitle}>
            <span>Dakuten ゛(Bersuara: G, Z, D, B)</span>
            <span className={styles.subheading}>{dakuten.length} Huruf</span>
          </div>
          <div className={styles.dakutenGrid}>
            {dakuten.map((c) => {
              const isSelected = selected?.char === c.char;
              return (
                <button
                  key={c.char}
                  type="button"
                  className={`${styles.kanaCell} ${isSelected ? styles.kanaCellSelected : ""}`}
                  onClick={() => onSelect(toCard(c))}
                >
                  <span className={styles.kanaCellChar} lang="ja">
                    {c.char}
                  </span>
                  <span className={styles.kanaCellRomaji}>{c.romaji}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.dakutenCard}>
          <div className={styles.blockTitle}>
            <span>Handakuten ゜(Semi-Bersuara: P)</span>
            <span className={styles.subheading}>{handakuten.length} Huruf</span>
          </div>
          <div className={styles.dakutenGrid}>
            {handakuten.map((c) => {
              const isSelected = selected?.char === c.char;
              return (
                <button
                  key={c.char}
                  type="button"
                  className={`${styles.kanaCell} ${isSelected ? styles.kanaCellSelected : ""}`}
                  onClick={() => onSelect(toCard(c))}
                >
                  <span className={styles.kanaCellChar} lang="ja">
                    {c.char}
                  </span>
                  <span className={styles.kanaCellRomaji}>{c.romaji}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── YOON TABLE ──
function YoonTable({
  selected,
  onSelect,
}: {
  selected: CharCard | null;
  onSelect: (c: CharCard) => void;
}) {
  const [script, setScript] = useState<KanaScript>("hiragana");
  const chars = YOON_CHARS.filter((c) => c.kana === script);
  const groups = Array.from(new Set(chars.map((c) => c.group)));

  return (
    <div style={{ display: "grid", gap: "var(--space-4)" }}>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleBtn} ${script === "hiragana" ? styles.toggleBtnActive : ""}`}
          onClick={() => setScript("hiragana")}
        >
          Hiragana
        </button>
        <button
          type="button"
          className={`${styles.toggleBtn} ${script === "katakana" ? styles.toggleBtnActive : ""}`}
          onClick={() => setScript("katakana")}
        >
          Katakana
        </button>
      </div>

      <div className={styles.yoonContainer}>
        {groups.map((group) => {
          const groupChars = chars.filter((c) => c.group === group);
          return (
            <div key={group} className={styles.yoonCard}>
              <p className={styles.yoonCardTitle}>Kelompok {group}</p>
              <div className={styles.yoonRow}>
                {groupChars.map((c) => {
                  const isSelected = selected?.char === c.char;
                  return (
                    <button
                      key={c.char}
                      type="button"
                      className={`${styles.kanaCell} ${isSelected ? styles.kanaCellSelected : ""}`}
                      onClick={() => onSelect(toCard(c))}
                    >
                      <span className={styles.kanaCellChar} lang="ja">
                        {c.char}
                      </span>
                      <span className={styles.kanaCellRomaji}>{c.romaji}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── KANJI TABLE ──
const KANJI_PER_PAGE = 24;

function KanjiTable({
  kanji,
  level,
  selected,
  onSelect,
  searchQuery,
}: {
  kanji: KanjiChar[] | null;
  level: JlptLevel;
  selected: CharCard | null;
  onSelect: (c: CharCard) => void;
  searchQuery: string;
}) {
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const list = kanji ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((k) =>
      [k.character, k.meaningId, k.meaningEn, k.onyomi, k.kunyomi, k.exampleMeaning].some((f) =>
        f?.toLowerCase().includes(q)
      )
    );
  }, [kanji, searchQuery]);

  useEffect(() => setPage(0), [searchQuery]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / KANJI_PER_PAGE));
  const pageChars = filtered.slice(page * KANJI_PER_PAGE, (page + 1) * KANJI_PER_PAGE);

  if (!kanji) {
    return (
      <SkeletonRegion label={`Memuat kanji ${level}…`} style={{ display: "grid", gap: "var(--space-3)" }}>
        <Skeleton width="min(22rem, 80%)" />
        <div className={styles.kanjiGrid}>
          {Array.from({ length: KANJI_PER_PAGE }, (_, i) => (
            <Skeleton key={i} height="auto" radius="var(--radius-md)" style={{ aspectRatio: "1" }} />
          ))}
        </div>
      </SkeletonRegion>
    );
  }

  return (
    <div style={{ display: "grid", gap: "var(--space-3)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p className={styles.muted}>
          Kanji JLPT {level} — Menampilkan {total} kanji · Halaman {page + 1} dari {pageCount}
        </p>
      </div>

      <div className={styles.kanjiGrid}>
        {pageChars.map((k) => {
          const isSelected = selected?.char === k.character;
          return (
            <button
              key={k.character}
              type="button"
              className={`${styles.kanjiCell} ${isSelected ? styles.kanjiCellSelected : ""}`}
              onClick={() => onSelect(toCard(k))}
            >
              <span className={styles.kanjiCellChar} lang="ja">
                {k.character}
              </span>
              <span className={styles.kanjiCellReading}>{k.kunyomi || k.onyomi}</span>
            </button>
          );
        })}
      </div>

      {pageCount > 1 && (
        <div className={styles.pagination}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Sebelumnya
          </button>
          <span className={styles.pageInfo}>
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Selanjutnya →
          </button>
        </div>
      )}
    </div>
  );
}

// ── CHARACTER INSPECTOR (Sticky on Desktop) ──
function CharacterInspector({
  card,
  onQuiz,
  onWrite,
}: {
  card: CharCard | null;
  onQuiz: () => void;
  onWrite: (char?: string) => void;
}) {
  const { speak } = useSpeech();
  if (!card) return null;

  return (
    <aside className={styles.inspectorCard} aria-label="Detail huruf">
      <div className={styles.inspectorHero}>
        <p className={styles.inspectorChar} lang="ja">
          {card.char}
        </p>
        <p className={styles.inspectorRomaji}>{card.romaji}</p>
        <p className={styles.inspectorDetail}>{card.detail}</p>
        <button
          type="button"
          className={styles.audioBtn}
          onClick={() => speak(card.char)}
          title="Dengarkan pelafalan penutur asli"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
          Putar Suara
        </button>
      </div>

      {card.counterpart && (
        <div className={styles.inspectorSection}>
          <span className={styles.inspectorSectionTitle}>Padanan Karakter</span>
          <p className={styles.inspectorExampleText} lang="ja">
            {card.counterpart}
          </p>
        </div>
      )}

      {card.example && (
        <div className={styles.inspectorSection}>
          <span className={styles.inspectorSectionTitle}>Contoh Kosakata</span>
          <p className={styles.inspectorExampleText} lang="ja">
            <span>{card.example}</span>
            <button
              type="button"
              className={styles.miniAudioBtn}
              onClick={() => speak(extractJapaneseWord(card.example))}
              title="Putar contoh kosakata"
              aria-label="Putar contoh kosakata"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            </button>
          </p>
          <p className={styles.inspectorExampleSub}>Klik ikon audio untuk mendengarkan kalimat/kata ini.</p>
        </div>
      )}

      <div className={styles.inspectorActions}>
        <Button onClick={() => onWrite(card.char)} variant="primary">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6 }}>
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Latihan Tulis Hiragana
        </Button>
        <Button onClick={onQuiz} variant="secondary">
          Latihan Kuis
        </Button>
      </div>
    </aside>
  );
}

// ── QUIZ VIEW ──
function QuizView({ cards, onBack }: { cards: CharCard[]; onBack: () => void }) {
  const { speak } = useSpeech();
  const questions = useMemo(() => shuffle(cards).slice(0, Math.min(cards.length, 20)), [cards]);
  const [index, setIndex] = useState(0);
  const [chosen, setChosen] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = questions[index];
  const options = useMemo(() => (q ? getOptions(q.romaji, cards) : []), [index, cards, q]);

  const handleChoose = useCallback(
    (opt: string) => {
      if (chosen || !q) return;
      setChosen(opt);
      if (opt === q.romaji) {
        setScore((s) => s + 1);
        speak(q.char);
      }
      setTimeout(() => {
        if (index + 1 >= questions.length) {
          setDone(true);
        } else {
          setIndex((i) => i + 1);
          setChosen(null);
        }
      }, 850);
    },
    [chosen, q, index, questions.length]
  );

  if (done) {
    return (
      <div className={styles.quizResult}>
        <div className={styles.quizResultScore}>
          {score}/{questions.length}
        </div>
        <p style={{ fontWeight: "bold", margin: 0, fontSize: "1.25rem" }}>
          {score === questions.length
            ? "Sempurna! Semua terjawab benar 🎉"
            : score >= questions.length * 0.7
            ? "Bagus sekali! Hampir sempurna 👍"
            : "Terus berlatih! Latihan membuat lancar 💪"}
        </p>
        <p className={styles.muted}>Akurasi: {Math.round((score / questions.length) * 100)}%</p>
        <Button onClick={onBack}>Kembali ke Tabel Huruf</Button>
      </div>
    );
  }

  if (!q) return null;

  return (
    <div className={styles.quizWrap}>
      <div className={styles.quizProgress}>
        <div className={styles.quizProgressFill} style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      <p className={styles.quizScore}>
        Soal {index + 1} dari {questions.length} · Skor Benar: {score}
      </p>
      <p className={styles.quizChar} lang="ja">
        {q.char}
      </p>
      <div className={styles.quizOptions}>
        {options.map((opt) => {
          let cls = styles.quizOption;
          if (chosen) {
            if (opt === q.romaji) cls = `${styles.quizOption} ${styles.quizOptionCorrect}`;
            else if (opt === chosen) cls = `${styles.quizOption} ${styles.quizOptionWrong}`;
          }
          return (
            <button
              key={opt}
              type="button"
              className={cls}
              onClick={() => handleChoose(opt)}
              disabled={!!chosen}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── TABS CONFIG ──
const TABS: Array<{ id: Tab; label: string; count: number }> = [
  { id: "hiragana", label: "Hiragana", count: 46 },
  { id: "katakana", label: "Katakana", count: 46 },
  { id: "dakuten", label: "Dakuten & ゜", count: 25 },
  { id: "yoon", label: "Yoon", count: 36 },
  { id: "kanji", label: "Kanji", count: 0 },
];

export function HurufBrowser({ kanjiLevel }: { kanjiLevel: JlptLevel }) {
  const { speak } = useSpeech();
  const [tab, setTab] = useState<Tab>("hiragana");
  const [kanji, setKanji] = useState<KanjiChar[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    setKanji(null);
    loadKanji(kanjiLevel).then((list) => {
      if (!cancelled) setKanji(list);
    });
    return () => {
      cancelled = true;
    };
  }, [kanjiLevel]);

  const tabs = useMemo(
    () =>
      TABS.map((t) =>
        t.id === "kanji" ? { ...t, label: `Kanji ${kanjiLevel}`, count: kanji?.length ?? 0 } : t
      ),
    [kanjiLevel, kanji]
  );
  const kanjiForTab = tab === "kanji" ? kanji : null;
  const [mode, setMode] = useState<Mode>("table");
  const [writingInitialChar, setWritingInitialChar] = useState<string>("あ");
  const [selected, setSelected] = useState<CharCard | null>(null);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);

  // Responsive breakpoint detector
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const quizCards = useMemo((): CharCard[] => {
    if (tab === "hiragana") return HIRAGANA_BASIC.map(toCard);
    if (tab === "katakana") return KATAKANA_BASIC.map(toCard);
    if (tab === "dakuten") return DAKUTEN_CHARS.filter((c) => c.kana === "hiragana").map(toCard);
    if (tab === "yoon") return YOON_CHARS.filter((c) => c.kana === "hiragana").map(toCard);
    return (kanjiForTab ?? []).map(toCard);
  }, [tab, kanjiForTab]);

  // Set default selected character when tab changes
  useEffect(() => {
    if (quizCards.length > 0) {
      setSelected(quizCards[0]);
    }
  }, [tab, quizCards]);

  const handleSelectChar = (card: CharCard) => {
    setSelected(card);
    speak(card.char);
    if (!isDesktop) {
      setMobileModalOpen(true);
    }
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setMode("table");
    setSearchQuery("");
  };

  const handleStartWriting = (c?: string) => {
    if (c) setWritingInitialChar(c);
    else if (selected?.char) setWritingInitialChar(selected.char);
    setMode("writing");
  };

  const currentTabInfo = tabs.find((t) => t.id === tab);

  return (
    <div className={styles.wrap}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerTitles}>
          <div className={styles.headingRow}>
            <h1 className={styles.heading}>Tabel Huruf</h1>
            <span className={styles.badgeCount}>{currentTabInfo?.count} karakter</span>
          </div>
          <p className={styles.subheading}>
            Eksplorasi huruf bahasa Jepang dengan tabel rapi, audio pelafalan, latihan menulis hiragana, dan kuis interaktif.
          </p>
        </div>

        <div className={styles.headerControls}>
          {mode === "table" ? (
            <>
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Cari romaji, huruf, arti..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Cari huruf atau romaji"
              />
              <Button onClick={() => handleStartWriting(selected?.char || "あ")} variant="primary">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Latihan Menulis
              </Button>
              <Button onClick={() => setMode("quiz")} variant="secondary" disabled={quizCards.length === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                  <polyline points="9 11 12 14 22 4" />
                  <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                </svg>
                Mulai Kuis {currentTabInfo?.label}
              </Button>
            </>
          ) : (
            <Button onClick={() => setMode("table")} variant="ghost">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ marginRight: 6, display: "inline-block", verticalAlign: "middle" }}>
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Kembali ke Tabel Huruf
            </Button>
          )}
        </div>
      </header>

      {/* Tabs navigation: hanya saat mode tabel */}
      {mode === "table" && (
        <nav className={styles.tabsBar} aria-label="Kategori huruf">
          <div className={styles.tabs}>
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`${styles.tab} ${tab === t.id ? styles.tabActive : ""}`}
                onClick={() => handleTabChange(t.id)}
              >
                {t.label} ({t.count})
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Render Workspace Sesuai Mode */}
      {mode === "writing" ? (
        <HiraganaWritingPractice
          initialChar={writingInitialChar}
          onBack={() => setMode("table")}
        />
      ) : mode === "quiz" ? (
        <QuizView cards={quizCards} onBack={() => setMode("table")} />
      ) : (
        <div className={styles.workspace}>
          {/* Main Table Area */}
          <section className={styles.tableArea} aria-label="Tabel karakter Jepang">
            {tab === "hiragana" && (
              <HiraganaTable selected={selected} onSelect={handleSelectChar} searchQuery={searchQuery} />
            )}
            {tab === "katakana" && (
              <KatakanaTable selected={selected} onSelect={handleSelectChar} searchQuery={searchQuery} />
            )}
            {tab === "dakuten" && <DakutenTable selected={selected} onSelect={handleSelectChar} />}
            {tab === "yoon" && <YoonTable selected={selected} onSelect={handleSelectChar} />}
            {tab === "kanji" && (
              <KanjiTable
                kanji={kanji}
                level={kanjiLevel}
                selected={selected}
                onSelect={handleSelectChar}
                searchQuery={searchQuery}
              />
            )}
          </section>

          {/* Persistent Character Inspector on Desktop */}
          {isDesktop && (
            <CharacterInspector
              card={selected}
              onQuiz={() => setMode("quiz")}
              onWrite={handleStartWriting}
            />
          )}
        </div>
      )}

      {/* Modal fallback on Mobile (< 1024px) */}
      {!isDesktop && mobileModalOpen && selected && (
        <div className={styles.modalOverlay} onClick={() => setMobileModalOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalChar} lang="ja">
              {selected.char}
            </p>
            <p className={styles.modalRomaji}>{selected.romaji}</p>
            <p className={styles.modalMeaning}>{selected.detail}</p>
            <button
              type="button"
              className={styles.audioBtn}
              onClick={() => speak(selected.char)}
              style={{ margin: "0 auto", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              Putar Pelafalan Huruf
            </button>
            {selected.counterpart && (
              <p className={styles.modalMeaning} lang="ja">
                {selected.counterpart}
              </p>
            )}

            {/* ── Contoh Kosakata dengan Tombol Speaker Audio ── */}
            {selected.example && (
              <div className={styles.modalExampleBox}>
                <div className={styles.modalExampleInfo}>
                  <span className={styles.modalExampleHeading}>Contoh Kata</span>
                  <span className={styles.modalExampleWord} lang="ja">
                    {selected.example}
                  </span>
                </div>
                <button
                  type="button"
                  className={styles.modalSpeakerBtn}
                  onClick={() => speak(extractJapaneseWord(selected.example))}
                  aria-label="Dengarkan pelafalan contoh kata"
                  title="Dengarkan pelafalan contoh kata"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                </button>
              </div>
            )}

            <div className={styles.modalBtnGroup}>
              <Button
                variant="primary"
                onClick={() => {
                  setMobileModalOpen(false);
                  handleStartWriting(selected.char);
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ marginRight: 6 }}>
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                Latihan Tulis Huruf Ini
              </Button>
              <Button onClick={() => setMobileModalOpen(false)} variant="secondary">
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
