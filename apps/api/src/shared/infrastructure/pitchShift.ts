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

  const factors = parts.map((p) => pitch / p.tempo);
  let stretched: Float32Array;
  if (factors.every((f) => f === factors[0])) {
    stretched = timeStretch(input, factors[0], sampleRate);
  } else {
    // Satu kali WSOLA dengan tempo yang bergeser halus di sekitar batas bagian, bukan potongan
    // yang di-stretch terpisah: sambungan potongan terdengar seperti suara patah-patah.
    const cuts = cutPoints(input, sampleRate, parts.map((p) => p.seconds));
    const ramp = Math.round(sampleRate * 0.08);
    stretched = timeStretch(input, (pos) => {
      let i = 0;
      while (i < cuts.length && pos >= cuts[i] + ramp) i++;
      if (i < cuts.length && pos > cuts[i] - ramp) {
        const t = (pos - (cuts[i] - ramp)) / (2 * ramp);
        return factors[i] + (factors[i + 1] - factors[i]) * t;
      }
      return factors[i];
    }, sampleRate);
  }

  const out = Buffer.alloc(stretched.length * 2);
  for (let i = 0; i < stretched.length; i++) {
    const v = Math.max(-1, Math.min(1, stretched[i]));
    out.writeInt16LE(Math.round(v * 32767), i * 2);
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

/** WSOLA: panjang audio dikali `factor` tanpa mengubah nada; `factor` boleh berubah menurut posisi sampel input. */
export function timeStretch(
  input: Float32Array,
  factor: number | ((inputPos: number) => number),
  sampleRate: number,
): Float32Array {
  const factorAt = typeof factor === "number" ? () => factor : factor;
  const frame = 2 * Math.round(sampleRate * 0.02); // 40 ms
  const hop = frame / 2;
  const tolerance = Math.round(sampleRate * 0.01); // geser maksimal 10 ms untuk mencari sambungan paling mulus

  // Posisi awal tiap potongan di input: jaraknya hop / factor setempat
  const starts: number[] = [];
  for (let pos = 0; pos < input.length; pos += hop / factorAt(pos)) starts.push(Math.round(pos));
  const outLength = typeof factor === "number" ? Math.round(input.length * factor) : starts.length * hop;
  const out = new Float32Array(Math.max(outLength, starts.length * hop) + frame);

  // Hann periodik: dengan overlap 50% jumlah jendelanya selalu 1, jadi tidak perlu normalisasi
  const window = new Float32Array(frame);
  for (let i = 0; i < frame; i++) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / frame);

  let prev = 0;
  for (let k = 0; k < starts.length && k * hop < outLength; k++) {
    const nominal = starts[k];

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
