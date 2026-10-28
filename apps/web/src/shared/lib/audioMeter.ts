/**
 * Mengukur volume mikrofon dan suara Neko (0..1) untuk animasi.
 *
 * - Panggil resume() di dalam aksi pengguna (misalnya saat tombol mic ditekan),
 *   karena browser menahan AudioContext sampai ada interaksi.
 * - attachVoice() hanya menyambungkan audio kalau AudioContext sudah berjalan.
 *   Kalau tidak, audio diputar seperti biasa dan animasi memakai gerak bibir tiruan.
 */
export class AudioMeter {
  private ctx: AudioContext | null = null;
  private mic: { source: MediaStreamAudioSourceNode; analyser: AnalyserNode; stream: MediaStream } | null = null;
  private voice: { source: MediaElementAudioSourceNode; analyser: AnalyserNode } | null = null;
  private buf = new Float32Array(1024);
  private peak = { mic: 0.08, voice: 0.08 };

  resume(): void {
    if (typeof window === "undefined") return;
    try {
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  attachMic(stream: MediaStream): void {
    if (!this.ctx || this.mic?.stream === stream) return;
    try {
      this.mic?.source.disconnect();
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.makeAnalyser();
      source.connect(analyser);
      this.mic = { source, analyser, stream };
    } catch {
      this.mic = null;
    }
  }

  /** Mengembalikan true kalau suara bisa dianalisis. */
  attachVoice(audio: HTMLAudioElement): boolean {
    this.detachVoice();
    if (!this.ctx || this.ctx.state !== "running") return false;
    try {
      const source = this.ctx.createMediaElementSource(audio);
      const analyser = this.makeAnalyser();
      source.connect(analyser);
      analyser.connect(this.ctx.destination);
      this.voice = { source, analyser };
      return true;
    } catch {
      this.voice = null;
      return false;
    }
  }

  detachVoice(): void {
    if (!this.voice) return;
    try {
      this.voice.source.disconnect();
      this.voice.analyser.disconnect();
    } catch {
      /* sudah terputus */
    }
    this.voice = null;
  }

  micLevel = (): number => this.read(this.mic?.analyser, "mic");
  voiceLevel = (): number => this.read(this.voice?.analyser, "voice");

  dispose(): void {
    this.detachVoice();
    this.mic?.source.disconnect();
    this.mic = null;
    void this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private makeAnalyser(): AnalyserNode {
    const a = this.ctx!.createAnalyser();
    a.fftSize = 1024;
    a.smoothingTimeConstant = 0.3;
    return a;
  }

  private read(analyser: AnalyserNode | undefined, key: "mic" | "voice"): number {
    if (!analyser) return 0;
    analyser.getFloatTimeDomainData(this.buf);
    let sum = 0;
    for (let i = 0; i < this.buf.length; i++) sum += this.buf[i] * this.buf[i];
    const rms = Math.sqrt(sum / this.buf.length);
    // Penguatan otomatis: suara pelan atau keras sama-sama terlihat jelas
    this.peak[key] = Math.max(rms, this.peak[key] * 0.995, 0.04);
    const level = (rms - 0.008) / (this.peak[key] * 0.85);
    return level < 0 ? 0 : level > 1 ? 1 : level;
  }
}
