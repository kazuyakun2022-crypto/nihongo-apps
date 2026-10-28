import "dotenv/config";
const words = `0|明後日|あさって|day after tomorrow
1|開く|あく|to open (intransitive)
2|足; 脚|あし|foot, leg
3|お巡りさん|おまわりさん|policeman (friendly term)
4|結構|けっこう|splendid, enough
5|気分|きぶん|feeling, mood
6|手紙|てがみ|letter
7|大丈夫|だいじょうぶ|all right, OK
8|勉強|べんきょう|study
9|丈夫|じょうぶ|strong, durable
10|切る|きる|to cut
11|わかる|わかる|to understand
12|曖昧|あいまい|vague, ambiguous
13|案の定|あんのじょう|just as one thought`;
const sys = `Kamu penerjemah kamus Jepang–Indonesia. Untuk setiap kata, tulis arti bahasa Indonesia singkat (maks 6 kata, beberapa arti dipisah " / "), sesuai makna kata Jepangnya. Balas HANYA JSON {"items":[{"i":n,"id":"..."}]}`;
for (const model of ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-3.1-flash-lite"]) {
  const t = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: "user", parts: [{ text: words }] }], generationConfig: { temperature: 0.2, responseMimeType: "application/json" } }) });
  const d = await res.json();
  console.log("==", model, Date.now() - t, "ms", res.status);
  try { console.log(JSON.parse(d.candidates[0].content.parts.map(p=>p.text).join("")).items.map(x => `${x.i}:${x.id}`).join(" | ")); } catch { console.log(JSON.stringify(d).slice(0, 300)); }
}
