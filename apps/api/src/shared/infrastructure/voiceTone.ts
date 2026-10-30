/**
 * Nada suara Miu-chan per emosi. Model TTS tidak menerima instruksi gaya (ikut membacakannya),
 * jadi ekspresi dibentuk dari nada, tempo, dan keras-lembutnya suara.
 * `pitch`/`tempo` adalah pengali untuk Gemini; `edge` adalah prosody SSML untuk TTS cadangan.
 */
export interface VoiceTone {
  pitch: number;
  tempo: number;
  gain: number;
  edge: { pitch: string; rate: string; volume: string };
}

// Tempo di sekitar 1: TTS sudah cukup cepat, dan suara cadangan masih dipercepat browser 1,08×.
// "biasa" dinaikkan sedikit (+4%) agar percakapan terdengar alami, bukan seperti sedang membaca.
const TONES: Record<string, VoiceTone> = {
  biasa:    { pitch: 1.2,  tempo: 0.97, gain: 1,    edge: { pitch: "+24%", rate: "+4%",  volume: "+0%" } },
  senang:   { pitch: 1.25, tempo: 1.02, gain: 1.05, edge: { pitch: "+30%", rate: "+8%",  volume: "+5%" } },
  semangat: { pitch: 1.28, tempo: 1.06, gain: 1.12, edge: { pitch: "+34%", rate: "+12%", volume: "+12%" } },
  sedih:    { pitch: 1.12, tempo: 0.82, gain: 0.8,  edge: { pitch: "+12%", rate: "-18%", volume: "-20%" } },
  nangis:   { pitch: 1.16, tempo: 0.8,  gain: 0.75, edge: { pitch: "+18%", rate: "-22%", volume: "-25%" } },
  kesal:    { pitch: 1.16, tempo: 0.98, gain: 1.05, edge: { pitch: "+16%", rate: "-2%",  volume: "+5%" } },
  marah:    { pitch: 1.14, tempo: 1.02, gain: 1.2,  edge: { pitch: "+14%", rate: "+4%",  volume: "+20%" } },
  rese:     { pitch: 1.24, tempo: 0.96, gain: 1,    edge: { pitch: "+28%", rate: "-4%",  volume: "+0%" } },
  kaget:    { pitch: 1.3,  tempo: 1.02, gain: 1.12, edge: { pitch: "+38%", rate: "+4%",  volume: "+12%" } },
  bingung:  { pitch: 1.18, tempo: 0.88, gain: 0.95, edge: { pitch: "+22%", rate: "-10%", volume: "-5%" } },
  malu:     { pitch: 1.24, tempo: 0.86, gain: 0.82, edge: { pitch: "+28%", rate: "-14%", volume: "-18%" } },
};

export function voiceTone(emotion?: string): VoiceTone {
  return TONES[emotion ?? ""] ?? TONES.biasa;
}

/** Mengeraskan/melembutkan PCM 16-bit, dipotong di batas agar tidak pecah. */
export function applyGain(pcm: Buffer, gain: number): Buffer {
  if (gain === 1) return pcm;
  const out = Buffer.alloc(pcm.length);
  for (let i = 0; i + 1 < pcm.length; i += 2) {
    const v = Math.round(pcm.readInt16LE(i) * gain);
    out.writeInt16LE(Math.max(-32768, Math.min(32767, v)), i);
  }
  return out;
}
