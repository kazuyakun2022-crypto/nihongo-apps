import { afterEach, describe, expect, it, vi } from "vitest";
import { GroqAskProvider } from "../src/modules/ask/infrastructure/GroqAskProvider";

/** Groq dipalsukan per model: angka = status gagal, string = isi jawaban. */
const stubGroq = (byModel: Record<string, number | string>) => {
  const called: string[] = [];
  vi.stubGlobal("fetch", async (_url: string, init: { body: string }) => {
    const { model } = JSON.parse(init.body) as { model: string };
    called.push(model);
    const r = byModel[model];
    if (typeof r === "number") return new Response("rate limit", { status: r });
    return new Response(JSON.stringify({ choices: [{ message: { content: r } }] }));
  });
  return called;
};

describe("GroqAskProvider rantai model", () => {
  afterEach(() => vi.unstubAllGlobals());
  vi.spyOn(console, "warn").mockImplementation(() => undefined);

  it("mode teks mendahulukan gpt-oss-120b", async () => {
    const called = stubGroq({ "openai/gpt-oss-120b": "jawaban gpt", "qwen/qwen3.8-27b": "jawaban qwen" });
    expect(await new GroqAskProvider("k").answer("halo", [], "text")).toBe("jawaban gpt");
    expect(called).toEqual(["openai/gpt-oss-120b"]);
  });

  it("kena batas kuota → model berikutnya", async () => {
    const called = stubGroq({ "openai/gpt-oss-120b": 429, "qwen/qwen3.8-27b": "jawaban qwen" });
    expect(await new GroqAskProvider("k").answer("halo", [], "text")).toBe("jawaban qwen");
    expect(called).toEqual(["openai/gpt-oss-120b", "qwen/qwen3.8-27b"]);
  });

  it("jawaban kosong dianggap gagal", async () => {
    stubGroq({ "openai/gpt-oss-120b": "", "qwen/qwen3.8-27b": "jawaban qwen" });
    expect(await new GroqAskProvider("k").answer("halo", [], "text")).toBe("jawaban qwen");
  });

  it("semua model Groq penuh → penyedia cadangan", async () => {
    stubGroq({ "openai/gpt-oss-120b": 429, "qwen/qwen3.8-27b": 429 });
    const backup = { answer: async () => "jawaban gemini" };
    expect(await new GroqAskProvider("k", backup).answer("halo", [], "text")).toBe("jawaban gemini");
  });
});
