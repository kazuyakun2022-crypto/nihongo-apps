"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useSpeech } from "@/shared/lib/useSpeech";
import { KAMUS_CATEGORIES, iconSrc, type KamusCategory, type KamusItem } from "../data/kamusGambar";
import styles from "./kamus.module.css";

interface Entry extends KamusItem {
  category: KamusCategory;
}

const ALL_ENTRIES: Entry[] = KAMUS_CATEGORIES.flatMap((category) => category.items.map((item) => ({ ...item, category })));

// Samakan katakana/hiragana, buang makron, dan ringkas vokal panjang agar "gakkou", "gakko" dan "gakkō" cocok.
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/ou|([aiueo])\1/g, (m) => m[0]);

const matches = (e: Entry, q: string) => [e.ja, e.kana, e.romaji, e.arti].some((field) => fold(field).includes(q));

export function KamusGambar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const category = KAMUS_CATEGORIES.find((c) => c.id === params.get("k")) ?? null;

  const [query, setQuery] = useState("");
  const [hideMeaning, setHideMeaning] = useState(false);
  const [detail, setDetail] = useState<{ list: Entry[]; index: number } | null>(null);

  const q = fold(query.trim());
  const results = useMemo(() => (q ? ALL_ENTRIES.filter((e) => matches(e, q)) : null), [q]);
  const visible: Entry[] = results ?? (category ? ALL_ENTRIES.filter((e) => e.category === category) : []);

  const openCategory = (id: string | null) => {
    setQuery("");
    router.push(id ? `${pathname}?k=${id}` : pathname, { scroll: false });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow} lang="ja">
            えじてん
          </p>
          <h1 className={styles.heading}>Kamus Gambar</h1>
          <p className={styles.subheading}>
            {ALL_ENTRIES.length} kosakata bergambar dalam {KAMUS_CATEGORIES.length} kategori. Ketuk gambar untuk mendengar pelafalannya.
          </p>
        </div>
        <div className={styles.toolbar}>
          <input
            type="search"
            className={styles.search}
            placeholder="Cari: kucing, neko, ねこ, 猫…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Cari kosakata"
          />
          <button
            type="button"
            className={styles.toggle}
            aria-pressed={hideMeaning}
            onClick={() => setHideMeaning((v) => !v)}
          >
            {hideMeaning ? "Tampilkan arti" : "Mode hafalan"}
          </button>
        </div>
      </header>

      {(category || results) && (
        <nav className={styles.chips} aria-label="Kategori">
          <button type="button" className={styles.chip} onClick={() => openCategory(null)}>
            Semua
          </button>
          {KAMUS_CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={styles.chip}
              aria-current={!results && c === category ? "true" : undefined}
              onClick={() => openCategory(c.id)}
            >
              <img src={iconSrc(c.cover)} alt="" width={20} height={20} />
              {c.title}
            </button>
          ))}
        </nav>
      )}

      {results ? (
        <section aria-live="polite">
          <h2 className={styles.sectionTitle}>
            {results.length ? `${results.length} hasil untuk “${query.trim()}”` : `Tidak ada kosakata untuk “${query.trim()}”`}
          </h2>
          <WordGrid entries={results} hideMeaning={hideMeaning} showCategory onOpen={(i) => setDetail({ list: results, index: i })} />
        </section>
      ) : category ? (
        <section>
          <div className={styles.categoryHead} style={{ "--tint": category.tint } as React.CSSProperties}>
            <img src={iconSrc(category.cover)} alt="" width={64} height={64} />
            <div>
              <h2 className={styles.categoryTitle}>{category.title}</h2>
              <p className={styles.categoryJa} lang="ja">
                {category.titleJa}
                {category.titleJa !== category.titleKana && <span>（{category.titleKana}）</span>}
              </p>
            </div>
            <span className={styles.badge}>{category.items.length} kata</span>
          </div>
          <WordGrid entries={visible} hideMeaning={hideMeaning} onOpen={(i) => setDetail({ list: visible, index: i })} />
        </section>
      ) : (
        <ul className={styles.categoryGrid}>
          {KAMUS_CATEGORIES.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={styles.categoryTile}
                style={{ "--tint": c.tint } as React.CSSProperties}
                onClick={() => openCategory(c.id)}
              >
                <img src={iconSrc(c.cover)} alt="" width={72} height={72} />
                <span className={styles.tileTitle}>{c.title}</span>
                <span className={styles.tileJa} lang="ja">
                  {c.titleJa}
                </span>
                <span className={styles.tileCount}>{c.items.length} kata</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className={styles.credit}>
        Ilustrasi: <a href="https://github.com/microsoft/fluentui-emoji" target="_blank" rel="noreferrer">Microsoft Fluent Emoji</a> (lisensi MIT)
      </p>

      {detail && <WordDetail list={detail.list} index={detail.index} onIndex={(index) => setDetail({ ...detail, index })} onClose={() => setDetail(null)} />}
    </div>
  );
}

function WordGrid({
  entries,
  hideMeaning,
  showCategory = false,
  onOpen,
}: {
  entries: Entry[];
  hideMeaning: boolean;
  showCategory?: boolean;
  onOpen: (index: number) => void;
}) {
  return (
    <ul className={styles.wordGrid}>
      {entries.map((e, i) => (
        <li key={`${e.category.id}-${e.ja}-${e.icon}`}>
          <button type="button" className={styles.wordCard} style={{ "--tint": e.category.tint } as React.CSSProperties} onClick={() => onOpen(i)}>
            <span className={styles.wordImage}>
              <img src={iconSrc(e.icon)} alt="" width={160} height={160} loading="lazy" decoding="async" />
            </span>
            <span className={styles.wordJa} lang="ja">
              {e.ja}
            </span>
            {e.kana !== e.ja && (
              <span className={styles.wordKana} lang="ja">
                {e.kana}
              </span>
            )}
            {hideMeaning ? (
              <span className={styles.wordHidden}>?</span>
            ) : (
              <>
                <span className={styles.wordRomaji}>{e.romaji}</span>
                <span className={styles.wordArti}>{e.arti}</span>
              </>
            )}
            {showCategory && <span className={styles.wordCategory}>{e.category.title}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function WordDetail({
  list,
  index,
  onIndex,
  onClose,
}: {
  list: Entry[];
  index: number;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { speak, stop } = useSpeech();
  const entry = list[index];
  const go = useCallback((step: number) => onIndex((index + step + list.length) % list.length), [index, list.length, onIndex]);

  useEffect(() => {
    ref.current?.showModal();
    return stop;
  }, [stop]);

  useEffect(() => {
    speak(entry.kana);
  }, [entry, speak]);

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      style={{ "--tint": entry.category.tint } as React.CSSProperties}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current.close()}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
      aria-labelledby="kamus-detail-word"
    >
      <div className={styles.dialogBody}>
        <button type="button" className={styles.close} onClick={() => ref.current?.close()} aria-label="Tutup">
          ×
        </button>
        <span className={styles.dialogCategory}>{entry.category.title}</span>
        <img key={entry.icon} src={iconSrc(entry.icon)} alt="" width={160} height={160} className={styles.dialogImage} />
        <p id="kamus-detail-word" className={styles.dialogJa} lang="ja">
          {entry.ja}
        </p>
        {entry.kana !== entry.ja && (
          <p className={styles.dialogKana} lang="ja">
            {entry.kana}
          </p>
        )}
        <p className={styles.dialogRomaji}>{entry.romaji}</p>
        <p className={styles.dialogArti}>{entry.arti}</p>
        <button type="button" className={styles.listen} onClick={() => speak(entry.kana)}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M4 9 H8 L13 5 V19 L8 15 H4 Z M16 9 C17.5 10.5 17.5 13.5 16 15 M18.5 6.5 C21.5 9.5 21.5 14.5 18.5 17.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Dengarkan
        </button>
        <div className={styles.dialogNav}>
          <button type="button" onClick={() => go(-1)} aria-label="Kata sebelumnya">
            ‹
          </button>
          <span>
            {index + 1} / {list.length}
          </span>
          <button type="button" onClick={() => go(1)} aria-label="Kata berikutnya">
            ›
          </button>
        </div>
      </div>
    </dialog>
  );
}
