"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useSpeech } from "@/shared/lib/useSpeech";
import { Skeleton, SkeletonRegion } from "@/shared/ui/Skeleton";
import { kamusApi, type KamusEntry, type KamusPage, type KamusTab } from "../data/kamusApi";
import styles from "./kamusTeks.module.css";

const TAB_COPY: Record<KamusTab, { eyebrow: string; title: string; lead: string; placeholder: string }> = {
  kosakata: {
    eyebrow: "ごい",
    title: "Kosakata",
    lead: "Kata dari bab yang sudah terbuka untukmu, lengkap dengan contoh kalimat.",
    placeholder: "Cari: makan, たべる, 食べる…",
  },
  kanji: {
    eyebrow: "かんじ",
    title: "Kanji",
    lead: "Arti dan cara baca onyomi/kunyomi untuk kanji di levelmu.",
    placeholder: "Cari: air, 水, みず, スイ…",
  },
  tata_bahasa: {
    eyebrow: "ぶんぽう",
    title: "Tata Bahasa",
    lead: "Pola kalimat, kapan dipakai, dan contohnya.",
    placeholder: "Cari: たい, ingin, ても…",
  },
  ungkapan: {
    eyebrow: "ことば",
    title: "Ungkapan & Sebutan",
    lead: "Salam, panggilan, sebutan keluarga, kata bantu bilangan, keigo, hingga peribahasa.",
    placeholder: "Cari: terima kasih, ayah, まい, keigo…",
  },
};

function SpeakBtn({ text }: { text: string }) {
  const { speak } = useSpeech();
  return (
    <button type="button" className={styles.speak} onClick={() => speak(text)} aria-label={`Dengarkan ${text}`}>
      🔊
    </button>
  );
}

/** Katakana → hiragana; cara baca hiragana dari kata katakana tidak perlu ditampilkan. */
const toHiragana = (text: string) => text.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

function VocabCard({ v }: { v: KamusEntry }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {v.imageUrl && <img src={v.imageUrl} alt="" className={styles.cardImage} loading="lazy" decoding="async" />}
        <div className={styles.cardTitleWrap}>
          <span className={styles.word} lang="ja">
            {v.term}
          </span>
          {v.reading && v.reading !== v.term && v.reading !== toHiragana(v.term) && (
            <span className={styles.reading} lang="ja">
              {v.reading}
            </span>
          )}
        </div>
        <SpeakBtn text={v.term} />
        <span className={styles.level}>{v.level}</span>
      </div>
      <p className={styles.meaning}>{v.meaning}</p>
      {v.note && <p className={styles.note}>💡 {v.note}</p>}
      {v.exampleSentence && (
        <p className={styles.example}>
          <span lang="ja">{v.exampleSentence}</span>
          {v.exampleTranslation && <span className={styles.exampleTr}>{v.exampleTranslation}</span>}
        </p>
      )}
    </article>
  );
}

function KanjiCard({ k }: { k: KamusEntry }) {
  return (
    <article className={`${styles.card} ${styles.kanjiCard}`}>
      <span className={styles.kanjiChar} lang="ja">
        {k.term}
      </span>
      <div className={styles.kanjiBody}>
        <div className={styles.cardHead}>
          <p className={styles.meaning}>{k.meaning}</p>
          <span className={styles.level}>{k.level}</span>
        </div>
        {k.onyomi && (
          <p className={styles.readingRow} lang="ja">
            <span className={styles.readingTag}>On</span> {k.onyomi}
          </p>
        )}
        {k.kunyomi && (
          <p className={styles.readingRow} lang="ja">
            <span className={styles.readingTag}>Kun</span> {k.kunyomi}
          </p>
        )}
      </div>
    </article>
  );
}

function GrammarCard({ g }: { g: KamusEntry }) {
  const [open, setOpen] = useState(false);
  const explanation = g.explanation ?? g.meaning;
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <span className={styles.pattern} lang="ja">
          {g.term}
        </span>
        <span className={styles.level}>{g.level}</span>
      </div>
      <p className={`${styles.explanation} ${open ? "" : styles.clamp}`}>{explanation}</p>
      {explanation.length > 160 && (
        <button type="button" className={styles.more} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Ringkas" : "Selengkapnya"}
        </button>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {open && g.imageUrl && <img src={g.imageUrl} alt="" className={styles.wideImage} loading="lazy" />}
      {g.exampleSentence && (
        <p className={styles.example}>
          <span lang="ja">
            {g.exampleSentence} <SpeakBtn text={g.exampleSentence} />
          </span>
          {g.exampleTranslation && <span className={styles.exampleTr}>{g.exampleTranslation}</span>}
        </p>
      )}
    </article>
  );
}

function UngkapanCard({ u, showCategory }: { u: KamusEntry; showCategory: boolean }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitleWrap}>
          <span className={styles.word} lang="ja">
            {u.term}
          </span>
          {u.reading && u.reading !== u.term && (
            <span className={styles.reading} lang="ja">
              {u.reading}
            </span>
          )}
          {u.romaji && <span className={styles.romaji}>{u.romaji}</span>}
        </div>
        <SpeakBtn text={(u.reading ?? u.term).replace(/〜/g, "")} />
        <span className={styles.level}>{u.level}</span>
      </div>
      <p className={styles.meaning}>{u.meaning}</p>
      {u.note && <p className={styles.note}>💡 {u.note}</p>}
      {showCategory && u.category && <span className={styles.category}>{u.category.title}</span>}
    </article>
  );
}

/** Kamus berbasis teks: isi mengikuti level siswa, entri level berikutnya hanya ditampilkan jumlahnya. */
export function KamusTeks({ tab, tabs }: { tab: KamusTab; tabs?: ReactNode }) {
  const copy = TAB_COPY[tab];
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [level, setLevel] = useState("");
  const [kategori, setKategori] = useState("");
  const [data, setData] = useState<KamusPage | null>(null);
  const [items, setItems] = useState<KamusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Ganti tab: filter dikosongkan
  useEffect(() => {
    setQuery("");
    setDebounced("");
    setLevel("");
    setKategori("");
  }, [tab]);

  useEffect(() => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    kamusApi
      .search(tab, { q: debounced || undefined, level: level || undefined, kategori: kategori || undefined })
      .then((res) => {
        if (id !== request.current) return;
        setData(res);
        setItems(res.items);
      })
      .catch((err: Error) => id === request.current && setError(err.message))
      .finally(() => id === request.current && setLoading(false));
  }, [tab, debounced, level, kategori]);

  async function loadMore() {
    if (!data) return;
    setLoadingMore(true);
    try {
      const res = await kamusApi.search(tab, { q: debounced || undefined, level: level || undefined, kategori: kategori || undefined, page: data.page + 1 });
      setData(res);
      setItems((prev) => [...prev, ...res.items]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow} lang="ja">
            {copy.eyebrow}
          </p>
          <h1 className={styles.heading}>{copy.title}</h1>
          <p className={styles.lead}>{copy.lead}</p>
        </div>
        <input
          type="search"
          className={styles.search}
          placeholder={copy.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label={`Cari ${copy.title.toLowerCase()}`}
        />
        {tabs}
        {data && data.unlockedLevels.length > 1 && (
          <div className={styles.chips} role="group" aria-label="Saring level">
            <button type="button" className={styles.chip} aria-pressed={level === ""} onClick={() => setLevel("")}>
              Semua level
            </button>
            {data.unlockedLevels.map((l) => (
              <button key={l.code} type="button" className={styles.chip} aria-pressed={level === l.code} onClick={() => setLevel(l.code)}>
                {l.code === "PEMULA" ? "Pemula" : l.code}
              </button>
            ))}
          </div>
        )}
        {tab === "ungkapan" && data?.categories && (
          <div className={styles.chips} role="group" aria-label="Saring kategori">
            <button type="button" className={styles.chip} aria-pressed={kategori === ""} onClick={() => setKategori("")}>
              Semua
            </button>
            {data.categories.map((c) => (
              <button key={c.key} type="button" className={styles.chip} aria-pressed={kategori === c.key} onClick={() => setKategori(c.key)}>
                {c.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {error && <p className={styles.error}>{error}</p>}

      {loading ? (
        <SkeletonRegion label="Memuat kamus…" className={styles.grid}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.card}>
              <Skeleton width="40%" height="1.6rem" />
              <Skeleton width="70%" />
              <Skeleton width="90%" />
            </div>
          ))}
        </SkeletonRegion>
      ) : (
        <>
          <p className={styles.count} aria-live="polite">
            {data?.total ?? 0} entri{debounced ? ` untuk "${debounced}"` : ""}
          </p>

          {items.length === 0 ? (
            <p className={styles.empty}>
              {debounced ? "Tidak ada hasil di level yang sudah terbuka." : "Belum ada isi untuk level ini. Materi akan bertambah setelah admin menerbitkan bab."}
            </p>
          ) : (
            <div className={tab === "kanji" ? styles.gridKanji : styles.grid}>
              {tab === "kosakata" && items.map((v) => <VocabCard key={v.id} v={v} />)}
              {tab === "kanji" && items.map((k) => <KanjiCard key={k.id} k={k} />)}
              {tab === "tata_bahasa" && items.map((g) => <GrammarCard key={g.id} g={g} />)}
              {tab === "ungkapan" && items.map((u) => <UngkapanCard key={u.id} u={u} showCategory={!kategori} />)}
            </div>
          )}

          {data && items.length < data.total && (
            <button type="button" className={styles.loadMore} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Memuat…" : `Tampilkan lebih banyak (${data.total - items.length} lagi)`}
            </button>
          )}

          {data && data.lockedCount > 0 && data.nextLevel && (
            <aside className={styles.locked}>
              <span className={styles.lockIcon} aria-hidden="true">
                🔒
              </span>
              <div>
                <strong>
                  {data.lockedCount} entri lagi terbuka mulai {data.nextLevel.name}
                </strong>
                <p>Kamus bertambah mengikuti levelmu, supaya kamu fokus pada yang sedang dipelajari. Lulus tes naik tahap untuk membukanya.</p>
                <Link href="/belajar/tes-naik-tahap" className={styles.lockLink}>
                  Lihat tes naik tahap →
                </Link>
              </div>
            </aside>
          )}
        </>
      )}
    </div>
  );
}
