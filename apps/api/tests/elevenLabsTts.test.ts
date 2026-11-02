import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsTts, voiceSettings } from "../src/shared/infrastructure/elevenLabsTts";

/** PCM 16-bit mono 24 kHz: nada 220 Hz selama `seconds` detik, seperti keluaran output_format=pcm_24000. */
function tone(seconds: number): ArrayBuffer {
  const n = Math.round(24000 * seconds);
  const buf = Buffer.alloc(n * 2);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 220 * i) / 24000) * 8000), i * 2);
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
}

function mockFetch(response: () => Response) {
  const fn = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) => response());
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("ElevenLabs TTS", () => {
  it("meminta PCM 24 kHz dengan voice, model, dan pengaturan emosi; hasilnya WAV", async () => {
    const fetch = mockFetch(() => new Response(tone(1.5), { status: 200 }));
    const tts = new ElevenLabsTts("kunci-rahasia", "voice123", "eleven_flash_v2_5");
    const wav = await tts.speak("こんにちは！ Ayo belajar bareng.", "semangat", 1);

    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice123?output_format=pcm_24000");
    expect((init!.headers as Record<string, string>)["xi-api-key"]).toBe("kunci-rahasia");
    const body = JSON.parse(String(init!.body));
    expect(body.model_id).toBe("eleven_flash_v2_5");
    expect(body.text).toContain("こんにちは");
    expect(body.text).not.toMatch(/<pelan>|<cepat>/);
    expect(body.voice_settings).toEqual(voiceSettings("semangat"));

    expect(wav.toString("latin1", 0, 4)).toBe("RIFF");
    expect(wav.toString("latin1", 8, 12)).toBe("WAVE");
    // Nada emosi dinaikkan lewat sample rate WAV (semangat: 1,28/1,2 × 24 kHz), sama seperti jalur Gemini
    const rate = wav.readUInt32LE(24);
    expect(rate).toBe(Math.round(24000 * (1.28 / 1.2)));
    // Durasi tetap masuk akal setelah tempo/nada diolah
    const seconds = (wav.length - 44) / 2 / rate;
    expect(seconds).toBeGreaterThan(1);
    expect(seconds).toBeLessThan(2.2);
  });

  it("tanda <pelan>/<cepat> tidak ikut dibacakan", async () => {
    const fetch = mockFetch(() => new Response(tone(1), { status: 200 }));
    await new ElevenLabsTts("k", "v", "m").speak("Coba ucapkan <pelan>ありがとう</pelan> ya!", "biasa");
    expect(JSON.parse(String(fetch.mock.calls[0][1]!.body)).text).toBe("Coba ucapkan ありがとう ya!");
  });

  it("jawaban yang sama diambil dari cache, tidak memakai kredit lagi", async () => {
    const fetch = mockFetch(() => new Response(tone(1), { status: 200 }));
    const tts = new ElevenLabsTts("k", "v", "m");
    await tts.speak("おはよう!", "senang");
    await tts.speak("おはよう!", "senang");
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("kredit habis: gagal lalu dilewati sementara (cadangan langsung dipakai)", async () => {
    const fetch = mockFetch(() => new Response(JSON.stringify({ detail: { status: "quota_exceeded", message: "This request exceeds your quota" } }), { status: 401 }));
    const tts = new ElevenLabsTts("k", "v", "m");
    await expect(tts.speak("Halo!", "biasa")).rejects.toThrow(/ElevenLabs 401/);
    expect(tts.available).toBe(false);
    await expect(tts.speak("Halo lagi!", "biasa")).rejects.toThrow(/dibatasi/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("emosi ekspresif lebih tidak stabil (lebih hidup) daripada emosi tenang", () => {
    expect(voiceSettings("semangat").stability).toBeLessThan(voiceSettings("sedih").stability);
    expect(voiceSettings("semangat").style).toBeGreaterThan(voiceSettings("biasa").style);
    expect(voiceSettings("tidak-dikenal")).toEqual(voiceSettings("biasa"));
  });
});
