"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BookOpenIcon,
  CameraIcon,
  CheckIcon,
  ChevronRightIcon,
  ClockIcon,
  CopyIcon,
  MicIcon,
  PauseIcon,
  PlayIcon,
  RotateCwIcon,
  UploadIcon,
  Volume2Icon,
  XIcon,
} from "@/shared/ui/icons";
import { scannerApi } from "../data/scannerApi";
import type { ScanResult, ScanToken, VoiceCheckResult } from "../domain/types";
import styles from "./scanner.module.css";

type FuriganaFilter = "all" | "kanji" | "none";
type PlaybackSpeed = 0.5 | 0.75 | 1.0;
type VoiceType = "female" | "male" | "id";

interface QuickSample {
  tag: string;
  title: string;
  sub: string;
  text: string;
}

const QUICK_SAMPLES: QuickSample[] = [
  {
    tag: "N5",
    title: "Menu Restoran",
    sub: "Kosakata makanan dan pesanan",
    text: "いらっしゃいませ。本日のおすすめは新鮮な刺身定食です。",
  },
  {
    tag: "N4",
    title: "Pengumuman Stasiun",
    sub: "Informasi transit dan peringatan",
    text: "次は新宿駅です。お忘れ物のないようご注意ください。",
  },
  {
    tag: "N3",
    title: "Sastra Klasik",
    sub: "Kutipan novel Natsume Soseki",
    text: "吾輩は猫である。名前はまだ無い。どこで生れたかとんと見当がつかぬ。",
  },
];

export function ScannerScreen() {
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  // Freeze & Live Scanning State
  const [isFrozen, setIsFrozen] = useState(false);
  const [frozenImage, setFrozenImage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [isLiveScanning, setIsLiveScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<ScanResult | null>(null);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaFilter>("all");
  const [showDetailView, setShowDetailView] = useState(false);

  // Manual Text Modal
  const [showTextModal, setShowTextModal] = useState(false);
  const [manualText, setManualText] = useState("");

  // TTS Reader
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>(1.0);
  const [activeVoice, setActiveVoice] = useState<VoiceType>("female");
  const [activeTokenIndex, setActiveTokenIndex] = useState<number | null>(null);

  // Shadowing & Voice Check
  const [isRecording, setIsRecording] = useState(false);
  const [voiceResult, setVoiceResult] = useState<VoiceCheckResult | null>(null);

  // Smart Dictionary Modal
  const [selectedToken, setSelectedToken] = useState<ScanToken | null>(null);
  const [srsSaved, setSrsSaved] = useState(false);
  const [srsLoading, setSrsLoading] = useState(false);

  // History Drawer
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<ScanResult[]>([]);

  // Copied indicator
  const [copied, setCopied] = useState(false);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const resultCardRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const speechUttRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recognitionRef = useRef<any>(null);
  const liveInFlightRef = useRef(false);

  // ── Camera Management ──
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setCameraActive(false);
        return;
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }

      const track = stream.getVideoTracks()[0];
      const capabilities: any = track?.getCapabilities?.() || {};
      if (capabilities.torch) {
        setTorchSupported(true);
      }
    } catch (err: any) {
      console.warn("Camera start warning:", err);
      setCameraActive(false);
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (!isFrozen && !frozenImage) {
      void startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [facingMode, isFrozen, frozenImage, startCamera, stopCamera]);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && torchSupported) {
      try {
        const next = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: next }],
        });
        setTorchOn(next);
      } catch (err) {
        console.warn("Torch error:", err);
      }
    }
  };

  const flipCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  const scrollToResult = () => {
    setTimeout(() => {
      resultCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  };

  // ── Continuous Real-time Live AR Scan Loop ──
  useEffect(() => {
    if (!cameraActive || isFrozen || Boolean(frozenImage)) return;

    const interval = setInterval(async () => {
      if (liveInFlightRef.current) return;
      if (!videoRef.current || videoRef.current.videoWidth === 0) return;
      if (!canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const scale = Math.min(1, 760 / (video.videoWidth || 760));
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const base64 = canvas.toDataURL("image/jpeg", 0.72);

      liveInFlightRef.current = true;
      setIsLiveScanning(true);
      try {
        const res = await scannerApi.analyze({
          image: base64,
          mode: "live",
        });

        if (res.detected && res.rawJapaneseText && res.rawJapaneseText.trim().length > 0) {
          setResult(res);
          setError(null);
        }
      } catch {
        // Abaikan error jaringan sementara pada live loop
      } finally {
        liveInFlightRef.current = false;
        setIsLiveScanning(false);
      }
    }, 2200);

    return () => clearInterval(interval);
  }, [cameraActive, isFrozen, frozenImage]);

  // ── Toggle Freeze / Live Capture ──
  const toggleFreeze = async () => {
    if (isFrozen || frozenImage) {
      setIsFrozen(false);
      setFrozenImage(null);
      void startCamera();
    } else {
      if (cameraActive && videoRef.current && videoRef.current.videoWidth > 0 && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const snap = canvas.toDataURL("image/jpeg", 0.88);
          setFrozenImage(snap);
          setIsFrozen(true);
          stopCamera();

          setLoading(true);
          setError(null);
          try {
            const res = await scannerApi.analyze({ image: snap, mode: "crop" });
            setResult(res);
            if (!res.detected) {
              setError("Arahkan lensa lebih dekat ke teks bahasa Jepang untuk hasil maksimal.");
            }
          } catch (err: any) {
            setError(err.message || "Gagal memindai gambar.");
          } finally {
            setLoading(false);
          }
        }
      } else {
        nativeCameraInputRef.current?.click();
      }
    }
  };

  // ── Handle Upload Foto dari Galeri / Kamera HP Native ──
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      stopCamera();
      setFrozenImage(base64);
      setIsFrozen(true);
      setLoading(true);
      setError(null);
      setVoiceResult(null);

      try {
        const res = await scannerApi.analyze({
          image: base64,
          mode: "crop",
        });
        setResult(res);
        if (!res.detected) {
          setError(res.indonesianTrans || "Tidak terdeteksi aksara Jepang yang jelas pada gambar.");
        }
      } catch (err: any) {
        setError(err.message || "Gagal memindai gambar galeri.");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ── Handle Analisis Teks Manual ──
  const handleManualAnalyze = async () => {
    if (!manualText.trim()) return;
    setLoading(true);
    setError(null);
    setVoiceResult(null);
    setShowTextModal(false);

    try {
      const res = await scannerApi.analyze({
        text: manualText.trim(),
        mode: "crop",
      });
      setResult(res);
      setShowDetailView(true);
      scrollToResult();
    } catch (err: any) {
      setError(err.message || "Gagal menganalisis teks.");
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Sample Presets ──
  const handleSampleSelect = async (sampleText: string) => {
    setLoading(true);
    setError(null);
    setVoiceResult(null);

    try {
      const res = await scannerApi.analyze({
        text: sampleText,
        mode: "crop",
      });
      setResult(res);
      setShowDetailView(true);
      scrollToResult();
    } catch (err: any) {
      setError(err.message || "Gagal menganalisis contoh.");
    } finally {
      setLoading(false);
    }
  };

  // ── Audio Synthesis & Karaoke Sync ──
  const stopAudio = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setActiveTokenIndex(null);
  }, []);

  const playNativeTts = () => {
    if (!result) return;
    if (isPlaying) {
      stopAudio();
      return;
    }

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("Browser tidak mendukung Web Speech Synthesis.");
      return;
    }

    window.speechSynthesis.cancel();

    const textToSpeak = activeVoice === "id" ? result.indonesianTrans : result.rawJapaneseText;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = playbackSpeed;
    utterance.lang = activeVoice === "id" ? "id-ID" : "ja-JP";

    const voices = window.speechSynthesis.getVoices();
    if (activeVoice === "id") {
      const idVoice = voices.find((v) => v.lang.startsWith("id"));
      if (idVoice) utterance.voice = idVoice;
    } else {
      const jaVoices = voices.filter((v) => v.lang.startsWith("ja"));
      if (jaVoices.length > 0) {
        if (activeVoice === "female") {
          const female = jaVoices.find(
            (v) =>
              v.name.toLowerCase().includes("female") ||
              v.name.toLowerCase().includes("kyoko") ||
              v.name.toLowerCase().includes("haruka") ||
              v.name.toLowerCase().includes("ayumi")
          );
          utterance.voice = female || jaVoices[0];
        } else {
          const male = jaVoices.find(
            (v) =>
              v.name.toLowerCase().includes("male") ||
              v.name.toLowerCase().includes("otoya") ||
              v.name.toLowerCase().includes("ichiro")
          );
          utterance.voice = male || jaVoices[jaVoices.length - 1];
        }
      }
    }

    utterance.onboundary = (e) => {
      if (activeVoice !== "id" && e.charIndex !== undefined && result.tokens.length > 0) {
        let cumulative = 0;
        for (let i = 0; i < result.tokens.length; i++) {
          cumulative += result.tokens[i].surfaceForm.length;
          if (e.charIndex < cumulative) {
            setActiveTokenIndex(i);
            break;
          }
        }
      }
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setActiveTokenIndex(null);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setActiveTokenIndex(null);
    };

    speechUttRef.current = utterance;
    setIsPlaying(true);
    window.speechSynthesis.speak(utterance);
  };

  // ── Shadowing & Voice Check ──
  const startShadowing = () => {
    if (!result) return;
    if (isRecording) {
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Browser Anda belum mendukung Web Speech Recognition. Gunakan peramban Google Chrome.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ja-JP";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = async (event: any) => {
        const spoken = event.results[0][0].transcript;
        setIsRecording(false);
        try {
          const checkRes = await scannerApi.evaluatePronunciation(
            result.rawJapaneseText,
            spoken
          );
          setVoiceResult(checkRes);
        } catch (err: any) {
          console.warn("Voice check error:", err);
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.warn(err);
      setIsRecording(false);
    }
  };

  // ── Smart Dictionary: Save to SRS ──
  const handleSaveToSrs = async () => {
    if (!selectedToken) return;
    setSrsLoading(true);
    try {
      await scannerApi.saveToSrs(selectedToken);
      setSrsSaved(true);
      setTimeout(() => setSrsSaved(false), 3000);
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan ke flashcard.");
    } finally {
      setSrsLoading(false);
    }
  };

  // ── History Management ──
  const loadHistory = async () => {
    setHistoryOpen(true);
    try {
      const items = await scannerApi.getHistory();
      setHistoryItems(items);
    } catch {
      setHistoryItems([]);
    }
  };

  const handleSelectHistory = (item: ScanResult) => {
    setResult(item);
    setHistoryOpen(false);
    stopAudio();
    setVoiceResult(null);
    setShowDetailView(true);
    scrollToResult();
  };

  // ── Helpers ──
  const getPosClass = (pos: string) => {
    const p = pos.toLowerCase();
    if (p.includes("verb") || p.includes("kerja")) return styles.posVerb;
    if (p.includes("noun") || p.includes("benda")) return styles.posNoun;
    if (p.includes("particle") || p.includes("partikel")) return styles.posParticle;
    if (p.includes("adj") || p.includes("sifat")) return styles.posAdjective;
    return styles.posOther;
  };

  const copyTranslation = () => {
    if (!result) return;
    navigator.clipboard.writeText(result.indonesianTrans);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={styles.container}>
      {/* ── Viewfinder Utama / Kamera Area ── */}
      <div className={styles.cameraBox}>
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          className={styles.videoFeed}
          playsInline
          muted
          autoPlay
          style={{ display: cameraActive && !frozenImage ? "block" : "none" }}
        />

        {/* Frozen Frame atau Preview Foto Galeri */}
        {frozenImage && (
          <img src={frozenImage} alt="Pratinjau pemindaian gambar" className={styles.frozenImagePreview} />
        )}

        {/* Hidden Canvas untuk Capture Frame */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Fallback Viewfinder jika izin kamera belum aktif */}
        {!cameraActive && !frozenImage && (
          <div className={styles.cameraFallback}>
            <div className={styles.fallbackIconWrap}>
              <CameraIcon size={28} />
            </div>
            <h2 className={styles.fallbackTitle}>Kamera Siap Memindai</h2>
            <p className={styles.fallbackText}>
              Arahkan lensa ke aksara Kanji, buku pelajaran, atau papan informasi untuk menampilkan Furigana dan arti kata.
            </p>
            <div className={styles.fallbackBtnRow}>
              <button
                type="button"
                className={styles.primaryFallbackBtn}
                onClick={() => nativeCameraInputRef.current?.click()}
              >
                <CameraIcon size={16} />
                <span>Ambil Foto Langsung</span>
              </button>
              <button
                type="button"
                className={styles.secondaryFallbackBtn}
                onClick={() => fileInputRef.current?.click()}
              >
                <UploadIcon size={16} />
                <span>Pilih Berkas Galeri</span>
              </button>
            </div>
          </div>
        )}

        {/* Top-Left HUD: Status Pemindaian */}
        <div className={styles.liveStatusHud}>
          <span
            className={
              isFrozen || Boolean(frozenImage)
                ? styles.statusDotPaused
                : styles.statusDotLive
            }
          />
          <span>
            {isFrozen || Boolean(frozenImage)
              ? "Tampilan Terkunci"
              : isLiveScanning
              ? "Membaca Aksara..."
              : "Pemindaian Aktif"}
          </span>
        </div>

        {/* Top-Right Camera Controls (Riwayat, Flash & Flip) */}
        <div className={styles.cameraControlsTop}>
          <button
            type="button"
            className={styles.camBtn}
            onClick={() => void loadHistory()}
            title="Riwayat Pemindaian"
            aria-label="Buka riwayat pemindaian"
          >
            <ClockIcon size={18} />
          </button>
          {torchSupported && cameraActive && !frozenImage && (
            <button
              type="button"
              className={`${styles.camBtn} ${torchOn ? styles.camBtnActive : ""}`}
              onClick={() => void toggleTorch()}
              title="Lampu Kilat"
            >
              <CameraIcon size={18} />
            </button>
          )}
          {cameraActive && !frozenImage && (
            <button
              type="button"
              className={styles.camBtn}
              onClick={flipCamera}
              title="Balik Kamera Depan atau Belakang"
            >
              <RotateCwIcon size={18} />
            </button>
          )}
        </div>

        {/* Framing Reticle (Clean Japanese Rangefinder Brackets) */}
        {cameraActive && !frozenImage && (
          <div className={styles.framingOverlay}>
            <div className={styles.reticle}>
              <span className={styles.reticleCornerTL} />
              <span className={styles.reticleCornerTR} />
              <span className={styles.reticleCornerBL} />
              <span className={styles.reticleCornerBR} />
            </div>
          </div>
        )}

        {/* ── REAL-TIME AR TRANSLATION CARD FLOATING ON CAMERA ── */}
        {result && result.detected !== false && (
          <div className={styles.arLiveOverlay}>
            <div className={styles.arTopRow}>
              <div className={styles.arBadgeGroup}>
                <span className={styles.arLevelBadge}>JLPT {result.detectedLevel || "N5"}</span>
                <span className={styles.arStatusBadge}>Terjemahan Langsung</span>
              </div>
              <button
                type="button"
                className={styles.arDismissBtn}
                onClick={() => setResult(null)}
                title="Tutup terjemahan ini"
                aria-label="Tutup overlay"
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Kanji Asli dengan Furigana Ruby */}
            <div
              className={styles.arLiveJapanese}
              lang="ja"
              dangerouslySetInnerHTML={{ __html: result.furiganaHtml || result.rawJapaneseText }}
            />

            {/* Transliterasi Romaji */}
            {result.romajiText && (
              <div className={styles.arLiveRomaji}>{result.romajiText}</div>
            )}

            {/* Terjemahan Bahasa Indonesia */}
            <p className={styles.arLiveIndonesian}>{result.indonesianTrans}</p>

            {/* Baris Tombol Aksi */}
            <div className={styles.arActionRow}>
              <button
                type="button"
                className={styles.arAudioBtn}
                onClick={playNativeTts}
                title="Dengarkan pengucapan penutur asli"
              >
                {isPlaying ? <PauseIcon size={14} /> : <Volume2Icon size={14} />}
                <span>{isPlaying ? "Hentikan Suara" : "Dengarkan Audio"}</span>
              </button>

              <button
                type="button"
                className={styles.arDetailBtn}
                onClick={() => {
                  setShowDetailView(true);
                  scrollToResult();
                }}
              >
                <span>Bedah Kosakata</span>
                <ChevronRightIcon size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ── Bottom HUD Controls Bar ── */}
        <div className={styles.cameraControlsBottom}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />
          <input
            ref={nativeCameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={handleFileUpload}
          />

          {/* Tombol Pilih dari Galeri */}
          <button
            type="button"
            className={styles.hudCircleBtn}
            onClick={() => fileInputRef.current?.click()}
            title="Pilih foto dari berkas galeri"
          >
            <UploadIcon size={18} />
            <span className={styles.hudBtnLabel}>Galeri</span>
          </button>

          {/* Tombol Utama: Shutter / Kunci Tampilan (Freeze/Live) */}
          <button
            type="button"
            className={`${styles.shutterLiveBtn} ${
              isFrozen || Boolean(frozenImage) ? styles.shutterBtnFrozen : ""
            }`}
            onClick={() => void toggleFreeze()}
            disabled={loading}
            title={
              isFrozen || Boolean(frozenImage)
                ? "Lanjut Live Scan"
                : "Kunci Tampilan Saat Ini"
            }
          >
            <CameraIcon size={24} />
            <span style={{ fontSize: "0.58rem", fontWeight: 800 }}>
              {isFrozen || Boolean(frozenImage) ? "LIVE" : "KUNCI"}
            </span>
          </button>

          {/* Tombol Input Teks Manual */}
          <button
            type="button"
            className={styles.hudCircleBtn}
            onClick={() => setShowTextModal(true)}
            title="Ketik teks bahasa Jepang manual"
          >
            <BookOpenIcon size={18} />
            <span className={styles.hudBtnLabel}>Teks</span>
          </button>
        </div>
      </div>

      {/* ── Contoh Bacaan Praktik (Content-Driven Study Cards) ── */}
      <div className={styles.samplePresetsCard}>
        <div className={styles.samplePresetsHead}>
          <div>
            <h3 className={styles.samplePresetsTitle}>Contoh Bacaan Praktik</h3>
            <p className={styles.samplePresetsSub}>Pilih contoh kalimat jika Anda belum memegang buku fisik saat ini</p>
          </div>
        </div>
        <div className={styles.sampleList}>
          {QUICK_SAMPLES.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              className={styles.sampleItem}
              onClick={() => void handleSampleSelect(sample.text)}
              disabled={loading}
            >
              <span className={styles.sampleLevelTag}>{sample.tag}</span>
              <div className={styles.sampleTextCol}>
                <strong className={styles.sampleTitle}>{sample.title}</strong>
                <span className={styles.sampleSub}>{sample.sub}</span>
              </div>
              <ChevronRightIcon size={16} className={styles.sampleArrow} />
            </button>
          ))}
        </div>
      </div>

      {/* ── Status Loading / Error ── */}
      {loading && (
        <div className={styles.resultCard} style={{ textAlign: "center", padding: "1.75rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-block",
                width: 18,
                height: 18,
                border: "2px solid #fce8ea",
                borderTopColor: "var(--color-primary)",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <strong style={{ color: "var(--color-primary)", fontSize: "0.88rem" }}>
              Memproses pengenalan karakter dan analisis tata bahasa...
            </strong>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.resultCard} style={{ borderColor: "var(--color-danger)", background: "#fff1f2" }}>
          <p style={{ margin: 0, color: "var(--color-danger)", fontSize: "0.85rem", fontWeight: 700 }}>{error}</p>
        </div>
      )}

      {/* ── Hasil Bedah Kosakata & Suara Lengkap ── */}
      {result && result.detected !== false && (showDetailView || !loading) && (
        <div ref={resultCardRef} className={styles.resultCard}>
          {/* Top Bar: Level & Furigana Filter */}
          <div className={styles.resultTopBar}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span className={styles.levelTag}>
                <span>JLPT {result.detectedLevel || "N5"}</span>
              </span>
              <span style={{ fontSize: "0.76rem", color: "var(--color-text-muted)" }}>
                {result.tokens.length} Kosakata Terurai
              </span>
            </div>

            {/* Furigana Display Options */}
            <div className={styles.furiganaToggleWrap}>
              <span>Furigana:</span>
              <button
                type="button"
                className={`${styles.furiganaBtn} ${furiganaMode === "all" ? styles.furiganaBtnActive : ""}`}
                onClick={() => setFuriganaMode("all")}
              >
                Semua
              </button>
              <button
                type="button"
                className={`${styles.furiganaBtn} ${furiganaMode === "kanji" ? styles.furiganaBtnActive : ""}`}
                onClick={() => setFuriganaMode("kanji")}
              >
                Kanji Saja
              </button>
              <button
                type="button"
                className={`${styles.furiganaBtn} ${furiganaMode === "none" ? styles.furiganaBtnActive : ""}`}
                onClick={() => setFuriganaMode("none")}
              >
                Tutup
              </button>
            </div>
          </div>

          {/* Interactive Japanese Tokens Flow */}
          <div className={styles.japaneseBlock} lang="ja">
            {result.tokens.map((token, idx) => {
              const posCls = getPosClass(token.partOfSpeech);
              const isKaraokeActive = activeTokenIndex === idx;
              const hasKanji = /[\u4e00-\u9faf]/.test(token.surfaceForm);
              const showRuby =
                furiganaMode === "all" || (furiganaMode === "kanji" && hasKanji);

              return (
                <button
                  type="button"
                  key={token.id || idx}
                  className={`${styles.tokenChip} ${posCls} ${
                    isKaraokeActive ? styles.tokenActiveKaraoke : ""
                  }`}
                  onClick={() => setSelectedToken(token)}
                  title={`${token.surfaceForm} (${token.partOfSpeech}): Klik untuk bedah kamus`}
                >
                  <ruby>
                    {token.surfaceForm}
                    {showRuby && <rt>{token.readingKana}</rt>}
                  </ruby>
                </button>
              );
            })}
          </div>

          {/* Romaji Transliteration */}
          <div className={styles.romajiBlock}>{result.romajiText}</div>

          {/* Indonesian Translation Card */}
          <div className={styles.indonesianBlock}>
            <div>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  color: "var(--color-primary)",
                  display: "block",
                  marginBottom: 3,
                }}
              >
                Terjemahan Bahasa Indonesia
              </span>
              <p className={styles.indonesianText}>{result.indonesianTrans}</p>
            </div>
            <button
              type="button"
              className={styles.copyBtn}
              onClick={copyTranslation}
              title="Salin hasil terjemahan"
            >
              {copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
              <span>{copied ? "Tersalin" : "Salin"}</span>
            </button>
          </div>

          {/* ── System Audio Reader (Multi-Voice TTS) ── */}
          <div className={styles.audioBar}>
            <div className={styles.audioControlsLeft}>
              <button
                type="button"
                className={styles.playBtn}
                onClick={playNativeTts}
                title={isPlaying ? "Hentikan Suara" : "Putar Suara Native"}
              >
                {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
              </button>

              <div className={styles.speedGroup}>
                <button
                  type="button"
                  className={`${styles.speedBtn} ${playbackSpeed === 0.5 ? styles.speedBtnActive : ""}`}
                  onClick={() => setPlaybackSpeed(0.5)}
                >
                  0.5x
                </button>
                <button
                  type="button"
                  className={`${styles.speedBtn} ${playbackSpeed === 0.75 ? styles.speedBtnActive : ""}`}
                  onClick={() => setPlaybackSpeed(0.75)}
                >
                  0.75x
                </button>
                <button
                  type="button"
                  className={`${styles.speedBtn} ${playbackSpeed === 1.0 ? styles.speedBtnActive : ""}`}
                  onClick={() => setPlaybackSpeed(1.0)}
                >
                  1.0x
                </button>
              </div>
            </div>

            <div className={styles.voiceSelector}>
              <button
                type="button"
                className={`${styles.voiceBtn} ${activeVoice === "female" ? styles.voiceBtnActive : ""}`}
                onClick={() => setActiveVoice("female")}
              >
                <Volume2Icon size={13} />
                <span>Nanami (Wanita)</span>
              </button>
              <button
                type="button"
                className={`${styles.voiceBtn} ${activeVoice === "male" ? styles.voiceBtnActive : ""}`}
                onClick={() => setActiveVoice("male")}
              >
                <Volume2Icon size={13} />
                <span>Keita (Pria)</span>
              </button>
              <button
                type="button"
                className={`${styles.voiceBtn} ${activeVoice === "id" ? styles.voiceBtnActive : ""}`}
                onClick={() => setActiveVoice("id")}
              >
                Indonesia
              </button>
            </div>
          </div>

          {/* ── Shadowing & Pronunciation Practice ── */}
          <div className={styles.shadowingSection}>
            <div className={styles.shadowingHead}>
              <h3 className={styles.shadowingTitle}>
                <MicIcon size={17} />
                <span>Latihan Pengucapan (Shadowing)</span>
              </h3>
              <button
                type="button"
                className={`${styles.micRecordBtn} ${isRecording ? styles.micRecordBtnActive : ""}`}
                onClick={startShadowing}
              >
                <MicIcon size={15} />
                <span>{isRecording ? "Mendengarkan..." : "Ucapkan Sekarang"}</span>
              </button>
            </div>

            {voiceResult && (
              <div className={styles.voiceScoreCard}>
                <div
                  className={styles.scoreCircle}
                  style={{
                    background:
                      voiceResult.score >= 80
                        ? "var(--palette-matcha)"
                        : voiceResult.score >= 60
                        ? "var(--palette-tamago)"
                        : "var(--color-danger)",
                  }}
                >
                  {voiceResult.score}%
                </div>
                <div className={styles.scoreDesc}>
                  <p className={styles.scoreFeedback}>{voiceResult.feedback}</p>
                  <span className={styles.scoreSub}>
                    Audio terdeteksi: &ldquo;{voiceResult.spokenText}&rdquo; | Target: &ldquo;
                    {voiceResult.targetText}&rdquo;
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Input Teks Manual ── */}
      {showTextModal && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowTextModal(false);
          }}
        >
          <div className={styles.modalBox} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 800 }}>
                Ketik Teks Bahasa Jepang
              </h2>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setShowTextModal(false)}
                aria-label="Tutup jendela input"
              >
                <XIcon size={18} />
              </button>
            </div>

            <textarea
              className={styles.textInputArea}
              placeholder="Ketik atau tempel teks bahasa Jepang di sini... (Contoh: 今日はとてもいい天気ですね。)"
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={4}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "12px" }}>
              <button
                type="button"
                className={styles.secondaryFallbackBtn}
                style={{ color: "var(--color-text)", borderColor: "var(--color-border)" }}
                onClick={() => setShowTextModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.primaryFallbackBtn}
                onClick={() => void handleManualAnalyze()}
                disabled={loading || !manualText.trim()}
              >
                <BookOpenIcon size={16} />
                <span>Analisis Teks</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Smart Dictionary Modal (Bedah Kata) ── */}
      {selectedToken && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedToken(null);
          }}
        >
          <div className={styles.modalBox} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <div>
                <h2 className={styles.modalWordTitle} lang="ja">
                  {selectedToken.surfaceForm}
                </h2>
                <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                  <span className={styles.modalReading} lang="ja">
                    {selectedToken.readingKana}
                  </span>
                  <span className={styles.modalRomaji}>({selectedToken.romaji})</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setSelectedToken(null)}
                aria-label="Tutup modal kamus"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className={styles.modalBadges}>
              <span className={styles.badgeJlpt}>JLPT {selectedToken.jlptLevel || "N5"}</span>
              <span className={styles.badgePos}>{selectedToken.partOfSpeech}</span>
              {selectedToken.pitchAccent && (
                <span className={styles.badgePitch}>Nada: {selectedToken.pitchAccent}</span>
              )}
            </div>

            {selectedToken.dictionaryForm &&
              selectedToken.dictionaryForm !== selectedToken.surfaceForm && (
                <div className={styles.modalConjugation}>
                  Bentuk Kamus (Jisho): <strong lang="ja">{selectedToken.dictionaryForm}</strong>
                  {selectedToken.conjugation && ` | ${selectedToken.conjugation}`}
                </div>
              )}

            <div className={styles.modalMeaning}>
              <div className={styles.modalMeaningTitle}>Arti Bahasa Indonesia</div>
              <p className={styles.modalMeaningText}>{selectedToken.indonesianMean}</p>
            </div>

            {selectedToken.exampleSentence && (
              <div className={styles.modalExample}>
                <div className={styles.modalExampleJa} lang="ja">
                  {selectedToken.exampleSentence.ja}
                </div>
                <div className={styles.modalExampleId}>
                  {selectedToken.exampleSentence.id}
                </div>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.srsSaveBtn}
                onClick={() => void handleSaveToSrs()}
                disabled={srsLoading || srsSaved}
              >
                <CheckIcon size={16} />
                <span>{srsSaved ? "Tersimpan di SRS" : "Simpan ke Kartu Hafalan"}</span>
              </button>

              <Link
                href={`/huruf?q=${encodeURIComponent(selectedToken.surfaceForm)}`}
                className={styles.workbookBtn}
              >
                <span>Buku Latihan</span>
                <ChevronRightIcon size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Scan History Drawer / Modal ── */}
      {historyOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={(e) => {
            if (e.target === e.currentTarget) setHistoryOpen(false);
          }}
        >
          <div className={styles.modalBox} role="dialog" aria-modal="true">
            <div className={styles.modalHead}>
              <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>
                Riwayat Pemindaian ({historyItems.length})
              </h2>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setHistoryOpen(false)}
                aria-label="Tutup riwayat"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className={styles.historyList}>
              {historyItems.length === 0 ? (
                <p style={{ textAlign: "center", color: "var(--color-text-muted)", fontSize: "0.85rem", padding: "1.5rem" }}>
                  Belum ada riwayat pemindaian tersimpan.
                </p>
              ) : (
                historyItems.map((item) => (
                  <div
                    key={item.id}
                    className={styles.historyItem}
                    onClick={() => handleSelectHistory(item)}
                  >
                    <div className={styles.historyLeft}>
                      <span className={styles.historyJa}>{item.rawJapaneseText}</span>
                      <span className={styles.historyId}>{item.indonesianTrans}</span>
                      <span className={styles.historyDate}>
                        {new Date(item.createdAt).toLocaleString("id-ID")} | {item.detectedLevel || "N5"}
                      </span>
                    </div>
                    <ChevronRightIcon size={16} />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
