/**
 * Lapis 1 Proteksi Sinyal Audio: RMS Noise Gate & Voice Activity Detection (VAD)
 *
 * Mencegah halusinasi STT saat suasana hening / desis ruangan (room tone).
 * - Suara di bawah -42 dBFS dianggap desis kipas/keheningan dan langsung dibuang di sisi klien.
 * - Hangover time 600ms - 800ms menjaga ucapan tidak terpotong di tengah kalimat.
 * - Visual scale hanya aktif ketika suara benar-benar menembus ambang batas.
 */

export const RMS_NOISE_FLOOR_DBFS = -42;
export const LINEAR_NOISE_THRESHOLD = 0.007943; // 10^(-42 / 20)
export const MIN_VOICED_DURATION_MS = 180; // Minimal durasi suara vokal manusia asli agar tidak tertipu ketukan/klik
export const DEFAULT_HANGOVER_MS = 800; // Hangover time: 800ms hening sebelum dianggap selesai bicara

export function rmsToDbfs(rms: number): number {
  if (rms <= 0.000001) return -100;
  return 20 * Math.log10(rms);
}

export function dbfsToRms(dbfs: number): number {
  return Math.pow(10, dbfs / 20);
}

export interface VadState {
  currentRms: number;
  currentDbfs: number;
  isAboveNoiseFloor: boolean;
  isVoiced: boolean;
  voicedDurationMs: number;
  hadSpeech: boolean;
  visualScale: number; // 0..1 untuk Waveform Ring di sekitar tombol mic
}

export class VoiceActivityTracker {
  private startedAt = 0;
  private consecutiveLoudTicks = 0;
  private voicedDurationMs = 0;
  private quietSince = 0;
  private hadSpeech = false;
  private currentRms = 0;
  private currentDbfs = -100;
  private isVoiced = false;
  private visualScale = 0;

  constructor(
    private readonly thresholdDbfs = RMS_NOISE_FLOOR_DBFS,
    private readonly hangoverMs = DEFAULT_HANGOVER_MS,
  ) {}

  start(): void {
    this.startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
    this.consecutiveLoudTicks = 0;
    this.voicedDurationMs = 0;
    this.quietSince = 0;
    this.hadSpeech = false;
    this.currentRms = 0;
    this.currentDbfs = -100;
    this.isVoiced = false;
    this.visualScale = 0;
  }

  feedRms(rms: number, deltaMs = 50): VadState {
    this.currentRms = rms;
    this.currentDbfs = rmsToDbfs(rms);
    const isAbove = this.currentDbfs >= this.thresholdDbfs;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();

    if (isAbove) {
      this.consecutiveLoudTicks++;
      this.quietSince = 0;
      // Filter suara impulsif pendek (ketukan meja, klik mouse) dengan syarat minimal 2 tick berturut-turut (~100ms)
      if (this.consecutiveLoudTicks >= 2) {
        this.isVoiced = true;
        this.voicedDurationMs += deltaMs;
        if (this.voicedDurationMs >= MIN_VOICED_DURATION_MS) {
          this.hadSpeech = true;
        }
      }
      // Skala visual 0..1 yang halus untuk gelombang waveform ring
      const targetScale = Math.min(1, Math.max(0, (this.currentDbfs - this.thresholdDbfs) / 28));
      this.visualScale = this.visualScale * 0.4 + targetScale * 0.6;
    } else {
      this.consecutiveLoudTicks = 0;
      this.isVoiced = false;
      this.visualScale = this.visualScale * 0.6;
      if (this.visualScale < 0.02) this.visualScale = 0;

      if (this.hadSpeech && !this.quietSince) {
        this.quietSince = now;
      }
    }

    return this.getState();
  }

  /** Apakah rekaman harus dihentikan otomatis karena jeda hening (hangover time) tercapai setelah berbicara */
  shouldAutoStopAfterSpeech(): boolean {
    if (!this.hadSpeech || !this.quietSince) return false;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    return now - this.quietSince >= this.hangoverMs;
  }

  /** Apakah durasi hening total tercapai sejak awal mikrofon dibuka (belum ada suara manusia sama sekali) */
  isTimedOutSilent(timeoutMs = 7000): boolean {
    if (this.hadSpeech) return false;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    return now - this.startedAt >= timeoutMs;
  }

  getState(): VadState {
    return {
      currentRms: this.currentRms,
      currentDbfs: this.currentDbfs,
      isAboveNoiseFloor: this.currentDbfs >= this.thresholdDbfs,
      isVoiced: this.isVoiced,
      voicedDurationMs: this.voicedDurationMs,
      hadSpeech: this.hadSpeech,
      visualScale: this.visualScale,
    };
  }

  get hasDetectedSpeech(): boolean {
    return this.hadSpeech;
  }
}

