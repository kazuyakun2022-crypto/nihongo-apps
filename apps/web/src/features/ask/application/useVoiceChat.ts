"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "@/core/http/apiClient";
import { AudioMeter } from "@/shared/lib/audioMeter";
import { EMOTIONS, type NekoEmotion } from "@/shared/ui/neko/nekoRig";

export type VoiceState = "idle" | "listening" | "processing" | "speaking";
export type VoiceEmotion = NekoEmotion;

export interface VoiceMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  emotion?: VoiceEmotion;
  /** Kalimat Jepang yang benar, bila Miu-chan meluruskan ucapan user. */
  correction?: string | null;
}

/** Bagian jawaban dengan tempo bicaranya; `mark` = tanda tempo yang ditulis AI. */
export interface SpeechRun {
  text: string;
  tempo: number;
  mark?: "pelan" | "cepat" | "eja";
}

/** Kalimat yang sedang dibacakan Miu-chan, untuk subtitle. */
export interface SpokenLine {
  id: string;
  text: string;
  /** Tempo per bagian, supaya sorotan subtitle mengikuti bagian yang dibacakan pelan/cepat. */
  runs?: SpeechRun[];
}

/** Jawaban beserta tanda tempo <pelan>/<cepat>, untuk dibacakan server dan disimpan di riwayat. */
function withPaceTags(runs: SpeechRun[]): string {
  return runs.map((r) => (r.mark ? `<${r.mark}>${r.text}</${r.mark}>` : r.text)).join("").trim();
}

type HistoryItem = { role: "user" | "assistant"; content: string };

const MIN_RECORDING_MS = 400;
const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function isRecordingSupported(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== "undefined";
}

function pickMimeType(): string | undefined {
  return MIME_CANDIDATES.find((t) => MediaRecorder.isTypeSupported(t));
}

/** `alt`: versi bahasa Jepang dari ucapan yang sama, membantu AI memahami kalimat campuran. */
async function transcribe(audio: Blob): Promise<{ text: string; alt: string | null }> {
  const res = await fetch("/api/ask/transcribe", {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; alt?: string | null; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return { text: data.text?.trim() ?? "", alt: data.alt?.trim() || null };
}

async function fetchAnswer(
  question: string,
  history: HistoryItem[],
  transcriptAlt: string | null,
): Promise<{ answer: string; emotion: VoiceEmotion; correction: string | null; speechRate: number | null; speech: SpeechRun[] | null; guide: string | null }> {
  const res = await apiRequest<{ answer: string; emotion?: string; correction?: string | null; speechRate?: number | null; speech?: SpeechRun[] | null; guide?: string | null }>("/ask", {
    method: "POST",
    body: {
      question,
      history,
      mode: "voice",
      ...(transcriptAlt ? { transcriptAlt } : {}),
      // Miu-chan di layar suara juga pemandu: bila user minta ditunjukkan suatu fitur, server mengembalikan `guide`
      app: { screen: "Layar obrolan suara dengan Miu-chan", guide: true },
    },
  });
  const emotion = EMOTIONS.find((e) => e === res.emotion) ?? "biasa";
  return {
    answer: res.answer,
    emotion,
    correction: res.correction ?? null,
    speechRate: res.speechRate ?? null,
    speech: res.speech?.length ? res.speech : null,
    guide: res.guide ?? null,
  };
}

// Suara cadangan (MP3, dipakai saat kuota Gemini habis) diputar lebih cepat tanpa menjaga pitch,
// sehingga nadanya naik ±1,3 semitone; sisanya dinaikkan lewat pitch di server supaya tempo tidak terlalu cepat.
const FALLBACK_PLAYBACK_RATE = 1.08;

/**
 * Suara Miu-chan; nada, tempo, dan volume disesuaikan server dengan emosinya. `rate` = kecepatan level user:
 * server membacakan bahasa Indonesia normal, Jepang sedikit lebih pelan, dan bagian bertanda <pelan>/<cepat> sesuai tandanya.
 */
type Voice = { url: string; isFallback: boolean };

/** `engine: "edge"` memaksa suara cadangan, supaya potongan kedua jawaban bersuara sama dengan potongan pertama. */
async function fetchVoice(text: string, emotion: VoiceEmotion, rate = 1, engine: "auto" | "edge" = "auto"): Promise<Voice> {
  const res = await fetch("/api/ask/speak", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, emotion, rate, engine }),
  });
  if (!res.ok) throw new Error("Suara Miu-chan gagal dibuat.");
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), isFallback: blob.type === "audio/mpeg" };
}

const SENTENCE_END = /[。！？!?]+|\.(?=\s)/g;
const PACE_TAG = /<\s*(\/)?\s*(?:pelan|lambat|slow|cepat|fast|eja|ejaan|spell)\s*>/gi;
/** Kalimat pertama minimal sepanjang ini, supaya seruan pendek ("Eh!") tidak jadi potongan sendiri. */
const MIN_FIRST_CHARS = 12;
const MIN_REST_CHARS = 8;

const plainLength = (text: string) => text.replace(PACE_TAG, "").trim().length;

/**
 * Pisahkan jawaban jadi kalimat pertama + sisanya, supaya kalimat pertama bisa langsung dibacakan sementara
 * sisanya masih dibuat. Tidak pernah memotong di dalam tanda tempo (<pelan>…</pelan>). Jawaban pendek tidak dipecah.
 */
export function splitForSpeech(text: string): [string] | [string, string] {
  for (const m of text.matchAll(SENTENCE_END)) {
    const cut = (m.index ?? 0) + m[0].length;
    const head = text.slice(0, cut);
    let depth = 0;
    for (const tag of head.matchAll(PACE_TAG)) depth += tag[1] ? -1 : 1;
    if (depth !== 0 || plainLength(head) < MIN_FIRST_CHARS) continue;
    const rest = text.slice(cut).trim();
    return plainLength(rest) >= MIN_REST_CHARS ? [head.trim(), rest] : [text];
  }
  return [text];
}

function makeAudio(url: string, isFallback: boolean): HTMLAudioElement {
  const audio = new Audio(url);
  if (isFallback) {
    audio.preservesPitch = false;
    (audio as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false;
    audio.playbackRate = FALLBACK_PLAYBACK_RATE;
  }
  return audio;
}

/** onGuide: dipanggil setelah Miu-chan selesai bicara bila ia memutuskan menunjukkan jalan ke suatu fitur. */
export function useVoiceChat({ onGuide }: { onGuide?: (destination: string) => void } = {}) {
  const onGuideRef = useRef(onGuide);
  onGuideRef.current = onGuide;
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [spoken, setSpoken] = useState<SpokenLine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [emotion, setEmotion] = useState<VoiceEmotion>("biasa");
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopRequestedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  /** Bagian ucapan yang sedang diputar, sebagai pecahan dari seluruh jawaban (untuk subtitle karaoke). */
  const segmentRef = useRef({ start: 0, share: 1 });
  /** Berganti setiap pemutaran baru/dihentikan, supaya potongan yang telat datang tidak ikut diputar. */
  const playTokenRef = useRef<object | null>(null);
  /** Kecepatan bicara level user (Konfig AI), diketahui dari jawaban pertama. */
  const rateRef = useRef(1);
  const historyRef = useRef<HistoryItem[]>([]);
  const meterRef = useRef<AudioMeter | null>(null);
  // Naik setiap user mulai bicara/berhenti, supaya sapaan yang telat datang tidak menimpa giliran user
  const turnRef = useRef(0);

  useEffect(() => {
    setIsSupported(isRecordingSupported());
    return () => {
      audioRef.current?.pause();
      if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      meterRef.current?.dispose();
      meterRef.current = null;
    };
  }, []);

  const stopAudio = useCallback(() => {
    playTokenRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    meterRef.current?.detachVoice();
    setSpoken(null);
  }, []);

  // Dibaca setiap frame oleh animasi Miu-chan
  const getMicLevel = useCallback(() => meterRef.current?.micLevel() ?? 0, []);
  const getVoiceLevel = useCallback(() => meterRef.current?.voiceLevel() ?? 0, []);
  /** Posisi suara yang sedang diputar (0–1), dibaca subtitle setiap frame; null bila durasi belum diketahui. */
  const getSpeechProgress = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !isFinite(audio.duration) || audio.duration <= 0) return null;
    const { start, share } = segmentRef.current;
    return start + share * (audio.ended ? 1 : audio.currentTime / audio.duration);
  }, []);

  /**
   * Putar ucapan yang terdiri dari beberapa potongan berurutan. Potongan berikutnya boleh masih dimuat;
   * ditunggu setelah potongan sebelumnya selesai. `weight` = panjang teks potongan, untuk posisi subtitle.
   */
  const playVoice = useCallback(async (parts: { voice: Promise<Voice>; weight: number }[], text: string, runs?: SpeechRun[]) => {
    const token = {};
    playTokenRef.current = token;
    const total = parts.reduce((n, p) => n + p.weight, 0) || 1;
    setSpoken({ id: crypto.randomUUID(), text, runs });
    setState("speaking");

    let start = 0;
    for (const [i, part] of parts.entries()) {
      let voice: Voice;
      try {
        voice = await part.voice;
      } catch (err) {
        // Potongan pertama gagal = tidak ada suara sama sekali; potongan berikutnya gagal = cukup berhenti
        if (i === 0) throw err;
        break;
      }
      if (playTokenRef.current !== token) {
        URL.revokeObjectURL(voice.url);
        return;
      }
      const audio = makeAudio(voice.url, voice.isFallback);
      audioRef.current = audio;
      (meterRef.current ??= new AudioMeter()).attachVoice(audio);
      segmentRef.current = { start: start / total, share: part.weight / total };
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(voice.url);
          resolve();
        };
        audio.onerror = () => resolve();
        audio.play().catch((err) => (i === 0 ? reject(err) : resolve()));
      });
      start += part.weight;
    }
    if (playTokenRef.current !== token) return;
    playTokenRef.current = null;
    setSpoken(null);
    setState("idle");
  }, []);

  /**
   * Mulai fetch audio sapaan di background (sebelum tab aktif).
   * Hasilnya disimpan di ref; greet() tinggal memutarnya tanpa delay fetch.
   */
  const prefetchedGreetRef = useRef<{ text: string; voice: Promise<Voice> } | null>(null);

  const prefetchGreet = useCallback((text: string) => {
    const voice = fetchVoice(text, "senang", rateRef.current);
    voice.catch(() => {});
    prefetchedGreetRef.current = { text, voice };
  }, []);

  /** Sapaan pembuka. Teks langsung tampil; audio diputar dari cache prefetch jika sudah siap. */
  const greet = useCallback(async (text: string) => {
    const turn = turnRef.current;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text, emotion: "senang" }]);
    setEmotion("senang");
    try {
      // Pakai hasil prefetch kalau teksnya sama; jika tidak cocok fetch ulang
      const prefetched = prefetchedGreetRef.current;
      prefetchedGreetRef.current = null;
      const voice = prefetched?.text === text ? await prefetched.voice : await fetchVoice(text, "senang", rateRef.current);
      if (turnRef.current !== turn) {
        URL.revokeObjectURL(voice.url);
        return;
      }
      await playVoice([{ voice: Promise.resolve(voice), weight: 1 }], text);
    } catch {
      if (turnRef.current === turn) setState("idle");
    }
  }, [playVoice]);

  const processQuestion = useCallback(async (question: string, transcriptAlt: string | null = null) => {
    // Giliran ini dibatalkan kalau pengguna menekan berhenti / menyela / pindah tab selama menunggu
    const turn = turnRef.current;
    setState("processing");
    setTranscript(question);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: question }]);

    try {
      const { answer, emotion: mood, correction, speechRate, speech, guide } = await fetchAnswer(question, historyRef.current, transcriptAlt);
      // Jawaban yang datang setelah dihentikan tidak ditampilkan maupun diputar
      if (turnRef.current !== turn) return;
      if (speechRate) rateRef.current = speechRate;
      const spokenText = speech ? withPaceTags(speech) : answer;
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: question },
        // Tanda emosi, tempo, dan koreksi ikut disimpan supaya AI konsisten memakai formatnya
        { role: "assistant" as const, content: `[${mood}] ${spokenText}${correction ? ` {{benar: ${correction}}}` : ""}` },
      ].slice(-10);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: answer, emotion: mood, correction }]);

      // Kalimat pertama dibuat lebih dulu dan langsung diputar; sisanya dibuat sambil kalimat pertama berbunyi
      const [firstText, restText] = splitForSpeech(spokenText);
      const first = await fetchVoice(firstText, mood, rateRef.current);
      if (turnRef.current !== turn) {
        URL.revokeObjectURL(first.url);
        return;
      }
      const parts = [{ voice: Promise.resolve(first), weight: plainLength(firstText) }];
      if (restText) {
        const rest = fetchVoice(restText, mood, rateRef.current, first.isFallback ? "edge" : "auto");
        rest.catch(() => {});
        parts.push({ voice: rest, weight: plainLength(restText) });
      }
      setEmotion(mood);
      setTranscript("");
      await playVoice(parts, answer, speech ?? undefined);
      // Hanya bila user tidak menyela selama Miu-chan bicara
      if (guide && turnRef.current === turn) onGuideRef.current?.(guide);
    } catch (err) {
      if (turnRef.current !== turn) return;
      setError(err instanceof Error ? err.message : "Gagal mendapat jawaban.");
      setTranscript("");
      setState("idle");
    }
  }, [playVoice]);

  const handleRecording = useCallback(async (audio: Blob) => {
    const turn = turnRef.current;
    setState("processing");
    try {
      const { text, alt } = await transcribe(audio);
      if (turnRef.current !== turn) return;
      if (!text) {
        setError("Miu-chan tidak menangkap suaramu, coba bicara lagi ya.");
        setState("idle");
        return;
      }
      await processQuestion(text, alt);
    } catch (err) {
      if (turnRef.current !== turn) return;
      setError(err instanceof Error ? err.message : "Gagal mengenali suara.");
      setState("idle");
    }
  }, [processQuestion]);

  const startListening = useCallback(async () => {
    if (!isRecordingSupported()) {
      setError("Browser kamu tidak mendukung perekaman suara.");
      return;
    }
    setError(null);
    turnRef.current++;
    stopAudio();
    (meterRef.current ??= new AudioMeter()).resume();
    stopRequestedRef.current = false;
    setState("listening");

    try {
      streamRef.current ??= await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      setError("Izin mikrofon ditolak. Aktifkan mikrofon di pengaturan browser.");
      setState("idle");
      return;
    }

    (meterRef.current ??= new AudioMeter()).attachMic(streamRef.current);

    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    const startedAt = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || "audio/webm" });
      if (Date.now() - startedAt < MIN_RECORDING_MS || blob.size < 1000) {
        setState("idle");
        return;
      }
      void handleRecording(blob);
    };

    recorderRef.current = recorder;
    recorder.start();
    // Tombol bisa sudah dilepas selagi menunggu izin mikrofon.
    if (stopRequestedRef.current) recorder.stop();
  }, [stopAudio, handleRecording]);

  const stopListening = useCallback(() => {
    stopRequestedRef.current = true;
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") {
      recorder.onstop = null;
      recorder.stop();
    }
    turnRef.current++;
    stopAudio();
    // Lepas mikrofon (indikator mikrofon di HP ikut mati); dibuka lagi saat tombol ditahan berikutnya
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setState("idle");
    setTranscript("");
  }, [stopAudio]);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setError(null);
    setEmotion("biasa");
    historyRef.current = [];
  }, [stop]);

  return {
    state,
    emotion,
    getMicLevel,
    getVoiceLevel,
    messages,
    transcript,
    spoken,
    getSpeechProgress,
    error,
    isSupported,
    startListening,
    stopListening,
    prefetchGreet,
    greet,
    stop,
    clear,
  };
}
