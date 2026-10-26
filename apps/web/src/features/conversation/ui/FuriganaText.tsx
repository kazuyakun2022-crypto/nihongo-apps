import React from "react";

const FURIGANA_REGEX = /([\u4E00-\u9FFF\u3400-\u4DBF]+)\(([ぁ-んァ-ヶー]+)\)/g;

interface FuriganaTextProps {
  text: string;
  className?: string;
}

/**
 * Komponen untuk merender teks bahasa Jepang dengan dukungan anotasi furigana.
 * Mengubah format "漢字(かんじ)" secara otomatis menjadi tag HTML <ruby>漢字<rt>かんじ</rt></ruby>.
 */
export function FuriganaText({ text, className }: FuriganaTextProps) {
  if (!text) return null;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(FURIGANA_REGEX);
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const kanji = match[1];
    const reading = match[2];
    parts.push(
      <ruby key={`${match.index}-${kanji}`}>
        {kanji}
        <rt>{reading}</rt>
      </ruby>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return (
    <span lang="ja" className={className}>
      {parts}
    </span>
  );
}
