"use client";

import { useEffect, useState } from "react";
import styles from "./navigator.module.css";

/** Teks muncul kata demi kata (huruf demi huruf untuk teks Jepang tanpa spasi). */
export function Reveal({ text }: { text: string }) {
  const spaced = /\s/.test(text);
  const tokens = spaced ? text.match(/\S+\s*/g) ?? [text] : Array.from(text);
  const step = spaced ? 90 : 55;
  const [n, setN] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(tokens.length);
      return;
    }
    setN(0);
    const id = window.setInterval(() => setN((v) => (v >= tokens.length ? (window.clearInterval(id), v) : v + 1)), step);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return (
    <>
      <span>{tokens.slice(0, n).join("")}</span>
      <span className={styles.revealRest} aria-hidden>
        {tokens.slice(n).join("")}
      </span>
    </>
  );
}
