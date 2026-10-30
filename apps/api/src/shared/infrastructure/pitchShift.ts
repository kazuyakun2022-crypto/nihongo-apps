/**
 * Menaikkan nada suara (PCM 16-bit mono) tanpa library eksternal.
 * Caranya: audio dipanjangkan dengan WSOLA (tempo melambat, nada tetap), lalu sample rate di header WAV
 * dinaikkan sehingga browser memutarnya lebih cepat. Hasilnya nada naik, tempo hanya ikut naik sesuai `tempo`.
 * Formant ikut naik, dan justru itu yang membuat suaranya terdengar lebih kecil dan imut.
 */
export function shiftPitch(
  pcm: Buffer,
  sampleRate: number,
  pitch: number,
  tempo = 1,
): { pcm: Buffer; sampleRate: number } {
  if (pitch === 1 && tempo === 1) return { pcm, sampleRate };
  return shiftPitchByPace(pcm, sampleRate, pitch, [{ seconds: 1, tempo }]);
}

/**
 * Seperti shiftPitch, tetapi tempo berbeda per bagian ucapan. `parts` berurutan sesuai teks,
 * dengan perkiraan lama ucapan masing-masing; batas antarbagian digeser ke jeda terdekat.
 */
export function shiftPitchByPace(
  pcm: Buffer,
  sampleRate: number,
  pitch: number,
  parts: { seconds: number; tempo: number }[],
): { pcm: Buffer; sampleRate: number } {
  const input = new Float32Array(pcm.length >> 1);
  for (let i = 0; i < input.length; i++) input[i] = pcm.readInt16LE(i * 2) / 32768;

  const cuts = parts.length > 1 ? cutPoints(input, sampleRate, parts.map((p) => p.seconds)) : [];
  const bounds = [0, ...cuts, input.length];
  const pieces = parts.map((p, i) => timeStretch(input.subarray(bounds[i], bounds[i + 1]), pitch / p.tempo, sampleRate));
  const total = pieces.reduce((n, p) => n + p.length, 0);

  const out = Buffer.alloc(total * 2);
  let o = 0;
  for (const piece of pieces) {
    for (let i = 0; i < piece.length; i++, o++) {
      const v = Math.max(-1, Math.min(1, piece[i]));
      out.writeInt16LE(Math.round(v * 32767), o * 2);
    }
  }
  return { pcm: out, sampleRate: Math.round(sampleRate * pitch) };
}

function rms(x: Float32Array, start: number, len: number): number {
  let s = 0;
  for (let i = start; i < start + len; i++) s += x[i] * x[i];
  return Math.sqrt(s / len);
}

/**
 * Posisi sampel pemisah antarbagian. Ucapan (tanpa hening awal/akhir) dibagi sebanding perkiraan
 * lamanya, lalu tiap batas digeser ke titik paling hening dalam ±350 ms supaya tidak memotong suku kata.
 */
export function cutPoints(x: Float32Array, sampleRate: number, seconds: number[]): number[] {
  const win = Math.max(1, Math.round(sampleRate * 0.02));
  const step = Math.max(1, Math.round(sampleRate * 0.005));
  const reach = Math.round(sampleRate * 0.35);
  const minGap = Math.round(sampleRate * 0.05);

  let peak = 0;
  for (let p = 0; p + win <= x.length; p += win) peak = Math.max(peak, rms(x, p, win));
  const threshold = Math.max(0.003, peak * 0.05);
  let start = 0;
  while (start + win < x.length && rms(x, start, win) < threshold) start += step;
  let end = x.length;
  while (end - win > start && rms(x, end - win, win) < threshold) end -= step;

  const total = seconds.reduce((a, b) => a + b, 0) || 1;
  const cuts: number[] = [];
  let acc = 0;
  let lo = 0;
  for (let i = 0; i < seconds.length - 1; i++) {
    acc += seconds[i];
    const target = Math.round(start + ((end - start) * acc) / total);
    const from = Math.max(lo + minGap, target - reach);
    const to = Math.min(x.length - minGap, target + reach) - win;
    let best = Math.min(Math.max(target, lo + minGap), x.length - minGap);
    let bestScore = Infinity;
    for (let p = from; p <= to; p += step) {
      // Jeda yang lebih dekat ke perkiraan sedikit diutamakan
      const score = rms(x, p, win) * (1 + Math.abs(p + win / 2 - target) / reach);
      if (score < bestScore) {
        bestScore = score;
        best = p + (win >> 1);
      }
    }
    best = Math.min(Math.max(best, lo + minGap), x.length);
    cuts.push(best);
    lo = best;
  }
  return cuts;
}

/** WSOLA: panjang audio dikali `factor` tanpa mengubah nada. */
export function timeStretch(input: Float32Array, factor: number, sampleRate: number): Float32Array {
  const frame = 2 * Math.round(sampleRate * 0.02); // 40 ms
  const hop = frame / 2;
  const tolerance = Math.round(sampleRate * 0.01); // geser maksimal 10 ms untuk mencari sambungan paling mulus
  const hopIn = hop / factor;
  const outLength = Math.round(input.length * factor);
  const out = new Float32Array(outLength + frame);

  // Hann periodik: dengan overlap 50% jumlah jendelanya selalu 1, jadi tidak perlu normalisasi
  const window = new Float32Array(frame);
  for (let i = 0; i < frame; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame);

  let prev = 0;
  for (let k = 0; k * hop < outLength; k++) {
    const nominal = Math.round(k * hopIn);
    if (nominal >= input.length) break;

    let best = nominal;
    if (k > 0) {
      // Cari potongan yang paling mirip dengan lanjutan alami potongan sebelumnya
      const natural = prev + hop;
      let bestScore = -Infinity;
      for (let d = -tolerance; d <= tolerance; d++) {
        const cand = nominal + d;
        if (cand < 0 || cand + hop > input.length) continue;
        let score = 0;
        for (let i = 0; i < hop && natural + i < input.length; i += 2) score += input[natural + i] * input[cand + i];
        if (score > bestScore) {
          bestScore = score;
          best = cand;
        }
      }
    }

    const outPos = k * hop;
    for (let i = 0; i < frame && best + i < input.length; i++) out[outPos + i] += input[best + i] * window[i];
    prev = best;
  }
  return out.subarray(0, outLength);
}
