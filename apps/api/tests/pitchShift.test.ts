import { describe, expect, it } from "vitest";
import { shiftPitch } from "../src/shared/infrastructure/pitchShift";

function sine(freq: number, seconds: number, rate: number): Buffer {
  const buf = Buffer.alloc(Math.round(seconds * rate) * 2);
  for (let i = 0; i < buf.length / 2; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * freq * i) / rate) * 16000), i * 2);
  return buf;
}

/** Frekuensi dominan dari jumlah zero crossing, dihitung pada sample rate pemutaran. */
function frequency(pcm: Buffer, rate: number): number {
  let crossings = 0;
  for (let i = 1; i < pcm.length / 2; i++) {
    if ((pcm.readInt16LE((i - 1) * 2) < 0) !== (pcm.readInt16LE(i * 2) < 0)) crossings++;
  }
  return crossings / 2 / (pcm.length / 2 / rate);
}

describe("shiftPitch", () => {
  it("menaikkan nada sesuai pitch dan durasi sesuai tempo", () => {
    const input = sine(220, 2, 24000);
    const { pcm, sampleRate } = shiftPitch(input, 24000, 1.2, 1.05);
    expect(sampleRate).toBe(28800);
    expect(frequency(pcm, sampleRate)).toBeCloseTo(264, -1);
    const duration = pcm.length / 2 / sampleRate;
    expect(duration).toBeCloseTo(2 / 1.05, 1);
  });

  it("tidak mengubah apa pun kalau pitch dan tempo 1", () => {
    const input = sine(220, 0.5, 24000);
    expect(shiftPitch(input, 24000, 1, 1)).toEqual({ pcm: input, sampleRate: 24000 });
  });
});
