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

  const input = new Float32Array(pcm.length >> 1);
  for (let i = 0; i < input.length; i++) input[i] = pcm.readInt16LE(i * 2) / 32768;

  const stretched = timeStretch(input, pitch / tempo, sampleRate);

  const out = Buffer.alloc(stretched.length * 2);
  for (let i = 0; i < stretched.length; i++) {
    const v = Math.max(-1, Math.min(1, stretched[i]));
    out.writeInt16LE(Math.round(v * 32767), i * 2);
  }
  return { pcm: out, sampleRate: Math.round(sampleRate * pitch) };
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
