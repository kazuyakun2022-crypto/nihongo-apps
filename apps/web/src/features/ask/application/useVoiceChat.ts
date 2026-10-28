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

async function transcribe(audio: Blob): Promise<string> {
  const res = await fetch("/api/ask/transcribe", {
    method: "POST",
    headers: { "content-type": audio.type || "audio/webm" },
    body: audio,
  });
  const data = (await res.json().catch(() => ({}))) as { text?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data.error?.message ?? "Gagal mengenali suara.");
  return data.text?.trim() ?? "";
}

async function fetchAnswer(question: string, history: HistoryItem[]): Promise<{ answer: string; emotion: VoiceEmotion }> {
  const res = await apiRequest<{ answer: string; emotion?: string }>("/ask", {
    method: "POST",
    body: { question, history, mode: "voice" },
  });
  const emotion = EMOTIONS.find((e) => e === res.emotion) ?? "biasa";
  return { answer: res.answer, emotion };
}

// Suara cadangan (MP3, dipakai saat kuota Gemini habis) diputar lebih cepat tanpa menjaga pitch,
// sehingga nadanya naik ±3 semitone dan terdengar lebih imut seperti karakter kartun.
const FALLBACK_PLAYBACK_RATE = 1.18;

async function fetchVoice(text: string): Promise<{ url: string; isFallback: boolean }> {
  const res = await fetch("/api/ask/speak", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error("Suara Miu-chan gagal dibuat.");
  const blob = await res.blob();
  return { url: URL.createObjectURL(blob), isFallback: blob.type === "audio/mpeg" };
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

export function useVoiceChat() {
  const [state, setState] = useState<VoiceState>("idle");
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [transcript, setTranscript] = useState("");
  const [subtitle, setSubtitle] = useState<{ words: string[]; activeIndex: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [emotion, setEmotion] = useState<VoiceEmotion>("biasa");
  const subtitleTimerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Animasikan subtitle kata per kata, disinkronkan dengan durasi audio */
  const startSubtitle = useCallback((text: string, audioDurationSec: number) => {
    // Bersihkan timer lama
    subtitleTimerRef.current.forEach(clearTimeout);
    subtitleTimerRef.current = [];

    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) return;

    // Distribusikan waktu antar kata secara merata, sedikit lebih awal dari akhir audio
    const totalMs = Math.min(audioDurationSec * 1000 * 0.95, 30_000);
    const perWord = totalMs / words.length;

    setSubtitle({ words, activeIndex: 0 });

    words.forEach((_, i) => {
      if (i === 0) return;
      const t = setTimeout(() => {
        setSubtitle((prev) => prev ? { ...prev, activeIndex: i } : null);
      }, perWord * i);
      subtitleTimerRef.current.push(t);
    });

    // Hapus subtitle setelah audio selesai
    const endT = setTimeout(() => setSubtitle(null), totalMs + 500);
    subtitleTimerRef.current.push(endT);
  }, []);

  const clearSubtitle = useCallback(() => {
    subtitleTimerRef.current.forEach(clearTimeout);
    subtitleTimerRef.current = [];
    setSubtitle(null);
  }, []);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const stopRequestedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    meterRef.current?.detachVoice();
    clearSubtitle();
  }, [clearSubtitle]);

  // Dibaca setiap frame oleh animasi Neko-sensei
  const getMicLevel = useCallback(() => meterRef.current?.micLevel() ?? 0, []);
  const getVoiceLevel = useCallback(() => meterRef.current?.voiceLevel() ?? 0, []);

  const playVoice = useCallback(async (audioUrl: string, isFallback: boolean, subtitleText?: string) => {
    const audio = makeAudio(audioUrl, isFallback);
    audioRef.current = audio;
    (meterRef.current ??= new AudioMeter()).attachVoice(audio);
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
      clearSubtitle();
      if (audioRef.current === audio) setState("idle");
    };
    audio.onerror = () => { clearSubtitle(); setState("idle"); };
    setState("speaking");
    await audio.play();
    // Mulai subtitle setelah durasi audio diketahui
    if (subtitleText && audio.duration && isFinite(audio.duration)) {
      startSubtitle(subtitleText, audio.duration);
    } else if (subtitleText) {
      // Fallback: estimasi 150 ms/kata
      const words = subtitleText.split(/\s+/).filter(Boolean);
      startSubtitle(subtitleText, words.length * 0.15);
      // Coba lagi setelah metadata tersedia
      audio.onloadedmetadata = () => {
        if (isFinite(audio.duration)) startSubtitle(subtitleText, audio.duration);
      };
    }
  }, [startSubtitle, clearSubtitle]);

  /**
   * Mulai fetch audio sapaan di background (sebelum tab aktif).
   * Hasilnya disimpan di ref; greet() tinggal memutarnya tanpa delay fetch.
   */
  const prefetchedGreetRef = useRef<Promise<{ url: string; isFallback: boolean; text: string }> | null>(null);

  const prefetchGreet = useCallback((text: string) => {
    prefetchedGreetRef.current = fetchVoice(text).then((v) => ({ ...v, text }));
  }, []);

  /** Sapaan pembuka. Teks langsung tampil; audio diputar dari cache prefetch jika sudah siap. */
  const greet = useCallback(async (text: string) => {
    const turn = turnRef.current;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text, emotion: "senang" }]);
    setEmotion("senang");
    try {
      // Pakai hasil prefetch kalau teksnya sama; jika tidak cocok fetch ulang
      const promise = prefetchedGreetRef.current;
      prefetchedGreetRef.current = null;
      const { url, isFallback } = promise
        ? await promise.then((p) => (p.text === text ? p : fetchVoice(text)))
        : await fetchVoice(text);
      if (turnRef.current !== turn) {
        URL.revokeObjectURL(url);
        return;
      }
      await playVoice(url, isFallback, text);
    } catch {
      if (turnRef.current === turn) setState("idle");
    }
  }, [playVoice]);

  const processQuestion = useCallback(async (question: string) => {
    setState("processing");
    setTranscript(question);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: question }]);

    try {
      const { answer, emotion: mood } = await fetchAnswer(question, historyRef.current);
      historyRef.current = [
        ...historyRef.current,
        { role: "user" as const, content: question },
        // Tanda emosi ikut disimpan supaya AI konsisten memakai formatnya
        { role: "assistant" as const, content: `[${mood}] ${answer}` },
      ].slice(-10);
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "ai", text: answer, emotion: mood }]);

      const { url: audioUrl, isFallback } = await fetchVoice(answer);
      setEmotion(mood);
      setTranscript("");
      await playVoice(audioUrl, isFallback, answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mendapat jawaban.");
      setTranscript("");
      setState("idle");
    }
  }, [playVoice]);

  const handleRecording = useCallback(async (audio: Blob) => {
    setState("processing");
    try {
      const text = await transcribe(audio);
      if (!text) {
        setError("Miu-chan tidak menangkap suaramu, coba bicara lagi ya.");
        setState("idle");
        return;
      }
      await processQuestion(text);
    } catch (err) {
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
        audio: { echoCancellation: true, noiseSuppression: true },
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
    subtitle,
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
