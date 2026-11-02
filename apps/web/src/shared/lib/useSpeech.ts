"use client";

import { useCallback } from "react";
import pronunciation from "./pronunciationManifest.json";

// Audio cache so same text doesn't re-fetch
const audioCache = new Map<string, string>();

const STATIC_AUDIO: Record<string, string> = pronunciation.files;
/** Naikkan bila suara /api/tts diganti, supaya cache browser lama tidak dipakai. */
const TTS_VERSION = "12";

function cleanText(text: string): string {
  return text.replace(/[（(【[《〈<][^）)】\]》〉>]*[）)】\]》〉>]/g, "").trim();
}

/** Audio pelafalan siap pakai (kana & kosakata Pemula) di /public/audio, tanpa memanggil API. */
function staticAudioUrl(clean: string): string | null {
  const id = STATIC_AUDIO[clean];
  return id ? `/audio/ja/${id}.mp3` : null;
}

// Endpoint TTS backend; hasilnya di-cache browser dan server untuk teks yang sama
function buildTTSUrl(text: string): string {
  return `/api/tts?v=${TTS_VERSION}&text=${encodeURIComponent(text)}`;
}

/** URL audio soal yang tersimpan (/api/tts?text=…) diberi versi suara, supaya cache browser suara lama tidak dipakai. */
export function versionedAudioUrl(url: string): string {
  return url.startsWith("/api/tts?") && !/[?&]v=/.test(url) ? url.replace("/api/tts?", `/api/tts?v=${TTS_VERSION}&`) : url;
}

/** Muat audio pelafalan statis lebih dulu (mis. kartu huruf berikutnya) agar langsung berbunyi saat diketuk. */
export function preloadSpeech(texts: string[]) {
  if (typeof window === "undefined") return;
  // Hormati mode hemat data di ponsel
  if ((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData) return;
  for (const t of texts) {
    const url = staticAudioUrl(cleanText(t));
    if (!url || audioCache.has(url)) continue;
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    audioCache.set(url, url);
  }
}

// Suara browser hanya dipakai saat perangkat benar-benar offline: suaranya berbeda dari audio pelafalan
function speakViaBrowser(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ja-JP";
  u.rate = 0.95;
  const jaVoices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("ja") || v.lang.includes("JP"));
  const preferred = jaVoices.find((v) => /nanami|ayumi|haruka|sayaka|kyoko/i.test(v.name)) ?? jaVoices[0];
  if (preferred) u.voice = preferred;
  window.speechSynthesis.speak(u);
}

// Satu pemutar untuk seluruh aplikasi: suara baru selalu menghentikan yang lama, dan permintaan yang
// sudah tergantikan (mis. jawaban /api/tts yang datang terlambat) tidak ikut berbunyi
let currentAudio: HTMLAudioElement | null = null;
let playToken = 0;

function stopAll() {
  playToken++;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
}

function play(src: string, token: number, clean: string) {
  if (token !== playToken) return;
  const audio = new Audio(src);
  currentAudio = audio;
  audio.play().catch((err: unknown) => {
    // Dihentikan oleh suara berikutnya atau diblokir autoplay: bukan alasan memakai suara lain
    if (token !== playToken || (err instanceof DOMException && (err.name === "AbortError" || err.name === "NotAllowedError"))) return;
    if (!navigator.onLine) speakViaBrowser(clean);
  });
}

/** useSpeech: memutar audio pelafalan (berkas statis atau /api/tts), satu suara pada satu waktu. */
export function useSpeech() {
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined") return;
    const clean = cleanText(text);
    if (!clean) return;

    stopAll();
    const token = playToken;

    // 1. Audio pelafalan statis atau yang sudah pernah dimuat: putar langsung
    const cached = staticAudioUrl(clean) ?? audioCache.get(clean);
    if (cached) return play(cached, token, clean);

    // 2. Muat dari /api/tts
    fetch(buildTTSUrl(clean))
      .then((res) => {
        if (!res.ok) throw new Error("TTS endpoint error");
        return res.blob();
      })
      .then((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        audioCache.set(clean, objectUrl);
        play(objectUrl, token, clean);
      })
      .catch(() => {
        if (token === playToken && !navigator.onLine) speakViaBrowser(clean);
      });
  }, []);

  const stop = useCallback(() => stopAll(), []);

  return { speak, stop };
}
