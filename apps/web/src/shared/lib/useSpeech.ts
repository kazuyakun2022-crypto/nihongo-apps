"use client";

import { useCallback, useRef } from "react";

// Audio cache so same text doesn't re-fetch
const audioCache = new Map<string, string>();

// Endpoint TTS Studio Berkualitas Tinggi dari backend internal
function buildTTSUrl(text: string): string {
  return `/api/tts?text=${encodeURIComponent(text)}`;
}

// Fallback Browser Web Speech API jika perangkat sepenuhnya offline
function speakViaBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.pitch = 1.05; // Sedikit dinaikkan agar ramah dan ceria tanpa memicu distorsi
  u.rate = 0.95;
  u.volume = 0.9;

  const voices = window.speechSynthesis.getVoices();
  const jaVoices = voices.filter((v) => v.lang.startsWith("ja") || v.lang.includes("JP"));

  const preferred =
    jaVoices.find((v) => /nanami|ayumi|haruka|sayaka|kyoko/i.test(v.name)) ??
    jaVoices.find((v) => !/robot|male|man/i.test(v.name)) ??
    jaVoices[0];

  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

/**
 * useSpeech — memutar pelafalan bahasa Jepang berkualitas studio (native MP3)
 * dengan aksen Tokyo yang otentik, artikulasi jernih, dan bebas distorsi digital.
 */
export function useSpeech() {
  const currentAudio = useRef<HTMLAudioElement | null>(null);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;

    // Bersihkan furigana dan kurung
    const clean = text.replace(/[（(【[【《〈<][^）)】\]】》〉>]*[）)】\]】》〉>]/g, "").trim();
    if (!clean) return;

    // Hentikan suara yang sedang berbunyi
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    // 1. Coba putar dari memory cache (instan tanpa delay jaringan)
    const cached = audioCache.get(clean);
    if (cached) {
      const audio = new Audio(cached);
      audio.playbackRate = 1.0;
      currentAudio.current = audio;
      audio.play().catch(() => speakViaBrowser(clean));
      return;
    }

    // 2. Muat audio studio MP3 dari /api/tts
    const url = buildTTSUrl(clean);
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error("TTS endpoint error");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        audioCache.set(clean, objectUrl);
        const audio = new Audio(objectUrl);
        audio.playbackRate = 1.0;
        currentAudio.current = audio;
        return audio.play();
      })
      .catch(() => {
        // Fallback jika offline: Web Speech API browser
        if (window.speechSynthesis.getVoices().length === 0) {
          window.speechSynthesis.onvoiceschanged = () => speakViaBrowser(clean);
        }
        speakViaBrowser(clean);
      });
  }, []);

  const stop = useCallback(() => {
    if (currentAudio.current) {
      currentAudio.current.pause();
      currentAudio.current.currentTime = 0;
      currentAudio.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  return { speak, stop };
}
