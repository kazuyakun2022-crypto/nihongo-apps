/**
 * Menyamakan keras suara potongan dari mesin TTS berbeda sebelum disambung (VOICEVOX ±−19 dBFS, Gemini ±−11 dBFS:
 * tanpa ini bagian Jepang terdengar jauh lebih pelan dari bagian Indonesia).
 */

/** Target keras ucapan: RMS bagian bersuara ≈ −13 dBFS, setara keluaran Gemini/ElevenLabs. */
export const TARGET_SPEECH_RMS = 7300;
/** Di atas ini sampel dilunakkan (soft knee) supaya tidak pecah. */
const KNEE = 0.82 * 32767;

/**
 * Keras ucapan (RMS 16-bit) dari bingkai 20 ms yang bersuara: 60% bingkai terkeras, supaya jeda dan napas tidak
 * menurunkan nilainya.
 */
export function speechRms(pcm: Buffer, sampleRate: number): number {
  const n = pcm.length >> 1;
  const frame = Math.max(1, Math.round(sampleRate * 0.02));
  const energies: number[] = [];
  for (let i = 0; i + frame <= n; i += frame) {
    let s = 0;
    for (let j = i; j < i + frame; j++) {
      const v = pcm.readInt16LE(j * 2);
      s += v * v;
    }
    energies.push(s / frame);
  }
  if (!energies.length) return 0;
  energies.sort((a, b) => b - a);
  const loud = energies.slice(0, Math.max(1, Math.round(energies.length * 0.6)));
  return Math.sqrt(loud.reduce((a, e) => a + e, 0) / loud.length);
}

/** Atur keras potongan ke `targetRms`; puncak di atas knee dilunakkan dan tidak pernah melewati batas 16-bit. */
export function normalizeLoudness(pcm: Buffer, sampleRate: number, targetRms = TARGET_SPEECH_RMS): Buffer {
  const rms = speechRms(pcm, sampleRate);
  if (rms < 50) return pcm; // hening / terlalu pendek
  // Batas penguatan supaya desis pada potongan yang hampir hening tidak ikut dikeraskan berlebihan
  const gain = Math.min(6, targetRms / rms);
  const out = Buffer.alloc(pcm.length);
  const room = 32767 - KNEE;
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const v = pcm.readInt16LE(i) * gain;
    const a = Math.abs(v);
    // Di atas knee: mendekati batas secara halus (tanh), bukan dipotong tajam
    const shaped = a <= KNEE ? a : KNEE + room * Math.tanh((a - KNEE) / room);
    out.writeInt16LE(Math.round(Math.sign(v) * Math.min(32767, shaped)), i);
  }
  return out;
}
