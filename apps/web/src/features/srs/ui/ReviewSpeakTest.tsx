"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NekoAvatar, type NekoEmotion, type NekoMode } from "@/shared/ui/neko/NekoAvatar";
import { AudioMeter } from "@/shared/lib/audioMeter";
import type { DueCard } from "../domain/types";
import styles from "./speakTest.module.css";

export interface SpeakTestProps {
  cards: DueCard[];
  onClose: () => void;
  onFinish?: (passedCount: number) => void;
}

interface EvaluationResult {
  score: number; // 0..100
  spokenText: string;
  isCorrect: boolean;
  tip: string;
}

// Fallback jika tidak ada kartu yang diberikan
const DEFAULT_CARDS: DueCard[] = [
  { id: "default-1", itemType: "vocab", front: "水", reading: "みず", meaning: "Air" },
  { id: "default-2", itemType: "vocab", front: "本", reading: "ほん", meaning: "Buku" },
  { id: "default-3", itemType: "vocab", front: "友達", reading: "ともだち", meaning: "Teman" },
  { id: "default-4", itemType: "vocab", front: "先生", reading: "せんせい", meaning: "Guru" },
  { id: "default-5", itemType: "vocab", front: "日本", reading: "にほん", meaning: "Jepang" },
];

/** Hitung kesamaan string (Levenshtein Distance) untuk menilai ucapan bahasa Jepang */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.trim().toLowerCase().replace(/[\s・、。！？!?]/g, "");
  const s2 = str2.trim().toLowerCase().replace(/[\s・、。！？!?]/g, "");
  if (!s1 || !s2) return 0;
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const maxLen = Math.max(m, n);
  const distance = dp[m][n];
  const sim = Math.max(0, Math.round(((maxLen - distance) / maxLen) * 100));
  return sim;
}

export function ReviewSpeakTest({ cards, onClose, onFinish }: SpeakTestProps) {
  const list = cards.length > 0 ? cards : DEFAULT_CARDS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<NekoMode>("idle");
  const [emotion, setEmotion] = useState<NekoEmotion>("biasa");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const meterRef = useRef<AudioMeter | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isListeningRef = useRef(false);

  const currentCard = list[currentIndex];

  useEffect(() => {
    meterRef.current = new AudioMeter();
    return () => {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      meterRef.current?.dispose();
      meterRef.current = null;
    };
  }, []);

  const getMicLevel = useCallback(() => meterRef.current?.micLevel() ?? 0, []);
  const getVoiceLevel = useCallback(() => meterRef.current?.voiceLevel() ?? 0, []);

  // ── Miu-chan Membacakan Contoh Suara ──
  const playSample = useCallback(async (textToSpeak?: string) => {
    if (!currentCard) return;
    const target = textToSpeak || currentCard.reading || currentCard.front;

    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    meterRef.current?.resume();
    setMode("speaking");
    setEmotion("senang");

    try {
      // Prioritaskan /api/tts endpoint pelafalan cepat
      const audioUrl = `/api/tts?text=${encodeURIComponent(target)}&voice=nanami`;
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;

      meterRef.current?.attachVoice(audio);

      audio.onended = () => {
        setMode("idle");
        setEmotion("biasa");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };

      audio.onerror = () => {
        setMode("idle");
        meterRef.current?.detachVoice();
        activeAudioRef.current = null;
      };

      await audio.play();
    } catch {
      setMode("idle");
      meterRef.current?.detachVoice();
    }
  }, [currentCard]);

  // Evaluasi teks hasil pengucapan
  const evaluateSpeech = useCallback((spoken: string) => {
    if (!currentCard) return;
    const reading = currentCard.reading || currentCard.front;
    const front = currentCard.front;

    const simReading = calculateSimilarity(spoken, reading);
    const simFront = calculateSimilarity(spoken, front);
    const finalScore = Math.max(simReading, simFront);

    const isCorrect = finalScore >= 75;
    let tip = "";

    if (finalScore >= 85) {
      tip = "Bagus banget! Pelafalan dan intonasi penutur aslimu sangat tepat!";
      setEmotion("senang");
      // Miu-chan memuji dengan suara
      void playSample("すごい！上手！");
    } else if (finalScore >= 55) {
      tip = `Hampir tepat! Miu-chan mendengar "${spoken}". Perhatikan panjang vokal dan ketukan kata.`;
      setEmotion("biasa");
    } else {
      tip = `Kurang tepat. Coba dengarkan lagi contoh pelafalan Miu-chan dan ulangi ya.`;
      setEmotion("bingung");
    }

    setEvaluation({
      score: finalScore,
      spokenText: spoken || "(Tidak terdengar)",
      isCorrect,
      tip,
    });

    setScores((prev) => ({ ...prev, [currentIndex]: finalScore }));
    setMode("idle");
  }, [currentCard, currentIndex, playSample]);

  // ── Mulai Mendengarkan Suara User ──
  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    setEvaluation(null);
    setMode("listening");
    setEmotion("biasa");

    meterRef.current?.resume();

    // 1. Setup AudioMeter via MediaStream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      meterRef.current?.attachMic(stream);

      // Siapkan fallback MediaRecorder
      audioChunksRef.current = [];
      const rec = new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.start();
    } catch (err) {
      console.warn("Mikrofon tidak diizinkan atau tidak tersedia:", err);
    }

    // 2. Setup SpeechRecognition (Web Speech API) jika tersedia di browser
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.lang = "ja-JP"; // Kenali bahasa Jepang
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript || "";
          evaluateSpeech(transcript);
        };

        recognition.onerror = () => {
          // Jika Web Speech API timeout / error, fallback ke transkripsi server
          stopListening();
        };

        recognition.onend = () => {
          if (isListeningRef.current) {
            stopListening();
          }
        };

        recognition.start();
      } catch {
        // Fallback jika instansiasi gagal
      }
    }
  }, [evaluateSpeech]);

  // ── Berhenti Mendengarkan & Proses Suara ──
  const stopListening = useCallback(async () => {
    if (!isListeningRef.current) return;
    isListeningRef.current = false;
    setMode("processing");

    // Hentikan Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    // Hentikan MediaRecorder
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Jika evaluasi belum terisi oleh Web Speech API, kirim ke server transcriber
        if (!evaluation) {
          try {
            const res = await fetch("/api/ask/transcribe?lang=ja", {
              method: "POST",
              headers: { "content-type": audioBlob.type || "audio/webm" },
              body: audioBlob,
            });
            const data = await res.json();
            if (data?.text) {
              evaluateSpeech(data.text);
            } else {
              evaluateSpeech("");
            }
          } catch {
            evaluateSpeech("");
          }
        }
      };
      rec.stop();
    } else {
      if (!evaluation) {
        evaluateSpeech("");
      }
    }
  }, [evaluation, evaluateSpeech]);

  const handleNext = () => {
    if (currentIndex < list.length - 1) {
      setCurrentIndex((i) => i + 1);
      setEvaluation(null);
      setEmotion("biasa");
      setMode("idle");
    } else {
      setIsCompleted(true);
      const passed = Object.values(scores).filter((s) => s >= 75).length;
      onFinish?.(passed);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setEvaluation(null);
      setEmotion("biasa");
      setMode("idle");
    }
  };

  // ── TAMPILAN RINGKASAN AKHIR ──
  if (isCompleted) {
    const passedCount = Object.values(scores).filter((s) => s >= 75).length;
    const avgScore =
      list.length > 0
        ? Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / list.length)
        : 100;

    return (
      <div className={styles.resultSummary}>
        <div className={styles.avatarBox}>
          <NekoAvatar
            mode="idle"
            emotion="senang"
            micLevel={getMicLevel}
            voiceLevel={getVoiceLevel}
            size={160}
            label="Miu-chan Selamat!"
          />
        </div>

        <div className={styles.resultScoreBadge}>
          🎉 TES SPEAK SELESAI
        </div>

        <h2 className={styles.resultTitle}>Pelafalanmu Keren Banget!</h2>
        <p className={styles.resultDesc}>
          Kamu telah melatih pelafalan untuk {list.length} kosakata hari ini bersama Miu-chan. Semakin sering kamu latih, lidahmu akan semakin terbiasa!
        </p>

        <div className={styles.resultScoreCard}>
          <div className={styles.scoreItem}>
            <span className={styles.scoreVal}>{list.length}</span>
            <span className={styles.scoreLabel}>Total Kata</span>
          </div>
          <div className={styles.scoreItem}>
            <span className={styles.scoreVal} style={{ color: "#16a34a" }}>
              {passedCount}
            </span>
            <span className={styles.scoreLabel}>Tepat</span>
          </div>
          <div className={styles.scoreItem}>
            <span className={styles.scoreVal} style={{ color: "#2563eb" }}>
              {avgScore}%
            </span>
            <span className={styles.scoreLabel}>Rata-Rata</span>
          </div>
        </div>

        <div className={styles.resultActions}>
          <button
            type="button"
            className={`${styles.navBtn} ${styles.navBtnPrimary}`}
            onClick={() => {
              setCurrentIndex(0);
              setIsCompleted(false);
              setEvaluation(null);
              setScores({});
            }}
          >
            🔄 Ulangi Tes Speak
          </button>
          <button type="button" className={styles.navBtn} onClick={onClose}>
            ✓ Selesai & Kembali
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round(((currentIndex + 1) / list.length) * 100);

  return (
    <div className={styles.container}>
      {/* Header Modal */}
      <div className={styles.header}>
        <div className={styles.headerTitleWrap}>
          <span className={styles.titleBadge}>Voice AI</span>
          <h2 className={styles.title}>Tes Pelafalan Kosakata</h2>
        </div>
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Tutup tes pelafalan"
        >
          ✕
        </button>
      </div>

      {/* Progress */}
      <div className={styles.progressWrap}>
        <div className={styles.progressMeta}>
          <span>Kata {currentIndex + 1} dari {list.length}</span>
          <span>{progressPercent}%</span>
        </div>
        <div className={styles.progressBar}>
          <div className={styles.progressFill} style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Panggung Maskot Miu-chan */}
      <div className={styles.mascotStage}>
        <div className={styles.avatarBox}>
          <NekoAvatar
            mode={mode}
            emotion={emotion}
            micLevel={getMicLevel}
            voiceLevel={getVoiceLevel}
            size={170}
            label="Miu-chan Voice AI"
          />
        </div>

        <div
          className={`${styles.soundwavePill} ${
            mode === "speaking"
              ? styles.statusSpeaking
              : mode === "listening"
              ? styles.statusListening
              : mode === "processing"
              ? styles.statusProcessing
              : ""
          }`}
        >
          {mode === "speaking"
            ? "Miu-chan sedang berbicara…"
            : mode === "listening"
            ? "Miu-chan mendengarkan suaramu…"
            : mode === "processing"
            ? "Miu-chan mengevaluasi ucapanmu…"
            : "Tekan tombol mic untuk bicara"}
        </div>
      </div>

      {/* Kartu Target Kata */}
      {currentCard && (
        <div className={styles.targetCard}>
          {currentCard.reading && (
            <p className={styles.targetReading} lang="ja">
              {currentCard.reading}
            </p>
          )}
          <h1 className={styles.targetFront} lang="ja">
            {currentCard.front}
          </h1>
          <p className={styles.targetMeaning}>{currentCard.meaning}</p>

          <button
            type="button"
            className={styles.listenSampleBtn}
            onClick={() => void playSample()}
            disabled={mode === "speaking" || mode === "listening"}
          >
            🔊 Dengarkan Contoh Pelafalan
          </button>
        </div>
      )}

      {/* Box Feedback Evaluasi */}
      {evaluation && (
        <div
          className={`${styles.feedbackBox} ${
            evaluation.score >= 80
              ? styles.feedbackPerfect
              : evaluation.score >= 50
              ? styles.feedbackGood
              : styles.feedbackTryAgain
          }`}
        >
          <div className={styles.feedbackScore}>
            {evaluation.score >= 80 ? "⭐ Pelafalan Sempurna" : evaluation.score >= 50 ? "👍 Hampir Benar" : "💡 Perlu Latihan"} ({evaluation.score}%)
          </div>
          <p className={styles.feedbackSpokenText}>
            Kamu mengucapkan: <span lang="ja">"{evaluation.spokenText}"</span>
          </p>
          <p className={styles.feedbackTip}>{evaluation.tip}</p>
        </div>
      )}

      {/* Aksi Mikrofon Interaktif */}
      <div className={styles.micActionArea}>
        <button
          type="button"
          className={`${styles.micButton} ${mode === "listening" ? styles.micButtonActive : ""}`}
          onPointerDown={startListening}
          onPointerUp={stopListening}
          onPointerCancel={stopListening}
          disabled={mode === "processing" || mode === "speaking"}
          aria-label={mode === "listening" ? "Lepas untuk memeriksa" : "Tahan tombol untuk bicara"}
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12 1a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.93V21h2a1 1 0 0 1 0 2H9a1 1 0 0 1 0-2h2v-2.07A8 8 0 0 1 4 11a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
          </svg>
        </button>
        <p className={styles.micHint}>
          {mode === "listening"
            ? "Mendengarkan... Lepas tombol untuk memeriksa"
            : mode === "processing"
            ? "Miu-chan sedang mendengarkan rekaman..."
            : "Tahan tombol mic untuk mengucapkan kata ini"}
        </p>
      </div>

      {/* Footer Navigasi */}
      <div className={styles.navFoot}>
        <button
          type="button"
          className={styles.navBtn}
          onClick={handlePrev}
          disabled={currentIndex === 0 || mode === "listening"}
        >
          ← Sebelumnya
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${styles.navBtnPrimary}`}
          onClick={handleNext}
          disabled={mode === "listening"}
        >
          {currentIndex === list.length - 1 ? "Selesai Tes Speak ✓" : "Kata Berikutnya →"}
        </button>
      </div>
    </div>
  );
}

