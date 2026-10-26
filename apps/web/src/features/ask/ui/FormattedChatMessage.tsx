"use client";

import React, { useRef, useState } from "react";
import styles from "./formattedMessage.module.css";

interface FormattedChatMessageProps {
  content: string;
  isAi?: boolean;
  timestamp?: string;
}

/** Helper untuk mengurai formatting inline: **bold**, *italic*, `code`, dan 「kutipan」 */
function renderInlineTokens(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  // Regex mencari **bold**, *italic*, `code`, atau 「japanese quote」
  const regex = /(\*\*[^*]+?\*\*|\*[^*]+?\*|`[^`]+?`|「[^」]+?」|『[^』]+?』)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const matchedStr = match[0];
    if (matchedStr.startsWith("**") && matchedStr.endsWith("**")) {
      tokens.push(
        <strong key={match.index} className={styles.boldText}>
          {matchedStr.slice(2, -2)}
        </strong>
      );
    } else if (matchedStr.startsWith("*") && matchedStr.endsWith("*")) {
      tokens.push(
        <em key={match.index} className={styles.italicText}>
          {matchedStr.slice(1, -1)}
        </em>
      );
    } else if (matchedStr.startsWith("`") && matchedStr.endsWith("`")) {
      tokens.push(
        <code key={match.index} className={styles.inlineCode}>
          {matchedStr.slice(1, -1)}
        </code>
      );
    } else if (
      (matchedStr.startsWith("「") && matchedStr.endsWith("」")) ||
      (matchedStr.startsWith("『") && matchedStr.endsWith("』"))
    ) {
      tokens.push(
        <span key={match.index} className={styles.jpQuote} lang="ja">
          {matchedStr}
        </span>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens;
}

export function FormattedChatMessage({ content, isAi = false, timestamp }: FormattedChatMessageProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Bersihkan teks mentah jika ada emoji dan asterisk tidak berpasangan
  const cleanedContent = content
    .replace(
      /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F900}-\u{1F9FF}]/gu,
      ""
    )
    .trim();

  // Parsing baris per baris menjadi blok (Heading, List, Quote, Paragraph)
  const lines = cleanedContent.split("\n");
  const blocks: React.ReactNode[] = [];
  let currentList: { type: "bullet" | "number"; items: string[] } | null = null;

  function flushList() {
    if (!currentList) return;
    if (currentList.type === "bullet") {
      blocks.push(
        <ul key={`ul-${blocks.length}`} className={styles.bulletList}>
          {currentList.items.map((item, i) => (
            <li key={i} className={styles.bulletItem}>
              {renderInlineTokens(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      blocks.push(
        <ol key={`ol-${blocks.length}`} className={styles.numberList}>
          {currentList.items.map((item, i) => (
            <li key={i} className={styles.numberItem}>
              {renderInlineTokens(item)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();

    if (!rawLine) {
      flushList();
      continue;
    }

    // Heading (### atau ##)
    if (rawLine.startsWith("### ") || rawLine.startsWith("## ")) {
      flushList();
      const title = rawLine.replace(/^#+\s*/, "");
      blocks.push(
        <h4 key={`h-${i}`} className={styles.blockHeading}>
          {renderInlineTokens(title)}
        </h4>
      );
      continue;
    }

    // Bullet item (- atau *)
    const bulletMatch = rawLine.match(/^[-*]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== "bullet") {
        flushList();
        currentList = { type: "bullet", items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered item (1. 2. dll)
    const numMatch = rawLine.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== "number") {
        flushList();
        currentList = { type: "number", items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    // Blockquote (> )
    if (rawLine.startsWith("> ")) {
      flushList();
      blocks.push(
        <div key={`quote-${i}`} className={styles.quoteBox}>
          {renderInlineTokens(rawLine.slice(2))}
        </div>
      );
      continue;
    }

    // Normal paragraph
    flushList();
    blocks.push(
      <p key={`p-${i}`} className={styles.paragraph}>
        {renderInlineTokens(rawLine)}
      </p>
    );
  }
  flushList();

  // Audio speech player
  const toggleSpeech = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    // Ambil kalimat untuk diucapkan (filter karakter markdown)
    const cleanText = cleanedContent
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
      .replace(/`/g, "")
      .replace(/#+\s*/g, "");

    const ttsUrl = `/api/tts?text=${encodeURIComponent(cleanText.slice(0, 300))}&voice=nanami`;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(ttsUrl);
    audioRef.current = audio;
    setIsPlaying(true);

    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);

    audio.play().catch(() => setIsPlaying(false));
  };

  const copyText = () => {
    const cleanText = cleanedContent.replace(/\*\*/g, "");
    navigator.clipboard.writeText(cleanText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={styles.container}>
      {blocks}

      {isAi && (
        <div className={styles.messageFooter}>
          <div className={styles.actionsLeft}>
            <button
              type="button"
              className={`${styles.actionBtn} ${isPlaying ? styles.actionBtnActive : ""}`}
              onClick={toggleSpeech}
              title={isPlaying ? "Hentikan suara" : "Dengarkan pelafalan bahasa Jepang"}
            >
              {isPlaying ? (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span>Berhenti</span>
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                  </svg>
                  <span>Dengarkan</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={styles.actionBtn}
              onClick={copyText}
              title="Salin isi pesan"
            >
              {copied ? (
                <span>Tersalin</span>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>Salin</span>
                </>
              )}
            </button>
          </div>

          {timestamp && <span className={styles.timestamp}>{timestamp}</span>}
        </div>
      )}
    </div>
  );
}
