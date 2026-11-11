// lib/audio/SoundFXManager.ts
/**
 * SoundFXManager
 * Arsitektur Web Audio API Buffer Pool & Procedural Synthesizer berlatensi nol (0ms).
 * Mendukung pemuatan file audio (sound buffers) sekaligus fallback procedural synthesizer
 * sehingga 100% andal, bekerja offline tanpa network request macet, dan bebas latency.
 */
class SoundFXManager {
  private ctx: AudioContext | null = null;
  private soundBuffers: Map<string, AudioBuffer> = new Map();
  private isUnlocked: boolean = false;

  private initContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (this.ctx && !this.isUnlocked) {
      this.isUnlocked = true;
      // Auto-unlock pada interaksi pertama
      const unlock = () => {
        if (this.ctx && this.ctx.state === 'suspended') {
          void this.ctx.resume();
        }
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { once: true, passive: true });
      window.addEventListener('keydown', unlock, { once: true, passive: true });
    }
    return this.ctx;
  }

  public async preloadSounds(soundMap: Record<string, string>) {
    const ac = this.initContext();
    if (!ac) return;

    for (const [key, url] of Object.entries(soundMap)) {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        if (this.ctx) {
          const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
          this.soundBuffers.set(key, audioBuffer);
        }
      } catch (err) {
        // Fallback synthesizer akan menangani secara mulus bila file gagal dimuat
        console.warn(`[SoundFX] Info: Berkas audio '${key}' tidak tersedia di '${url}', beralih ke procedural synthesizer.`, err);
      }
    }
  }

  public play(key: string, volume: number = 0.5) {
    const ac = this.initContext();
    if (!ac) return;

    const buffer = this.soundBuffers.get(key);
    if (buffer) {
      try {
        const source = ac.createBufferSource();
        const gainNode = ac.createGain();
        source.buffer = buffer;
        gainNode.gain.value = Math.max(0, Math.min(1, volume));

        source.connect(gainNode);
        gainNode.connect(ac.destination);
        source.start(0);
        return;
      } catch (e) {
        console.warn(`[SoundFX] Error playing buffer for ${key}, falling back to synth`, e);
      }
    }

    // High-Fidelity Procedural Audio Synthesizer Fallback
    this.synthesizeSound(key, ac, volume);
  }

  /**
   * Procedural Audio Synthesizer: Menghasilkan efek suara akustik organik
   * murni dari osilator, filter biquad, dan noise generator tanpa memerlukan
   * dependensi file eksternal ataupun latensi jaringan.
   */
  private synthesizeSound(key: string, ac: AudioContext, vol: number) {
    const t0 = ac.currentTime;

    switch (key) {
      case 'tap':
      case 'button_click': {
        // Subtle tactile bubble pop (400Hz -> 820Hz, 38ms)
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, t0);
        osc.frequency.exponentialRampToValueAtTime(840, t0 + 0.035);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.35, t0 + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.038);

        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.045);
        break;
      }

      case 'mic_start': {
        // Nada ganda instan naik (double chirp) frekuensi tinggi: 880Hz -> 1320Hz lalu 1320Hz -> 1760Hz
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';

        // Chirp 1
        osc.frequency.setValueAtTime(880, t0);
        osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.04);
        // Chirp 2
        osc.frequency.setValueAtTime(1320, t0 + 0.05);
        osc.frequency.exponentialRampToValueAtTime(1760, t0 + 0.09);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.45, t0 + 0.01);
        gain.gain.setValueAtTime(vol * 0.2, t0 + 0.045);
        gain.gain.linearRampToValueAtTime(vol * 0.5, t0 + 0.055);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.13);
        break;
      }

      case 'mic_end': {
        // Nada ganda turun lembut (descending chirp): 1600Hz -> 1000Hz lalu 1000Hz -> 650Hz
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';

        osc.frequency.setValueAtTime(1600, t0);
        osc.frequency.exponentialRampToValueAtTime(1050, t0 + 0.04);
        osc.frequency.setValueAtTime(1050, t0 + 0.05);
        osc.frequency.exponentialRampToValueAtTime(700, t0 + 0.09);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.4, t0 + 0.01);
        gain.gain.setValueAtTime(vol * 0.15, t0 + 0.045);
        gain.gain.linearRampToValueAtTime(vol * 0.35, t0 + 0.055);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);

        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.13);
        break;
      }

      case 'correct':
      case 'answer_correct': {
        // Nada akor mayor cerah bernuansa marimba kayu lembut (C5=523Hz, E5=659Hz, G5=784Hz, C6=1046Hz)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const tStart = t0 + idx * 0.032;
          const osc = ac.createOscillator();
          const filter = ac.createBiquadFilter();
          const gain = ac.createGain();

          osc.type = 'triangle'; // Nuansa kayu marimba
          osc.frequency.setValueAtTime(freq, tStart);

          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(freq * 3, tStart);
          filter.frequency.exponentialRampToValueAtTime(freq, tStart + 0.28);

          gain.gain.setValueAtTime(0.001, tStart);
          gain.gain.linearRampToValueAtTime(vol * 0.38, tStart + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.35);

          osc.connect(filter).connect(gain).connect(ac.destination);
          osc.start(tStart);
          osc.stop(tStart + 0.38);
        });
        break;
      }

      case 'wrong':
      case 'answer_wrong': {
        // Ketukan kayu tumpul bernada rendah netral (160Hz -> 100Hz dengan decay cepat)
        const osc = ac.createOscillator();
        const filter = ac.createBiquadFilter();
        const gain = ac.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(170, t0);
        osc.frequency.exponentialRampToValueAtTime(95, t0 + 0.18);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.42, t0 + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);

        osc.connect(filter).connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.25);
        break;
      }

      case 'coin_tick': {
        // High crisp metallic coin chime (~2400Hz + ~4800Hz harmonic)
        const osc1 = ac.createOscillator();
        const osc2 = ac.createOscillator();
        const gain = ac.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(2489, t0); // D#7
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(4978, t0);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.25, t0 + 0.004);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ac.destination);

        osc1.start(t0);
        osc2.start(t0);
        osc1.stop(t0 + 0.2);
        osc2.stop(t0 + 0.2);
        break;
      }

      case 'fire_surge': {
        // Warm flame surge / whoosh: filter sweep dengan deru hangat
        const osc = ac.createOscillator();
        const filter = ac.createBiquadFilter();
        const gain = ac.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, t0);
        osc.frequency.exponentialRampToValueAtTime(180, t0 + 0.25);
        osc.frequency.exponentialRampToValueAtTime(70, t0 + 0.65);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(220, t0);
        filter.frequency.exponentialRampToValueAtTime(800, t0 + 0.28);
        filter.frequency.exponentialRampToValueAtTime(150, t0 + 0.7);

        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.35, t0 + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.72);

        osc.connect(filter).connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.75);
        break;
      }

      case 'glockenspiel_chime': {
        // Ascending crystalline glockenspiel bells (G5, B5, D6, G6)
        const chimeNotes = [783.99, 987.77, 1174.66, 1567.98];
        chimeNotes.forEach((freq, idx) => {
          const tStart = t0 + idx * 0.085;
          const osc = ac.createOscillator();
          const gain = ac.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, tStart);

          gain.gain.setValueAtTime(0.001, tStart);
          gain.gain.linearRampToValueAtTime(vol * 0.32, tStart + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + 0.42);

          osc.connect(gain).connect(ac.destination);
          osc.start(tStart);
          osc.stop(tStart + 0.45);
        });
        break;
      }

      case 'fanfare_triumphant':
      case 'level_gate': {
        // Japanese traditional flourish: Skala Pentatonik Yo/In sen (D4, G4, A4, C5, D5, G5)
        const notes = [293.66, 392.0, 440.0, 523.25, 587.33, 783.99];
        notes.forEach((freq, idx) => {
          const tStart = t0 + idx * 0.09;
          const osc = ac.createOscillator();
          const gain = ac.createGain();

          osc.type = 'triangle'; // Resonansi dawai koto/shamisen
          osc.frequency.setValueAtTime(freq, tStart);

          const dur = idx === notes.length - 1 ? 0.9 : 0.45;
          gain.gain.setValueAtTime(0.001, tStart);
          gain.gain.linearRampToValueAtTime(vol * 0.4, tStart + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, tStart + dur);

          osc.connect(gain).connect(ac.destination);
          osc.start(tStart);
          osc.stop(tStart + dur + 0.05);
        });
        break;
      }

      default: {
        // Fallback default ping
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, t0);
        gain.gain.setValueAtTime(0.001, t0);
        gain.gain.linearRampToValueAtTime(vol * 0.25, t0 + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
        osc.connect(gain).connect(ac.destination);
        osc.start(t0);
        osc.stop(t0 + 0.13);
        break;
      }
    }
  }
}

export const soundFX = new SoundFXManager();
export { SoundFXManager };

