"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NekoAvatar, type NekoEmotion, type NekoMode } from "@/shared/ui/neko/NekoAvatar";
import { AudioMeter } from "@/shared/lib/audioMeter";
import { VoiceActivityTracker } from "@/shared/lib/audioNoiseGate";
import { StablePushToTalkButton } from "@/components/speaking/StablePushToTalkButton";
import { soundFX } from "@/lib/audio/SoundFXManager";
import { scorePronunciation } from "@/features/learning/domain/pronunciationScorer";
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

export function ReviewSpeakTest({ cards, onClose, onFinish }: SpeakTestProps) {
  const list = cards.length > 0 ? cards : DEFAULT_CARDS;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [mode, setMode] = useState<NekoMode>("idle");
  const [emotion, setEmotion] = useState<NekoEmotion>("biasa");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [isVoiced, setIsVoiced] = useState(false);
  const [visualScale, setVisualScale] = useState(0);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [scores, setScores] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const meterRef = useRef<AudioMeter | null>(null);
  const vadTrackerRef = useRef<VoiceActivityTracker>(new VoiceActivityTracker());
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
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

  // Evaluasi teks hasil pengucapan dengan Pronunciation Scorer (Levenshtein Distance + Phonetic Normalization)
  const evaluateSpeech = useCallback((spoken: string) => {
    if (!currentCard) return;
    const reading = currentCard.reading || currentCard.front;
    const front = currentCard.front;

    const res = scorePronunciation(spoken, [reading, front].filter(Boolean) as string[]);

    if (res.isCorrect) {
      soundFX.play("correct", 0.6);
    } else {
      soundFX.play("wrong", 0.4);
    }

    if (res.tier === "perfect") {
      setEmotion("senang");
      void playSample("すごい！上手！");
    } else if (res.tier === "good") {
      setEmotion("biasa");
    } else {
      setEmotion("bingung");
    }

    setEvaluation({
      score: res.score,
      spokenText: spoken || "(Tidak terdengar jelas)",
      isCorrect: res.isCorrect,
      tip: res.tip,
    });

    setScores((prev) => ({ ...prev, [currentIndex]: res.score }));
    setMode("idle");
  }, [currentCard, currentIndex, playSample]);

  // ── Mulai Mendengarkan Suara User ──
  const startListening = useCallback(async () => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    // Bersihkan hasil evaluasi lama seketika saat mic mulai ditahan
    setEvaluation(null);
    setLiveTranscript("");
    setMode("listening");
    setEmotion("biasa");
    setIsVoiced(false);
    setVisualScale(0);

    vadTrackerRef.current.start();
    meterRef.current?.resume();

    // 1. Setup AudioMeter via MediaStream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      meterRef.current?.attachMic(stream);

      if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = setInterval(() => {
        const rms = meterRef.current?.micRms() ?? 0;
        const vad = vadTrackerRef.current.feedRms(rms, 50);
        setIsVoiced(vad.isAboveNoiseFloor);
        setVisualScale(vad.visualScale);
      }, 50);

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

    // 2. Setup SpeechRecognition (Web Speech API) jika didukung browser
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRec) {
      try {
        const recognition = new SpeechRec();
        recognitionRef.current = recognition;
        recognition.lang = "ja-JP";
        recognition.interimResults = true; // Streaming teks langsung saat bicara
        recognition.maxAlternatives = 1;

        recognition.onresult = (event: any) => {
          let interim = "";
          let final = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              final += event.results[i][0].transcript;
            } else {
              interim += event.results[i][0].transcript;
            }
          }
          const spoken = (final || interim).trim();
          if (spoken) {
            setLiveTranscript(spoken);
          }
          if (final) {
            evaluateSpeech(final);
          }
        };

        recognition.onerror = () => {
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

    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
    setIsVoiced(false);
    setVisualScale(0);

    // Hentikan Web Speech API
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }

    const hadSpeech = vadTrackerRef.current.hasDetectedSpeech;

    // Hentikan MediaRecorder
    const rec = mediaRecorderRef.current;
    if (rec && rec.state === "recording") {
      rec.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        // Lapis 1 Proteksi: Jika mic ditahan saat suasana hening / desis kipas, jangan buang ke server
        if (!hadSpeech) {
          setEvaluation({
            score: 0,
            spokenText: "(Suasana terlalu hening)",
            isCorrect: false,
            tip: "Suasana terlalu hening. Dekatkan mikrofon dan ucapkan kata dengan jelas ya.",
          });
          setEmotion("bingung");
          setMode("idle");
          return;
        }

        // Jika evaluasi belum diisi oleh Web Speech API, panggil endpoint transkripsi server dengan target bias fonetik
        if (!evaluation) {
          try {
            const target = currentCard ? (currentCard.reading || currentCard.front) : "";
            const url = target
              ? `/api/ask/transcribe?lang=ja&target=${encodeURIComponent(target)}`
              : "/api/ask/transcribe?lang=ja";
            const res = await fetch(url, {
              method: "POST",
              headers: { "content-type": audioBlob.type || "audio/webm" },
              body: audioBlob,
            });
            const data = await res.json();
            if (data?.status === "NO_MATCH_JAPANESE") {
              setEvaluation({
                score: 0,
                spokenText: "(Bukan bahasa Jepang)",
                isCorrect: false,
                tip: "Gunakan pelafalan bahasa Jepang ya! Neko-sensei menunggu ucapan bahasa Jepang.",
              });
              setEmotion("bingung");
              setMode("idle");
              return;
            }
            if (data?.text) {
              setLiveTranscript(data.text);
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
      if (!hadSpeech) {
        setEvaluation({
          score: 0,
          spokenText: "(Suasana terlalu hening)",
          isCorrect: false,
          tip: "Suasana terlalu hening. Dekatkan mikrofon dan ucapkan kata dengan jelas ya.",
        });
        setEmotion("bingung");
        setMode("idle");
        return;
      }
      if (!evaluation) {
        evaluateSpeech("");
      }
    }
  }, [evaluation, evaluateSpeech, currentCard]);

  const handleNext = () => {
    if (currentIndex < list.length - 1) {
      setCurrentIndex((i) => i + 1);
      setEvaluation(null);
      setLiveTranscript("");
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
      setLiveTranscript("");
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
          Kamu telah melatih pengucapan lisan langsung dengan Voice AI Miu-chan.
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
              setLiveTranscript("");
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

      {/* Panggung Maskot Miu-chan & Subtitle Pintar (Fixed Sanctuary Zone) */}
      <div className={styles.mascotStage}>
        <div className={styles.avatarBox}>
          <NekoAvatar
            mode={mode}
            emotion={emotion}
            micLevel={getMicLevel}
            voiceLevel={getVoiceLevel}
            size={140}
            label="Miu-chan Voice AI"
          />
        </div>

        {/* ── SUBTITLE LANGSUNG DI BAWAH MIU-CHAN (ZERO-LAYOUT-SHIFT SANCTUARY) ── */}
        <div className={styles.subtitleWrapper}>
          {mode === "listening" ? (
            <div className={styles.listeningSubtitle}>
              <span className={styles.livePulseDot} aria-hidden="true" />
              <span className={styles.subtitleText} lang="ja">
                {liveTranscript
                  ? `"${liveTranscript}"`
                  : isVoiced
                    ? "Mendeteksi bahasa Jepang…"
                    : "Mendengarkan ucapanmu…"}
              </span>
            </div>
          ) : mode === "processing" ? (
            <div className={styles.processingSubtitle}>
              <span aria-hidden="true">💭</span>
              <span className={styles.subtitleText}>Miu-chan memeriksa ucapanmu…</span>
            </div>
          ) : mode === "speaking" ? (
            <div className={styles.speakingSubtitle}>
              <span aria-hidden="true">🔊</span>
              <span className={styles.subtitleText} lang="ja">
                "{currentCard?.reading || currentCard?.front}"
              </span>
            </div>
          ) : evaluation ? (
            <div
              className={`${styles.resultSubtitle} ${
                evaluation.isCorrect ? styles.resultSubtitleCorrect : styles.resultSubtitleWrong
              }`}
            >
              <div className={styles.resultHeaderRow}>
                <span className={styles.resultSubtitleBadge}>
                  {evaluation.isCorrect ? "✨ Tepat!" : "🐾 Belum pas"} ({evaluation.score}%)
                </span>
                <span className={styles.resultSubtitleCaptured} lang="ja">
                  "{evaluation.spokenText}"
                </span>
              </div>
              {evaluation.tip && (
                <p className={styles.resultSubtitleTip}>{evaluation.tip}</p>
              )}
            </div>
          ) : (
            <div className={styles.idleSubtitle}>
              <span>🐾 Tahan tombol mic untuk mengucapkan kata ini</span>
            </div>
          )}
        </div>
      </div>

      {/* Kartu Target Kata (Fixed-Height Sanctuary Canvas) */}
      {currentCard && (
        <div className={styles.targetCard}>
          <p className={styles.targetReading} lang="ja">
            {currentCard.reading || "\u00A0"}
          </p>
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

      {/* Aksi Mikrofon Interaktif Anti-Lepas (Zero-Slip Hardware-Locked Pointer Capture) */}
      <div className={styles.micActionArea}>
        <StablePushToTalkButton
          onRecordingStart={startListening}
          onRecordingEnd={() => void stopListening()}
          disabled={mode === "processing" || mode === "speaking"}
          size="md"
          label="Tahan"
          activeLabel="Merekam..."
          isVoiced={isVoiced}
          visualScale={visualScale}
        />
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
