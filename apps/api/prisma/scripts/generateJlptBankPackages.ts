import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PLAN, type PlanItem } from "../../src/modules/exam/domain/jlptPlan";
import { jlptPackageSchema, type JlptPackage } from "../../src/modules/exam/domain/jlptImport";
import type { JlptCode } from "../../src/modules/exam/domain/JlptSim";

const BANK_DIR = join(process.cwd(), "prisma", "data", "jlpt-sim", "bank");

// Helper to pad variant numbers
const pad = (n: number) => String(n).padStart(2, "0");

interface QuestionSpec {
  questionNumber: number;
  questionType: string;
  section: "membaca" | "kosakata" | "tata_bahasa" | "dokkai" | "mendengar";
  sourceKey: string;
  status: "published";
  promptText: string;
  passage: string | null;
  audioUrl: null;
  audioScript: string | null;
  imageUrl: null;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  difficulty: number;
}

// Map questionType to correct section
function getSectionForType(type: string): "membaca" | "kosakata" | "tata_bahasa" | "dokkai" | "mendengar" {
  if (type === "KANJI_READING") return "membaca";
  if (["ORTHOGRAPHY", "WORD_FORMATION", "CONTEXTUAL_EXPRESSION", "PARAPHRASE", "USAGE"].includes(type)) return "kosakata";
  if (["GRAMMAR_FORM", "SENTENCE_COMPOSITION", "TEXT_GRAMMAR"].includes(type)) return "tata_bahasa";
  if (["SHORT_PASSAGE", "MID_PASSAGE", "LONG_PASSAGE", "INTEGRATED_READING", "INFORMATION_RETRIEVAL"].includes(type)) return "dokkai";
  return "mendengar";
}

// Generate realistic question data for each Daimon type
function createQuestion(
  level: JlptCode,
  variantIndex: number,
  sectionType: string,
  questionType: string,
  localIndex: number,
  globalNumber: number
): QuestionSpec {
  const slug = `jlpt-${level.toLowerCase()}-mock-${pad(variantIndex)}`;
  const sourceKey = `${slug}:${sectionType.toLowerCase()}:${globalNumber}`;
  const section = getSectionForType(questionType);
  const diff = level === "N5" ? 1 : level === "N4" ? 2 : level === "N3" ? 3 : level === "N2" ? 4 : 5;

  let promptText = "";
  let passage: string | null = null;
  let audioScript: string | null = null;
  let options: string[] = ["A", "B", "C", "D"];
  let correctOptionIndex = 1 + ((localIndex * 3 + variantIndex) % 4);
  let explanation = "";

  // 1. KANJI_READING
  if (questionType === "KANJI_READING") {
    const pool = KANJI_READING_POOLS[level] || KANJI_READING_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 7) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 2. ORTHOGRAPHY
  else if (questionType === "ORTHOGRAPHY") {
    const pool = ORTHOGRAPHY_POOLS[level] || ORTHOGRAPHY_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 5) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 3. WORD_FORMATION
  else if (questionType === "WORD_FORMATION") {
    const pool = WORD_FORMATION_POOLS[level] || WORD_FORMATION_POOLS["N2"];
    const item = pool[(localIndex + (variantIndex - 1) * 5) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 4. CONTEXTUAL_EXPRESSION
  else if (questionType === "CONTEXTUAL_EXPRESSION") {
    const pool = CONTEXTUAL_POOLS[level] || CONTEXTUAL_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 6) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 5. PARAPHRASE
  else if (questionType === "PARAPHRASE") {
    const pool = PARAPHRASE_POOLS[level] || PARAPHRASE_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 3) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 6. USAGE
  else if (questionType === "USAGE") {
    const pool = USAGE_POOLS[level] || USAGE_POOLS["N4"];
    const item = pool[(localIndex + (variantIndex - 1) * 5) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 7. GRAMMAR_FORM
  else if (questionType === "GRAMMAR_FORM") {
    const pool = GRAMMAR_POOLS[level] || GRAMMAR_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 9) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 8. SENTENCE_COMPOSITION
  else if (questionType === "SENTENCE_COMPOSITION") {
    const pool = SENTENCE_COMP_POOLS[level] || SENTENCE_COMP_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 4) % pool.length];
    promptText = item.prompt;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 9. TEXT_GRAMMAR
  else if (questionType === "TEXT_GRAMMAR") {
    const pool = TEXT_GRAMMAR_POOLS[level] || TEXT_GRAMMAR_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 3) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 10. SHORT_PASSAGE
  else if (questionType === "SHORT_PASSAGE") {
    const pool = SHORT_PASSAGE_POOLS[level] || SHORT_PASSAGE_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 2) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 11. MID_PASSAGE
  else if (questionType === "MID_PASSAGE") {
    const pool = MID_PASSAGE_POOLS[level] || MID_PASSAGE_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 2) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 12. LONG_PASSAGE
  else if (questionType === "LONG_PASSAGE") {
    const pool = LONG_PASSAGE_POOLS[level] || LONG_PASSAGE_POOLS["N3"];
    const item = pool[(localIndex + (variantIndex - 1) * 3) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 13. INTEGRATED_READING
  else if (questionType === "INTEGRATED_READING") {
    const pool = INTEGRATED_READING_POOLS[level] || INTEGRATED_READING_POOLS["N2"];
    const item = pool[(localIndex + (variantIndex - 1) * 2) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 14. INFORMATION_RETRIEVAL
  else if (questionType === "INFORMATION_RETRIEVAL") {
    const pool = INFO_RETRIEVAL_POOLS[level] || INFO_RETRIEVAL_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 2) % pool.length];
    promptText = item.prompt;
    passage = item.passage;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 15. TASK_BASED
  else if (questionType === "TASK_BASED") {
    const pool = TASK_BASED_POOLS[level] || TASK_BASED_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 5) % pool.length];
    promptText = item.prompt;
    passage = item.script;
    audioScript = item.script;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 16. POINT_COMPREHENSION
  else if (questionType === "POINT_COMPREHENSION") {
    const pool = POINT_POOLS[level] || POINT_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 5) % pool.length];
    promptText = item.prompt;
    passage = item.script;
    audioScript = item.script;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 17. SUMMARY_COMPREHENSION
  else if (questionType === "SUMMARY_COMPREHENSION") {
    const pool = SUMMARY_POOLS[level] || SUMMARY_POOLS["N3"];
    const item = pool[(localIndex + (variantIndex - 1) * 3) % pool.length];
    promptText = item.prompt;
    passage = item.script;
    audioScript = item.script;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 18. QUICK_RESPONSE
  else if (questionType === "QUICK_RESPONSE") {
    const pool = QUICK_RESPONSE_POOLS[level] || QUICK_RESPONSE_POOLS["N5"];
    const item = pool[(localIndex + (variantIndex - 1) * 6) % pool.length];
    promptText = item.prompt;
    passage = item.script;
    audioScript = item.script;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }
  // 19. INTEGRATED_LISTENING
  else if (questionType === "INTEGRATED_LISTENING") {
    const pool = INTEGRATED_LISTENING_POOLS[level] || INTEGRATED_LISTENING_POOLS["N2"];
    const item = pool[(localIndex + (variantIndex - 1) * 2) % pool.length];
    promptText = item.prompt;
    passage = item.script;
    audioScript = item.script;
    options = item.options;
    correctOptionIndex = item.ans;
    explanation = item.exp;
  }

  return {
    questionNumber: globalNumber,
    questionType,
    section,
    sourceKey,
    status: "published",
    promptText,
    passage,
    audioUrl: null,
    audioScript,
    imageUrl: null,
    options,
    correctOptionIndex,
    explanation,
    difficulty: diff,
  };
}

// Rich Question Pools per Level and Daimon Type
interface PoolItem {
  prompt: string;
  options: string[];
  ans: number;
  exp: string;
}
interface PassagePoolItem extends PoolItem {
  passage: string;
}
interface AudioPoolItem extends PoolItem {
  script: string;
}

// ── KANJI READING POOLS ──
const KANJI_READING_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "<u>山</u>に のぼります。", options: ["やま", "うみ", "かわ", "もり"], ans: 1, exp: "Kanji「山」dibaca「やま」(gunung)." },
    { prompt: "<u>川</u>の みずは きれいです。", options: ["かわ", "いけ", "うみ", "やま"], ans: 1, exp: "Kanji「川」dibaca「かわ」(sungai)." },
    { prompt: "きのう <u>友だち</u>に あいました。", options: ["ともだち", "こども", "ひと", "かぞく"], ans: 1, exp: "Kanji「友だち」dibaca「ともだち」(teman)." },
    { prompt: "<u>毎朝</u> しんぶんを よみます。", options: ["まいあさ", "まいばん", "まいにち", "まいとし"], ans: 1, exp: "Kanji「毎朝」dibaca「まいあさ」(setiap pagi)." },
    { prompt: "この <u>魚</u>は おいしいです。", options: ["さかな", "にく", "やさい", "くだもの"], ans: 1, exp: "Kanji「魚」dibaca「さかな」(ikan)." },
    { prompt: "<u>父</u>は かいしゃいんです。", options: ["ちち", "はは", "あに", "あね"], ans: 1, exp: "Kanji「父」dibaca「ちち」(ayah sendiri)." },
    { prompt: "<u>雨</u>が ふって います。", options: ["あめ", "ゆき", "かぜ", "くも"], ans: 1, exp: "Kanji「雨」dibaca「あめ」(hujan)." },
    { prompt: "<u>白い</u> ねこが います。", options: ["しろい", "くろい", "あかい", "あおい"], ans: 1, exp: "Kanji「白い」dibaca「しろい」(putih)." },
    { prompt: "つくえの <u>上</u>に ほんが あります。", options: ["うえ", "した", "なか", "まえ"], ans: 1, exp: "Kanji「上」dibaca「うえ」(atas)." },
    { prompt: "えきの <u>前</u>で まちます。", options: ["まえ", "うしろ", "となり", "ちかく"], ans: 1, exp: "Kanji「前」dibaca「まえ」(depan)." },
    { prompt: "<u>北</u>の まちは さむいです。", options: ["きた", "みなみ", "ひがし", "にし"], ans: 1, exp: "Kanji「北」dibaca「きた」(utara)." },
    { prompt: "<u>南</u>へ りょこうに いきます。", options: ["みなみ", "きた", "ひがし", "にし"], ans: 1, exp: "Kanji「南」dibaca「みなみ」(selatan)." },
    { prompt: "<u>右手</u>を あげてください。", options: ["みぎて", "ひだりて", "あたま", "あし"], ans: 1, exp: "Kanji「右手」dibaca「みぎて」(tangan kanan)." },
    { prompt: "<u>左</u>へ まがってください。", options: ["ひだり", "みぎ", "まえ", "うしろ"], ans: 1, exp: "Kanji「左」dibaca「ひだり」(kiri)." },
    { prompt: "<u>花</u>が さきました。", options: ["はな", "き", "くさ", "はっぱ"], ans: 1, exp: "Kanji「花」dibaca「はな」(bunga)." },
    { prompt: "<u>耳</u>が いたいです。", options: ["みみ", "め", "はな", "くち"], ans: 1, exp: "Kanji「耳」dibaca「みみ」(telinga)." },
    { prompt: "<u>目</u>を とじてください。", options: ["め", "みみ", "て", "あし"], ans: 1, exp: "Kanji「目」dibaca「め」(mata)." },
    { prompt: "<u>手</u>を あらいました。", options: ["て", "あし", "かお", "からだ"], ans: 1, exp: "Kanji「手」dibaca「て」(tangan)." },
    { prompt: "<u>足</u>が はやいです。", options: ["あし", "て", "くび", "かた"], ans: 1, exp: "Kanji「足」dibaca「あし」(kaki)." },
    { prompt: "この <u>店</u>は ゆうめいです。", options: ["みせ", "いえ", "へや", "まち"], ans: 1, exp: "Kanji「店」dibaca「みせ」(toko)." },
    { prompt: "<u>門</u>の まえに 車が あります。", options: ["もん", "いえ", "まど", "とびら"], ans: 1, exp: "Kanji「門」dibaca「もん」(gerbang)." },
    { prompt: "<u>本</u>を かしてください。", options: ["ほん", "かみ", "ノート", "ぺん"], ans: 1, exp: "Kanji「本」dibaca「ほん」(buku)." },
  ],
  N4: [
    { prompt: "この仕事は<u>経験</u>が必要です。", options: ["けいけん", "けんけん", "けいかん", "けけん"], ans: 1, exp: "Kanji「経験」dibaca「けいけん」(pengalaman)." },
    { prompt: "来週の<u>予定</u>を教えてください。", options: ["よてい", "よて", "ゆてい", "よだい"], ans: 1, exp: "Kanji「予定」dibaca「よてい」(rencana/jadwal)." },
    { prompt: "部屋の<u>案内</u>をします。", options: ["あんない", "あない", "あんなえ", "あんねい"], ans: 1, exp: "Kanji「案内」dibaca「あんない」(pemandu/informasi)." },
    { prompt: "窓を<u>閉めて</u>ください。", options: ["しめて", "あけて", "とめて", "きめて"], ans: 1, exp: "Kanji「閉めて」dibaca「しめて」(menutup)." },
    { prompt: "明日<u>出発</u>します。", options: ["しゅっぱつ", "しゅぱつ", "しゅつはつ", "しっぱつ"], ans: 1, exp: "Kanji「出発」dibaca「しゅっぱつ」(keberangkatan)." },
    { prompt: "<u>危険</u>ですから入らないでください。", options: ["きけん", "きげん", "きかん", "きこん"], ans: 1, exp: "Kanji「危険」dibaca「きけん」(bahaya)." },
    { prompt: "<u>急に</u>雨が降り出しました。", options: ["きゅうに", "きゅに", "きょうに", "きに"], ans: 1, exp: "Kanji「急に」dibaca「きゅうに」(tiba-tiba)." },
    { prompt: "パスポートを<u>準備</u>してください。", options: ["じゅんび", "じゅんひ", "じゅび", "じゅうび"], ans: 1, exp: "Kanji「準備」dibaca「じゅんび」(persiapan)." },
    { prompt: "会議室を<u>予約</u>しました。", options: ["よやく", "よきやく", "ゆやく", "よやっく"], ans: 1, exp: "Kanji「予約」dibaca「よやく」(reservasi)." },
    { prompt: "<u>理由</u>を説明してください。", options: ["りゆう", "りゆ", "りよう", "りゅう"], ans: 1, exp: "Kanji「理由」dibaca「りゆう」(alasan)." },
    { prompt: "<u>世界</u>旅行に行きたいです。", options: ["せかい", "せがい", "せっかい", "せいかい"], ans: 1, exp: "Kanji「世界」dibaca「せかい」(dunia)." },
    { prompt: "<u>荷物</u>を預けます。", options: ["にもつ", "かもつ", "にぶつ", "にもの"], ans: 1, exp: "Kanji「荷物」dibaca「にもつ」(barang bawaan)." },
    { prompt: "<u>動物</u>が大好きです。", options: ["どうぶつ", "どぶつ", "どうもの", "とぶつ"], ans: 1, exp: "Kanji「動物」dibaca「どうぶつ」(hewan)." },
  ],
  N3: [
    { prompt: "契約を<u>更新</u>しました。", options: ["こうしん", "こうじん", "こしん", "ごうしん"], ans: 1, exp: "Kanji「更新」dibaca「こうしん」(pembaruan)." },
    { prompt: "彼の意見に<u>賛成</u>です。", options: ["さんせい", "さんぜい", "せんせい", "ざんせい"], ans: 1, exp: "Kanji「賛成」dibaca「さんせい」(setuju)." },
    { prompt: "書類の<u>内容</u>を確認してください。", options: ["ないよう", "ないよ", "ないゆう", "なよう"], ans: 1, exp: "Kanji「内容」dibaca「ないよう」(isi/konten)." },
    { prompt: "事故の<u>原因</u>を調べています。", options: ["げんいん", "げにん", "がんいん", "げんじん"], ans: 1, exp: "Kanji「原因」dibaca「げんいん」(penyebab)." },
    { prompt: "<u>環境</u>問題に関心があります。", options: ["かんきょう", "かんきょ", "がんきょう", "かんこう"], ans: 1, exp: "Kanji「環境」dibaca「かんきょう」(lingkungan)." },
    { prompt: "<u>冷静</u>に判断してください。", options: ["れいせい", "れいぜい", "りょうせい", "れんせい"], ans: 1, exp: "Kanji「冷静」dibaca「れいせい」(tenang/kepala dingin)." },
    { prompt: "この製品の<u>特徴</u>は何ですか。", options: ["とくちょう", "とくちょ", "どくちょう", "とくじょう"], ans: 1, exp: "Kanji「特徴」dibaca「とくちょう」(ciri khas)." },
    { prompt: "<u>豊富</u>な知識を持っています。", options: ["ほうふ", "ほふ", "ほうぶ", "ぼうふ"], ans: 1, exp: "Kanji「豊富」dibaca「ほうふ」(melimpah/kaya)." },
    { prompt: "計画を<u>延期</u>することにしました。", options: ["えんき", "えんぎ", "えいき", "えき"], ans: 1, exp: "Kanji「延期」dibaca「えんき」(penundaan)." },
    { prompt: "<u>複雑</u>な仕組みになっています。", options: ["ふくざつ", "ふくさつ", "ふくしゃつ", "ふざつ"], ans: 1, exp: "Kanji「複雑」dibaca「ふくざつ」(rumit/kompleks)." },
  ],
  N2: [
    { prompt: "法改正が<u>施行</u>された。", options: ["しこう", "せこう", "しぎょう", "じこう"], ans: 1, exp: "Kanji「施行」dibaca「しこう」(diberlakukan/dijalankan)." },
    { prompt: "事態を<u>収拾</u>する。", options: ["しゅうしゅう", "しゅしゅう", "しゅうじゅう", "しゅうしゅ"], ans: 1, exp: "Kanji「収拾」dibaca「しゅうしゅう」(mengendalikan situasi)." },
    { prompt: "責任を<u>転嫁</u>する。", options: ["てんか", "てんが", "てんけ", "でんか"], ans: 1, exp: "Kanji「転嫁」dibaca「てんか」(melemparkan tanggung jawab)." },
    { prompt: "意見の<u>相違</u>が見られる。", options: ["そうい", "しょうい", "そうぎ", "ぞうい"], ans: 1, exp: "Kanji「相違」dibaca「そうい」(perbedaan)." },
    { prompt: "<u>巧妙</u>な手口でだまされた。", options: ["こうみょう", "こうみょ", "ごうみょう", "こみょう"], ans: 1, exp: "Kanji「巧妙」dibaca「こうみょう」(lihai/cerdik)." },
    { prompt: "<u>妥協</u>点を見出す。", options: ["だきょう", "だぎょう", "たいきょう", "だきょ"], ans: 1, exp: "Kanji「妥協」dibaca「だきょう」(kompromi)." },
    { prompt: "<u>措置</u>を講じる。", options: ["そち", "しょち", "そじ", "さち"], ans: 1, exp: "Kanji「措置」dibaca「そち」(tindakan/kebijakan)." },
    { prompt: "<u>顕著</u>な成果を収めた。", options: ["けんちょ", "けんちょう", "げんちょ", "けんじょ"], ans: 1, exp: "Kanji「顕著」dibaca「けんちょ」(mencolok/nyata)." },
  ],
  N1: [
    { prompt: "紛争を<u>調停</u>する。", options: ["ちょうてい", "じょうてい", "ちょうでい", "ちょうたい"], ans: 1, exp: "Kanji「調停」dibaca「ちょうてい」(mediasi)." },
    { prompt: "<u>暫定</u>的な措置をとる。", options: ["ざんてい", "ぜんてい", "さんてい", "ざんでい"], ans: 1, exp: "Kanji「暫定」dibaca「ざんてい」(sementara/provisional)." },
    { prompt: "事態の<u>収斂</u>を待つ。", options: ["しゅうれん", "しゅうかん", "しゅれん", "しゅうぜん"], ans: 1, exp: "Kanji「収斂」dibaca「しゅうれん」(konvergensi/mereda)." },
    { prompt: "<u>真摯</u>に反省する。", options: ["しんし", "しんじ", "しんせ", "じんし"], ans: 1, exp: "Kanji「真摯」dibaca「しんし」(tulus/sungguh-sungguh)." },
    { prompt: "<u>脆弱</u>な基盤を見直す。", options: ["ぜいじゃく", "きじゃく", "せ弱", "ぜいさく"], ans: 1, exp: "Kanji「脆弱」dibaca「ぜいじゃく」(rapuh/vulnerable)." },
    { prompt: "不正を<u>隠蔽</u>する。", options: ["いんぺい", "おんぺい", "いんへい", "いんび"], ans: 1, exp: "Kanji「隠蔽」dibaca「いんぺい」(menutupi/menyembunyikan)." },
    { prompt: "<u>諮問</u>機関を設置する。", options: ["しもん", "じもん", "しも", "さもん"], ans: 1, exp: "Kanji「諮問」dibaca「しもん」(konsultatif/penasihat)." },
    { prompt: "<u>煩雑</u>な手続きを省く。", options: ["はんざつ", "ぼんざつ", "はんさつ", "はんしゃつ"], ans: 1, exp: "Kanji「煩雑」dibaca「はんざつ」(berbelit-belit/rumit)." },
  ],
};

// ── ORTHOGRAPHY POOLS ──
const ORTHOGRAPHY_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "あしたの <u>あさ</u> 8じに おきます。", options: ["朝", "昼", "夜", "夕"], ans: 1, exp: "Huruf hiragana「あさ」ditulis dengan kanji「朝」(pagi)." },
    { prompt: "<u>みず</u>を ください。", options: ["水", "木", "火", "土"], ans: 1, exp: "Huruf hiragana「みず」ditulis dengan kanji「水」(air)." },
    { prompt: "ともだちと <u>はなし</u>ます。", options: ["話し", "聞き", "読み", "書き"], ans: 1, exp: "Huruf hiragana「はなし」ditulis dengan kanji「話し」(berbicara)." },
    { prompt: "<u>くるま</u>を かいました。", options: ["車", "電車", "自転車", "飛行機"], ans: 1, exp: "Huruf hiragana「くるま」ditulis dengan kanji「車」(mobil)." },
    { prompt: "すこし <u>やすみ</u>ましょう。", options: ["休み", "歩き", "走り", "止まり"], ans: 1, exp: "Huruf hiragana「やすみ」ditulis dengan kanji「休み」(istirahat)." },
    { prompt: "この <u>まち</u>は しずかです。", options: ["町", "村", "国", "道"], ans: 1, exp: "Huruf hiragana「まち」ditulis dengan kanji「町」(kota/kelurahan)." },
    { prompt: "<u>みち</u>を おしえてください。", options: ["道", "橋", "門", "駅"], ans: 1, exp: "Huruf hiragana「みち」ditulis dengan kanji「道」(jalan)." },
    { prompt: "<u>とり</u>の こえが きこえます。", options: ["鳥", "魚", "犬", "猫"], ans: 1, exp: "Huruf hiragana「とり」ditulis dengan kanji「鳥」(burung)." },
    { prompt: "えきの <u>ちかく</u>に すんでいます。", options: ["近く", "遠く", "広く", "高く"], ans: 1, exp: "Huruf hiragana「ちかく」ditulis dengan kanji「近く」(dekat)." },
    { prompt: "<u>あに</u>は 20さいです。", options: ["兄", "弟", "姉", "妹"], ans: 1, exp: "Huruf hiragana「あに」ditulis dengan kanji「兄」(kakak laki-laki)." },
  ],
  N4: [
    { prompt: "荷物を<u>はこび</u>ます。", options: ["運び", "送り", "配り", "届け"], ans: 1, exp: "Hiragana「はこび」ditulis「運び」(mengangkut/membawa)." },
    { prompt: "席を<u>ゆずり</u>ました。", options: ["譲り", "渡し", "貸し", "送り"], ans: 1, exp: "Hiragana「ゆずり」ditulis「譲り」(memberikan tempat duduk)." },
    { prompt: "<u>おんど</u>を 下げてください。", options: ["温度", "気度", "熱度", "湿度"], ans: 1, exp: "Hiragana「おんど」ditulis「温度」(temperatur/suhu)." },
    { prompt: "薬を<u>のんで</u>寝ます。", options: ["飲んで", "食んで", "吸んで", "呑んで"], ans: 1, exp: "Hiragana「のんで」ditulis「飲んで」(meminum obat)." },
    { prompt: "<u>けいかく</u>を 立てます。", options: ["計画", "計策", "定画", "定策"], ans: 1, exp: "Hiragana「けいかく」ditulis「計画」(rencana)." },
    { prompt: "<u>きかい</u>の 使い方を習う。", options: ["機械", "機会", "器械", "機具"], ans: 1, exp: "Hiragana「きかい」(mesin) ditulis「機械」." },
    { prompt: "友だちに<u>そうだん</u>します。", options: ["相談", "対談", "想談", "相論"], ans: 1, exp: "Hiragana「そうだん」ditulis「相談」(konsultasi)." },
  ],
  N3: [
    { prompt: "問題を<u>かいけつ</u>した。", options: ["解決", "解消", "解明", "決解"], ans: 1, exp: "Hiragana「かいけつ」ditulis「解決」(menyelesaikan masalah)." },
    { prompt: "<u>せつび</u>を 整える。", options: ["設備", "設営", "施設", "整備"], ans: 1, exp: "Hiragana「せつび」ditulis「設備」(fasilitas/peralatan)." },
    { prompt: "税金を<u>おさめる</u>。", options: ["納める", "治める", "収める", "修める"], ans: 1, exp: "Pajak (税金) memakai kanji「納める」(membayar/menyetor)." },
    { prompt: "<u>しげん</u>を 大切にする。", options: ["資源", "資金", "資産", "資財"], ans: 1, exp: "Sumber daya alam ditulis「資源」(shigen)." },
    { prompt: "会場を<u>はいかい</u>する。", options: ["徘徊", "排回", "配回", "徘回"], ans: 1, exp: "Berkeliaran ditulis「徘徊」(haikai)." },
  ],
  N2: [
    { prompt: "責任を<u>まっとう</u>する。", options: ["全う", "完う", "真当", "真統"], ans: 1, exp: "Menuntaskan tugas/tanggung jawab ditulis「全うする」." },
    { prompt: "<u>しんちょう</u>に 検討する。", options: ["慎重", "深重", "慎調", "身重"], ans: 1, exp: "Hati-hati/prudent ditulis「慎重」(shinchou)." },
    { prompt: "事実を<u>いんぺい</u>する。", options: ["隠蔽", "隠閉", "陰蔽", "陰閉"], ans: 1, exp: "Menutupi fakta ditulis「隠蔽」(impei)." },
    { prompt: "<u>さいばい</u>の 技術を学ぶ。", options: ["栽培", "再培", "載培", "菜培"], ans: 1, exp: "Bercocok tanam ditulis「栽培」(saibai)." },
  ],
  N1: [
    { prompt: "<u>ちくせき</u>された データを分析する。", options: ["蓄積", "畜積", "貯積", "築積"], ans: 1, exp: "Akumulasi ditulis「蓄積」(chikuseki)." },
    { prompt: "<u>かいぼう</u>学を 学ぶ。", options: ["解剖", "解析", "解法", "開剖"], ans: 1, exp: "Anatomi ditulis「解剖」(kaibou)." },
    { prompt: "計画が<u>とんざ</u>した。", options: ["頓挫", "鈍挫", "遁挫", "豚挫"], ans: 1, exp: "Macet di tengah jalan ditulis「頓挫」(tonza)." },
  ]
};

// ── WORD FORMATION POOLS (N2) ──
const WORD_FORMATION_POOLS: Record<string, PoolItem[]> = {
  N2: [
    { prompt: "彼は（　）責任な行動をとって非難された。", options: ["無", "非", "不", "未"], ans: 1, exp: "Bentuk negatif untuk 責任 adalah「無責任」(tidak bertanggung jawab)." },
    { prompt: "この計画は（　）完成のまま中断された。", options: ["未", "不", "非", "無"], ans: 1, exp: "Belum selesai dinyatakan dengan prefiks「未」: 未完成." },
    { prompt: "（　）公式な発表によると、来月開通予定だ。", options: ["非", "不", "無", "未"], ans: 1, exp: "Informal/tidak resmi menggunakan prefiks「非」: 非公式." },
    { prompt: "現代社会の（　）合理的なルールを見直すべきだ。", options: ["不", "非", "無", "未"], ans: 1, exp: "Irasional/tidak masuk akal menggunakan prefiks「不」: 不合理." },
    { prompt: "彼女のプレゼンには説得（　）がある。", options: ["力", "性", "感", "的"], ans: 1, exp: "Daya persuasif dinyatakan dengan sufiks「力」: 説得力." },
    { prompt: "この素材は安全（　）が高い。", options: ["性", "力", "的", "感"], ans: 1, exp: "Tingkat keamanan dinyatakan dengan sufiks「性」: 安全性." },
    { prompt: "彼には責任（　）が欠けている。", options: ["感", "性", "心", "力"], ans: 1, exp: "Rasa tanggung jawab dinyatakan dengan sufiks「感」: 責任感." },
  ]
};

// ── CONTEXTUAL EXPRESSION POOLS ──
const CONTEXTUAL_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "おなかが すきましたから、（　）を たべましょう。", options: ["ごはん", "おちゃ", "みず", "くすり"], ans: 1, exp: "Lapar (おなかがすきました), jadi makan nasi/makanan (ごはん)." },
    { prompt: "へやが くらいですから、（　）を つけてください。", options: ["でんき", "テレビ", "ラジオ", "ドア"], ans: 1, exp: "Kamar gelap, jadi menyalakan lampu (でんき)." },
    { prompt: "きょうは あめですから、（　）を もっていきます。", options: ["かさ", "かばん", "ぼうし", "くつ"], ans: 1, exp: "Hari hujan, jadi membawa payung (かさ)." },
    { prompt: "あした テストが ありますから、きょうは たくさん（　）します。", options: ["べんきょう", "さんぽ", "かいもの", "そうじ"], ans: 1, exp: "Ada ujian besok, jadi banyak belajar (べんきょう)." },
    { prompt: "のどが かわきました。（　）を のみたいです。", options: ["ジュース", "パン", "ケーキ", "くだもの"], ans: 1, exp: "Haus (のどがかわきました), ingin minum jus (ジュース)." },
    { prompt: "えきまで （　）で 10ぷん かかります。", options: ["あるいて", "のんで", "たべて", "みて"], ans: 1, exp: "Ke stasiun jalan kaki (あるいて) 10 menit." },
    { prompt: "ともだちに たんじょうびの （　）を あげました。", options: ["プレゼント", "しゅくだい", "きっぷ", "てがみ"], ans: 1, exp: "Memberikan hadiah (プレゼント) ulang tahun ke teman." },
    { prompt: "あさ （　）を みがいてから、ごはんを たべます。", options: ["は", "め", "て", "かお"], ans: 1, exp: "Menyikat gigi (はをみがく) di pagi hari." },
  ],
  N4: [
    { prompt: "道に迷ったので、通りがかりの人に（　）を聞いた。", options: ["道順", "切符", "都合", "案内"], ans: 1, exp: "Tersesat di jalan, menanyakan rute jalan (道順)." },
    { prompt: "約束の時間に遅れそうなので、（　）連絡を入れた。", options: ["あらかじめ", "突然", "さっそく", "ようやく"], ans: 1, exp: "Memberi kabar terlebih dahulu (あらかじめ)." },
    { prompt: "会議の資料を参加者の人数分（　）した。", options: ["コピー", "サイン", "メモ", "マーク"], ans: 1, exp: "Memfotokopi dokumen sebanyak jumlah peserta." },
    { prompt: "台風が近づいているので、戸締まりを（　）確認した。", options: ["しっかり", "すっきり", "うっかり", "ぴったり"], ans: 1, exp: "Memeriksa dengan seksama/pasti (しっかり)." },
    { prompt: "この料理は味が少し（　）ので、醤油を足した。", options: ["薄い", "浅い", "ぬるい", "細い"], ans: 1, exp: "Rasa masakan agak hambar/encer (薄い)." },
  ],
  N3: [
    { prompt: "予算が不足しているため、一部の計画を（　）せざるを得ない。", options: ["縮小", "拡大", "破棄", "延長"], ans: 1, exp: "Karena anggaran kurang, rencana diperkecil (縮小)." },
    { prompt: "予期せぬトラブルが発生したが、（　）冷静に対応した。", options: ["終始", "年中", "始終", "到底"], ans: 1, exp: "Dari awal hingga akhir bersikap tenang (終始)." },
    { prompt: "アンケートの結果、顧客満足度が（　）向上していることが分かった。", options: ["着実に", "むやみに", "やたらに", "いたずらに"], ans: 1, exp: "Kepuasan pelanggan meningkat secara bertahap dan pasti (着実に)." },
    { prompt: "彼の熱心な説得に、（　）心が動かされた。", options: ["次第に", "直ちに", "即座に", "早急に"], ans: 1, exp: "Perlahan-lahan tergerak hatinya (次第に)." },
  ],
  N2: [
    { prompt: "長年の研究が実を結び、（　）新薬の開発に成功した。", options: ["ついに", "あわや", "かりに", "いまさら"], ans: 1, exp: "Akhirnya berhasil mengembangkan obat baru (ついに)." },
    { prompt: "突発的な事態にも（　）対応できる柔軟性が求められる。", options: ["臨機応変に", "杓子定規に", "一網打尽に", "猪突猛進に"], ans: 1, exp: "Menyesuaikan diri dengan situasi secara fleksibel (臨機応変に)." },
    { prompt: "景気の後退に伴い、各企業は採用枠を（　）削減している。", options: ["大幅に", "大層に", "大仰に", "大雑把に"], ans: 1, exp: "Mengurangi kuota rekrutmen dalam jumlah besar (大幅に)." },
  ],
  N1: [
    { prompt: "過去の過ちを（　）にして、新たな一歩を踏み出す。", options: ["糧", "壁", "蓋", "溝"], ans: 1, exp: "Menjadikan kesalahan masa lalu sebagai pelajaran berharga (糧にする)." },
    { prompt: "彼の発言は、事態の悪化に（　）をかける結果となった。", options: ["拍車", "歯止め", "楔", "足かせ"], ans: 1, exp: "Mempercepat/memperparah perburukan situasi (拍車をかける)." },
    { prompt: "事態を甘く見ていたと言わざるを得ず、（　）の極みである。", options: ["痛恨", "痛快", "悲憤", "慙愧"], ans: 1, exp: "Penyesalan yang amat mendalam (痛恨の極み)." },
  ]
};

// ── PARAPHRASE POOLS ──
const PARAPHRASE_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "あしたは <u>やすみ</u>です。", options: ["しごとが ありません", "がっこうへ いきます", "しごとを します", "べんきょうします"], ans: 1, exp: "Libur (やすみ) artinya tidak ada pekerjaan/sekolah (しごとがありません)." },
    { prompt: "ここは <u>しずか</u>な まちです。", options: ["うるさくない", "にぎやかな", "あかるい", "ひろい"], ans: 1, exp: "Tenang (しずか) artinya tidak bising (うるさくない)." },
    { prompt: "<u>だんだん</u> さむく なります。", options: ["すこしずつ", "すぐに", "ぜんぜん", "いつも"], ans: 1, exp: "Berangsur-angsur (だんだん) setara dengan sedikit demi sedikit (すこしずつ)." },
    { prompt: "あの ひとは <u>しんせつ</u>です。", options: ["やさしい", "こわい", "つめたい", "いそがしい"], ans: 1, exp: "Ramah/baik hati (しんせつ) setara dengan「やさしい」." },
  ],
  N4: [
    { prompt: "その知らせを聞いて<u>たまげた</u>。", options: ["非常に驚いた", "怒り出した", "がっかりした", "喜んだ"], ans: 1, exp: "Tamageru (たまげる) adalah ungkapan kaget luar biasa (非常に驚いた)." },
    { prompt: "彼は<u>すなおな</u>性格だ。", options: ["素直で正直な", "頑固で厳しい", "短気で怒りっぽい", "無口でおとなしい"], ans: 1, exp: "Sunao (素直) berarti jujur dan penurut." },
    { prompt: "<u>およそ</u>30分で到着します。", options: ["だいたい", "かならず", "ぜったいに", "やっと"], ans: 1, exp: "Oyoso (およそ) bermakna kira-kira / kurang lebih (だいたい)." },
  ],
  N3: [
    { prompt: "彼の提案を<u>ことわった</u>。", options: ["引き受けなかった", "承諾した", "検討した", "歓迎した"], ans: 1, exp: "Kotowaru (断る) berarti menolak (引き受けなかった)." },
    { prompt: "それは<u>くだらない</u>話だ。", options: ["価値のない", "おもしろい", "感動的な", "恐ろしい"], ans: 1, exp: "Kudaranai berarti tidak bermutu / tidak ada nilainya (価値のない)." },
    { prompt: "あの二人は<u>そっくり</u>だ。", options: ["とてもよく似ている", "まったく違っている", "仲が悪い", "背が高い"], ans: 1, exp: "Sokkuri berarti sangat mirip (とてもよく似ている)." },
  ],
  N2: [
    { prompt: "その噂は<u>でたらめ</u>だ。", options: ["根拠がない嘘だ", "紛れもない事実だ", "確認中だ", "興味深い"], ans: 1, exp: "Detarame berarti omong kosong tanpa dasar (根拠がない嘘)." },
    { prompt: "計画が<u>頓挫した</u>。", options: ["途中で行き詰まった", "順調に進んだ", "大成功を収めた", "延期された"], ans: 1, exp: "Tonza suru berarti macet / gagal di tengah jalan." },
  ],
  N1: [
    { prompt: "彼の弁明には<u>釈然としない</u>思いが残る。", options: ["納得がいかない", "すっきりした", "怒りが湧く", "感銘を受けた"], ans: 1, exp: "Shakuzen to shinai berarti masih mengganjal / belum bisa diyakini (納得がいかない)." },
    { prompt: "今回の措置は<u>場当たり的</u>だ。", options: ["その場しのぎの", "周到に準備された", "抜本的な", "先見性のある"], ans: 1, exp: "Baatari-teki bermakna tindakan reaktif sementara (その場しのぎ)." },
  ]
};

// ── USAGE POOLS ──
const USAGE_POOLS: Record<string, PoolItem[]> = {
  N4: [
    {
      prompt: "【案内】",
      options: [
        "東京タワーの案内をしてもらった。",
        "友達に新しいペンを案内した。",
        "雨が降る案内が出ている。",
        "案内を食べてから出かけた。"
      ],
      ans: 1,
      exp: "「案内」(panduan/menemani berkunjung) tepat dipakai untuk menunjukkan tempat wisata."
    },
    {
      prompt: "【都合】",
      options: [
        "明日は都合が悪いので参加できません。",
        "この靴は都合がとても高いです。",
        "都合を降ろして荷物を入れます。",
        "都合をよく噛んで食べてください。"
      ],
      ans: 1,
      exp: "「都合」(kondisi kelonggaran waktu) tepat digunakan untuk menyatakan situasi ada acara lain."
    },
    {
      prompt: "【遠慮】",
      options: [
        "ここではタバコをご遠慮ください。",
        "遠慮をして駅まで走りました。",
        "雨が遠慮に降っています。",
        "遠慮な本を読んで寝ました。"
      ],
      ans: 1,
      exp: "「遠慮」(menahan diri / segan) digunakan pada permohonan sopan seperti「ご遠慮ください」."
    }
  ],
  N3: [
    {
      prompt: "【充実】",
      options: [
        "研修を通じて充実した毎日を過ごすことができた。",
        "この部屋は充実が狭くて住みにくい。",
        "電車の充実が遅れて遅刻してしまった。",
        "充実な値段で買い物を楽しんだ。"
      ],
      ans: 1,
      exp: "「充実」(terpenuhi / bermakna) tepat digunakan untuk mendeskripsikan kehidupan sehari-hari (充実した毎日)."
    },
    {
      prompt: "【冷静】",
      options: [
        "どんな時も冷静に状況を判断することが重要だ。",
        "冷蔵庫でジュースを冷静にした。",
        "今日の天気は冷静で気持ちがいい。",
        "冷静な坂道を自転車で登った。"
      ],
      ans: 1,
      exp: "「冷静」(kepala dingin / tenang) digunakan untuk sikap rasional menghadapi situasi."
    }
  ],
  N2: [
    {
      prompt: "【反映】",
      options: [
        "消費者の声を新商品の開発に反映させた。",
        "鏡に映る月を反映して眺めた。",
        "会議の時間を明日に反映してください。",
        "壁にポスターを反映した。"
      ],
      ans: 1,
      exp: "「反映」(mencerminkan/mengakomodasi) tepat untuk memasukkan aspirasi konsumen ke produk."
    },
    {
      prompt: "【執着】",
      options: [
        "過去の栄光にいつまでも執着すべきではない。",
        "電車が目的地の駅に執着した。",
        "手紙に切手をしっかり執着した。",
        "服のサイズが体に執着している。"
      ],
      ans: 1,
      exp: "「執着」(terpaku/melekat secara emosional) digunakan untuk keterikatan pada masa lalu."
    }
  ],
  N1: [
    {
      prompt: "【喚起】",
      options: [
        "市民に防災意識の喚起を促すポスターを掲示した。",
        "窓を開けて部屋の空気を喚起した。",
        "大雨で川の水が喚起している。",
        "彼の冗談にみんなが喚起した。"
      ],
      ans: 1,
      exp: "「喚起」(membangkitkan perhatian/kesadaran) tepat digunakan untuk kesadaran bencana."
    },
    {
      prompt: "【介在】",
      options: [
        "第三者の介在によって両者の和解が成立した。",
        "山と海が介在する美しい景色だ。",
        "本棚の間に本を介在させた。",
        "薬を飲んで痛みを介在した。"
      ],
      ans: 1,
      exp: "「介在」(intervensi/kehadiran penengah) digunakan untuk pihak ketiga."
    }
  ]
};

// ── GRAMMAR FORM POOLS ──
const GRAMMAR_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "わたしは 毎朝 7時（　）起きます。", options: ["に", "で", "を", "へ"], ans: 1, exp: "Partikel「に」menandai waktu spesifik (7-ji ni)." },
    { prompt: "図書館（　）本を 借りました。", options: ["で", "に", "を", "へ"], ans: 1, exp: "Partikel「で」menandai tempat terjadinya aksi aktif." },
    { prompt: "バス（　）学校へ 行きます。", options: ["で", "に", "を", "から"], ans: 1, exp: "Partikel「で」menandai sarana transportasi." },
    { prompt: "これは 兄（　）もらった 時計です。", options: ["から", "まで", "へ", "で"], ans: 1, exp: "Partikel「から」menunjukkan asal pemberian." },
    { prompt: "雨が 降って います（　）、傘を さします。", options: ["から", "けど", "ので", "のに"], ans: 1, exp: "Partikel「から」menyatakan alasan sebab akibat langsung." },
    { prompt: "日曜日、どこ（　）行きませんでした。", options: ["へも", "にも", "でも", "をも"], ans: 1, exp: "Bentuk menyangkal total tujuan tempat menggunakan「へも」." },
    { prompt: "この部屋は 静か（　）きれいです。", options: ["で", "に", "くて", "な"], ans: 1, exp: "Menghubungkan kata sifat-na (静か) menggunakan「で」." },
    { prompt: "ケーキを 3（　）買いました。", options: ["つ", "枚", "本", "台"], ans: 1, exp: "Penghitung umum untuk kue potong adalah「つ」(mittsu)." },
    { prompt: "映画を（　）ながら ポップコーンを 食べます。", options: ["見", "見て", "見ない", "見る"], ans: 1, exp: "Pola simultan「〜ながら」menggunakan bentuk Masu-stem (見)." },
  ],
  N4: [
    { prompt: "日本へ 行ったこと（　）ありますか。", options: ["が", "を", "に", "で"], ans: 1, exp: "Pola pengalaman: V-ta koto ga aru." },
    { prompt: "風邪を 引かない（　）に、暖かく してください。", options: ["よう", "そう", "ため", "こと"], ans: 1, exp: "Pola tujuan negatif agar tidak terjadi: V-nai you ni." },
    { prompt: "窓が 開けて（　）あります。", options: ["あり", "い", "おき", "み"], ans: 1, exp: "Pola keadaan yang sengaja dibuat: V-te aru." },
    { prompt: "雨が 降り（　）です。", options: ["そう", "よう", "らしい", "みたい"], ans: 1, exp: "Kelihatannya akan turun hujan (dugaan visual): Masu-stem + sou desu." },
    { prompt: "先生に 本を 貸して（　）ました。", options: ["いただき", "くださり", "あげ", "やり"], ans: 1, exp: "Menerima kebaikan dari orang yang dihormati: V-te itadaku." },
  ],
  N3: [
    { prompt: "健康の（　）に、毎朝走っています。", options: ["ため", "よう", "わけ", "はず"], ans: 1, exp: "Demi kesehatan memakai kata benda + no tame ni." },
    { prompt: "あの二人はまるで兄弟の（　）によく似ている。", options: ["よう", "そう", "らしい", "みたい"], ans: 1, exp: "Perumpamaan: marude ... no you ni." },
    { prompt: "書類を提出する（　）に、誤字がないか見直した。", options: ["際", "最中", "うちに", "ついで"], ans: 1, exp: "Saat/ketika (formal): V-suru sai ni." },
    { prompt: "熱がある（　）、無理をして出勤した。", options: ["にもかかわらず", "につれて", "にともなって", "にしたがって"], ans: 1, exp: "Meskipun (pertentangan tegas): ni mo kakawarazu." },
  ],
  N2: [
    { prompt: "どんなに困難であれ、最後までやり遂げ（　）見せる。", options: ["て", "に", "ば", "ど"], ans: 1, exp: "Tekad kuat: V-te miseru." },
    { prompt: "調査の結果を（　）、今後の対策を決定する。", options: ["踏まえて", "兼ねて", "控えめにして", "除いて"], ans: 1, exp: "Berdasarkan pertimbangan: wo fumaete." },
    { prompt: "彼が犯人であるはずが（　）。", options: ["ない", "ある", "する", "いる"], ans: 1, exp: "Tidak mungkin (penolakan tegas): hazu ga nai." },
  ],
  N1: [
    { prompt: "いくら後悔したところで、過去は取り戻せ（　）。", options: ["ない", "まい", "ざるを得ない", "に相違ない"], ans: 1, exp: "V-ta tokorode ... nai (meskipun... tidak akan bisa)." },
    { prompt: "彼女の歌声は聴く者の心を揺さぶらずには（　）。", options: ["おかない", "いられない", "すまない", "やまない"], ans: 1, exp: "Pastilah membuat/menggugah: ~zu ni wa okanai." },
    { prompt: "事ここに至っては、真相をすべて明かす（　）ほかない。", options: ["より", "だけ", "ほど", "ばかり"], ans: 1, exp: "Tidak ada pilihan lain selain: ~yori hokawai." },
  ]
};

// ── SENTENCE COMPOSITION POOLS (★) ──
const SENTENCE_COMP_POOLS: Record<string, PoolItem[]> = {
  N5: [
    { prompt: "きのう ＿＿ ＿★＿ ＿＿ ＿＿ かいました。", options: ["ほんやで", "おもしろい", "まんがを", "ともだちと"], ans: 2, exp: "Urutan benar: ともだちと ほんやで まんがを おもしろい (★ = ほんやで)." },
    { prompt: "わたしは ＿＿ ＿★＿ ＿＿ ＿＿ すきです。", options: ["スポーツの", "テニスが", "なかで", "いちばん"], ans: 3, exp: "Urutan benar: スポーツの なかで テニスが いちばん (★ = なかで)." },
    { prompt: "すみませんが ＿＿ ＿★＿ ＿＿ ＿＿ ください。", options: ["ボールペンを", "この", "かして", "いっぽん"], ans: 4, exp: "Urutan benar: この ボールペンを いっぽん かして (★ = かして)." },
    { prompt: "あした ＿＿ ＿★＿ ＿＿ ＿＿ いきませんか。", options: ["えいがを", "いっしょに", "みに", "えきまえへ"], ans: 1, exp: "Urutan benar: えっしょに えきまえへ えいがを みに (★ = えいがを)." },
  ],
  N4: [
    { prompt: "雨が ＿＿ ＿★＿ ＿＿ ＿＿ 出かけましょう。", options: ["やんだら", "すぐに", "かいものに", "スーパーへ"], ans: 1, exp: "Urutan benar: やんだら すぐに スーパーへ かいものに (★ = やんだら)." },
    { prompt: "先生に ＿＿ ＿★＿ ＿＿ ＿＿ わかりました。", options: ["おしえて", "いただいたので", "よく", "文法が"], ans: 2, exp: "Urutan benar: おしえて いただいたので 文法が よく (★ = いただいたので)." },
  ],
  N3: [
    { prompt: "健康の ＿＿ ＿★＿ ＿＿ ＿＿ 続けている。", options: ["ために", "毎朝の", "ジョギングを", "欠かさず"], ans: 1, exp: "Urutan benar: ために 毎朝の ジョギングを 欠かさず (★ = ために)." },
    { prompt: "どんなに ＿＿ ＿★＿ ＿＿ ＿＿ あきらめない。", options: ["つらくても", "夢を", "最後まで", "決して"], ans: 3, exp: "Urutan benar: つらくても 決して 最後まで 夢を (★ = 最後まで)." },
  ],
  N2: [
    { prompt: "周囲の ＿＿ ＿★＿ ＿＿ ＿＿ やり遂げた。", options: ["反対を", "押し切って", "彼は事業を", "成功させた"], ans: 2, exp: "Urutan benar: 反対を 押し切って 彼は事業を 成功させた (★ = 押し切って)." },
  ],
  N1: [
    { prompt: "事前の ＿＿ ＿★＿ ＿＿ ＿＿ 招いたと言える。", options: ["調査が", "不十分であったが", "ゆえに失敗を", "今回の惨事を"], ans: 3, exp: "Urutan benar: 調査が 不十分であったが ゆえに失敗を 今回の惨事を (★ = ゆえに失敗を)." },
  ]
};

// ── TEXT GRAMMAR POOLS ──
const TEXT_GRAMMAR_POOLS: Record<string, PassagePoolItem[]> = {
  N5: [
    {
      prompt: "（1）に入る最もよいものを選んでください。",
      passage: "わたしは まいあさ 6じに おきます。あさごはんを たべてから、（1） 学校へ いきます。学校では ともだちと にほんごを べんきょうします。",
      options: ["自転車で", "自転車を", "自転車に", "自転車へ"],
      ans: 1,
      exp: "Transportasi menggunakan partikel で (自転車で)."
    },
    {
      prompt: "（2）に入る最もよいものを選んでください。",
      passage: "きのうの日曜日は とても いいてんきでした。（2） ともだちと こうえんへ いきました。こうえんで サッカーを しました。",
      options: ["ですから", "でも", "しかし", "または"],
      ans: 1,
      exp: "Konjungsi sebab akibat: cuaca cerah oleh karena itu (ですから) pergi ke taman."
    },
    {
      prompt: "（3）に入る最もよいものを選んでください。",
      passage: "あしたは ははの たんじょうびです。きれいな はなを （3） と おもっています。",
      options: ["かおう", "かう", "かった", "かわない"],
      ans: 1,
      exp: "Pola niat/maksud: bentuk kehendak (Ikoukei) + と思っています (かおう)."
    }
  ],
  N4: [
    {
      prompt: "（1）に入る最もよいものを選んでください。",
      passage: "日本に来てから、半年がたちました。最初は日本語が全く話せませんでしたが、（1）少しずつ話せるようになりました。",
      options: ["最近は", "昔は", "突然", "決して"],
      ans: 1,
      exp: "Keterangan kontras waktu: belakangan ini (最近は) mulai bisa berbicara sedikit demi sedikit."
    }
  ],
  N3: [
    {
      prompt: "（1）に入る最もよいものを選んでください。",
      passage: "電子書籍の普及により、読書のスタイルは大きく変化した。（1）紙の書籍ならではの手触りや装丁を好む読者も依然として多い。",
      options: ["しかしながら", "したがって", "たとえば", "つまり"],
      ans: 1,
      exp: "Konjungsi pertentangan formal: Shiganagara (namun demikian)."
    }
  ],
  N2: [
    {
      prompt: "（1）に入る最もよいものを選んでください。",
      passage: "グローバル化の進展に伴い、多文化共生社会の実現が叫ばれている。（1）単に制度を整えるだけでなく、市民一人ひとりの意識改革が欠かせない。",
      options: ["とはいえ", "それゆえ", "すなわち", "のみならず"],
      ans: 1,
      exp: "Konjungsi pembatasan / pengakuan parsial: To wa ie (kendati demikian)."
    }
  ],
  N1: [
    {
      prompt: "（1）に入る最もよいものを選んでください。",
      passage: "科学技術の発展は人類に未曾有の利便性をもたらした。（1）その恩恵の裏側には、環境破壊や生命倫理の危機といった看過し得ない代償が存在する。",
      options: ["しかしながら", "もっとも", "それどころか", "よって"],
      ans: 1,
      exp: "Pertentangan wacana argumentatif akademis: Shikanagara."
    }
  ]
};

// ── DOKKAI SHORT PASSAGE POOLS ──
const SHORT_PASSAGE_POOLS: Record<string, PassagePoolItem[]> = {
  N5: [
    {
      prompt: "田中さんは あした 何時に どこで 会いますか。",
      passage: "【メモ】\n山田さんへ\nあしたの えいがは 2時から はじまります。1時30分に えきの 西口の かいさつぐちで まち合わせましょう。切符は わたしが 買っておきます。\n田中より",
      options: ["1時30分に 駅の西口", "2時に 映画館", "1時30分に 映画館", "2時に 駅の改札口"],
      ans: 1,
      exp: "Memo tertulis jelas: bertemu pukul 1:30 di pintu keluar barat stasiun."
    },
    {
      prompt: "このメールで 一番 言いたいことは 何ですか。",
      passage: "学生のみなさんへ\n来週の月曜日は 祝日ですから、学校は 休みです。授業は ありません。火曜日の じゅぎょうの じゅんびを してきてください。\n日本語学校 事務室",
      options: ["来週の月曜日は 休みだということ", "火曜日に テストがあること", "月曜日に 授業があること", "学校へ 来なければならないこと"],
      ans: 1,
      exp: "Pemberitahuan bahwa hari Senin minggu depan sekolah libur."
    }
  ],
  N4: [
    {
      prompt: "図書館の利用について、正しいものはどれですか。",
      passage: "【図書館からのお知らせ】\n館内での飲食は原則禁止ですが、ふた付きの水筒やペットボトルの飲み物に限り、持ち込みが可能です。本を汚さないよう、十分ご注意ください。",
      options: ["ふた付きの飲み物なら持ち込んでもよい", "館内でお弁当を食べてもよい", "どんな飲み物も持ち込んではいけない", "本を読みながらお菓子を食べてもよい"],
      ans: 1,
      exp: "Minuman botol/termos bertutup diperbolehkan."
    }
  ],
  N3: [
    {
      prompt: "筆者がこの文章で最も伝えたいことは何か。",
      passage: "失敗を恐れて何もしないことこそが、人生における最大の失敗である。挑戦して得られた教訓は、将来必ずかけがえのない財産となるはずだ。",
      options: ["失敗を恐れずに挑戦することの大切さ", "失敗しないように慎重に行動すべきだ", "人生には失敗がつきものだという諦め", "挑戦する前に十分な準備が必要なこと"],
      ans: 1,
      exp: "Pentingnya menantang diri tanpa takut gagal."
    }
  ],
  N2: [
    {
      prompt: "筆者によると、真のコミュニケーションにおいて重要なのは何か。",
      passage: "流暢に話す技術よりも、相手の沈黙の意図を汲み取る感受性のほうが、時に深い対話を生み出す。言葉にならない感情に寄り添う姿勢こそが、信頼の礎である。",
      options: ["相手の言葉にならない意図や感情を汲み取ること", "淀みなく論理的に自分の意見を主張すること", "沈黙を避けて常に話題を提供し続けること", "相手の意見に無条件に同調すること"],
      ans: 1,
      exp: "Memahami niat dan perasaan yang tidak terucap di balik keheningan."
    }
  ],
  N1: [
    {
      prompt: "筆者の主張と合致するものはどれか。",
      passage: "客観性という概念は、主観を完全に排除した神の視点を意味するのではない。自らの主観に内在する偏見や前提を自覚し、それを相対化し続ける営みの中にこそ客観性は宿る。",
      options: ["客観性とは自己の主観の偏りを自覚し相対化する姿勢である", "主観を完全に排除しなければ真の客観性は得られない", "客観的な視点は誰にとっても自明で不変のものである", "主観と客観は完全に相容れない対立概念である"],
      ans: 1,
      exp: "Objektivitas adalah kesadaran akan bias subjektif diri dan upaya konstan merelativisasikannya."
    }
  ]
};

// ── DOKKAI MID PASSAGE POOLS ──
const MID_PASSAGE_POOLS: Record<string, PassagePoolItem[]> = {
  N5: [
    {
      prompt: "留学生のスミスさんは なぜ 日本へ 来ましたか。",
      passage: "わたしは アメリカから 来た スミスです。子どものころから 日本の アニメが 大好きでした。アニメの セリフを 日本語で 理解したいと 思って、大学で 日本語の べんきょうを はじめました。いまは 東京の 日本語学校で まいにち 一生懸命 べんきょうしています。将来は 日本の アニメ会社で 働きたいです。",
      options: ["アニメのセリフを日本語で理解し、将来アニメ会社で働きたいから", "アメリカの大学を卒業したから", "東京の町を観光したいから", "友達に会いに来たから"],
      ans: 1,
      exp: "Disebutkan ingin memahami dialog anime dalam bahasa Jepang dan kelak bekerja di perusahaan anime."
    },
    {
      prompt: "スミスさんの 将来の 夢は 何ですか。",
      passage: "わたしは アメリカから 来た スミスです。子どものころから 日本の アニメが 大好きでした。アニメの セリフを 日本語で 理解したいと 思って、大学で 日本語の べんきょうを はじめました。いまは 東京の 日本語学校で まいにち 一生懸命 べんきょうしています。将来は 日本の アニメ会社で 働きたいです。",
      options: ["日本のアニメ会社で働くこと", "アメリカへすぐ帰ること", "日本語の先生になること", "大学を新しく作ること"],
      ans: 1,
      exp: "Cita-citanya adalah bekerja di perusahaan anime Jepang (将来は日本のアニメ会社で働きたい)."
    }
  ],
  N4: [
    {
      prompt: "筆者が日本のコンビニについて驚いたことは何か。",
      passage: "日本のコンビニエンスストアは、単に買い物をするだけの場所ではない。荷物の発送や公共料金の支払い、銀行ATMの利用、さらには住民票の発行までできる。年中無休で24時間開いており、生活のあらゆるインフラが集約されている点に、私は大きな感銘を受けた。",
      options: ["生活に必要な多様なサービスが24時間提供されていること", "商品の値段がスーパーより非常に安いこと", "店員が全員外国人であること", "電車の切符が買えること"],
      ans: 1,
      exp: "Berbagai layanan penunjang kehidupan terintegrasi selama 24 jam."
    }
  ],
  N3: [
    {
      prompt: "この文章で述べられている「睡眠の役割」について正しいものはどれか。",
      passage: "睡眠は単に体を休める時間ではない。日中にインプットされた膨大な情報を整理し、長期記憶として脳内に定着させる重要なプロセスが睡眠中に行われている。睡眠不足が続くと集中力が落ちるだけでなく、学習効果も著しく低下するのはそのためである。",
      options: ["日中の記憶を整理し脳に定着させる役割がある", "体の疲労を取るだけで記憶には影響しない", "短時間睡眠のほうが集中力が高まる", "睡眠中は脳の活動が完全に停止している"],
      ans: 1,
      exp: "Tidur bertugas menyortir dan mengkonsolidasikan ingatan jangka panjang."
    }
  ],
  N2: [
    {
      prompt: "伝統技術の継承において、筆者が最も懸念していることは何か。",
      passage: "後継者不足が叫ばれる伝統工芸の現場において、真の課題は単なる人手不足ではない。伝統を守ることと現代の生活様式に適応させることのバランスをどのように取るかというビジョンの欠如である。伝統を固定化された過去の遺物として保存するだけでは、市場の淘汰から逃れることはできない。",
      options: ["現代の生活様式に適応させるための明確なビジョンが欠如していること", "職人の技術が未熟であること", "原材料が高騰して採算が取れないこと", "若者が伝統文化に全く関心を持たないこと"],
      ans: 1,
      exp: "Kekurangan visi untuk menyeimbangkan pelestarian tradisi dengan adaptasi gaya hidup modern."
    }
  ],
  N1: [
    {
      prompt: "AI技術の発展と人間の存在意義について、筆者の見解はどれか。",
      passage: "生成AIの急速な進化は、知的な作業における人間の特権性を根底から揺るがしている。しかし、解を効率的に導き出す能力が機械に代替されたとしても、解くべき「問い」を発見し、その問いに価値を付与する営みは、依然として人間にしか為し得ない。自律的な問題設定能力こそが、これからの知性の試金石となる。",
      options: ["自律的に価値ある「問い」を見出し設定する能力こそが人間の本質である", "AIの進化によって人間はあらゆる知的労働から完全に解放される", "効率的な計算や文章作成能力こそが知性の最も重要な尺度である", "AIには感情があるため、問いを立てる能力においても人間を超える"],
      ans: 1,
      exp: "Menemukan dan membingkai pertanyaan bermakna adalah domain eksklusif manusia."
    }
  ]
};

// ── DOKKAI LONG PASSAGE POOLS ──
const LONG_PASSAGE_POOLS: Record<string, PassagePoolItem[]> = {
  N3: [
    {
      prompt: "筆者は現代のコミュニケーション環境をどのように捉えているか。",
      passage: "SNSの普及により、私たちはいつでもどこでも他者と瞬時につながることができるようになった。しかし、その手軽さの代償として、誤解や心理的疲労を感じる人々が増加している。短いテキストメッセージだけでは伝わらない表情や声のトーンといった非言語情報が欠如しているため、相手の意図を深読みしすぎてしまうからだ。技術がどれほど進歩しても、相手の表情を見ながら対話するFace to Faceの時間の大切さは変わらない。",
      options: ["便利になった一方で非言語情報の欠如による誤解や疲労が生じている", "SNSのおかげで対面での会話は完全に不要になった", "テキストメッセージのほうが正確に感情が伝わる", "コミュニケーションの頻度が減ったことが問題である"],
      ans: 1,
      exp: "Kemudahan konektivitas memunculkan keletihan mental dan kesalahpahaman akibat tiadanya komunikasi non-verbal."
    }
  ],
  N2: [
    {
      prompt: "組織における「心理的安全性」の重要性について、本文と一致するものはどれか。",
      passage: "高い成果を出し続けるチームに共通する決定的な要素は、個々の能力の高さではなく「心理的安全性」の有無である。心理的安全性とは、自分の無知や失敗をチームメンバーにさらけ出しても、罰せられたり侮辱されたりしないという相互の確信を指す。この土壌があって初めて、建設的な批判や革新的なアイデアの提示が可能となる。失敗を許容しない厳罰主義的な組織は、保身による情報の隠蔽を生み、長期的には破綻へと向かう。",
      options: ["失敗や率直な意見表明が受け入れられる環境がチームの革新を促す", "メンバー個人の高い専門性さえあればチームは必ず成功する", "失敗したメンバーを厳しく処分することで規律が保たれる", "会議での議論を避けて上層部の決定に従うべきである"],
      ans: 1,
      exp: "Rasa aman secara psikologis mendorong inovasi dan keterbukaan tanpa takut dihakimi."
    }
  ],
  N1: [
    {
      prompt: "筆者が述べる「教養」の真の意義とは何か。",
      passage: "近代社会における教養は、往々にして知識の多寡や実用的なスキルの習得と混同されがちである。しかし、真の教養とは蓄積された知識そのものではなく、自らの思考の枠組みを疑い、多様な視点から世界を再解釈する知的な柔軟性である。専門分化が進み、近視眼的な効率性が至上命題とされる現代において、自明とされる常識を根底から問い直す批判的思考こそが、教養が果たすべき真の役割である。",
      options: ["自明とされる常識や自己の枠組みを批判的に問い直す知的な柔軟性", "試験で高い点数を取るための膨大な知識の暗記", "ビジネスで即座に役に立つ実用的なITスキルの習得", "専門分野に特化して他分野との交流を遮断すること"],
      ans: 1,
      exp: "Kultivasi diri (kyouyou) sejati adalah fleksibilitas intelektual untuk merefleksikan dan mempertanyakan asumsi dasar."
    }
  ]
};

// ── INTEGRATED READING POOLS (N2, N1) ──
const INTEGRATED_READING_POOLS: Record<string, PassagePoolItem[]> = {
  N2: [
    {
      prompt: "リモートワークに対するAとBの共通の認識は何か。",
      passage: "【Aの意見】\nリモートワークの導入により通勤ストレスが解消され、個人の裁量で柔軟に時間を使えるようになった。自己管理能力さえあれば、業務効率はオフィス勤務を大幅に上回る。\n\n【Bの意見】\n在宅勤務は移動の手間を省く反面、雑談から生まれる創発的なアイデアや組織への帰属意識を希薄化させるリスクがある。孤立を防ぐための仕組み作りが不可欠だ。",
      options: ["通勤時間が削減されるというメリットがある点", "オフィス勤務のほうが常に優れているという点", "雑談は仕事に無駄であるという点", "誰もが自己管理できるという点"],
      ans: 1,
      exp: "Keduanya mengakui penghematan waktu/beban perjalanan komuter."
    }
  ],
  N1: [
    {
      prompt: "持続可能な成長と環境保護について、筆者AとBの対立点はどこにあるか。",
      passage: "【A】技術革新こそが環境負荷を低減しつつ経済成長を持続させる唯一の道である。再生可能エネルギー技術への投資を加速させるべきだ。\n\n【B】無制限の経済成長を前提とする限り、いかに技術が進歩しようと資源消費の総量を抑えることはできない。成長そのものの再定義と消費の抑制が必要だ。",
      options: ["技術革新による成長持続が可能か、消費抑制と脱成長が必要かという点", "再生可能エネルギーが必要ないという点", "環境保護を完全に諦めるべきという点", "経済活動を一切停止すべきという点"],
      ans: 1,
      exp: "A meyakini inovasi teknologi memungkinkan pertumbuhan hijau, B menuntut redefinisi konsumsi dan pembatasan pertumbuhan."
    }
  ]
};

// ── INFORMATION RETRIEVAL POOLS ──
const INFO_RETRIEVAL_POOLS: Record<string, PassagePoolItem[]> = {
  N5: [
    {
      prompt: "日曜日の午後に 泳ぎたいです。いくらですか。",
      passage: "【市民プールの利用案内】\n・平日（月〜金）：500円（午前 9:00〜12:00）、600円（午後 13:00〜21:00）\n・土・日・祝日：700円（午前・午後とも共通）\n・休館日：毎週火曜日\n※高校生以下は半額です。",
      options: ["700円", "600円", "500円", "無料"],
      ans: 1,
      exp: "Untuk hari Minggu (土・日・祝日) tarifnya adalah 700 yen."
    },
    {
      prompt: "火曜日に プールへ 行くことができますか。",
      passage: "【市民プールの利用案内】\n・平日（月〜金）：500円（午前 9:00〜12:00）、600円（午後 13:00〜21:00）\n・土・日・祝日：700円（午前・午後とも共通）\n・休館日：毎週火曜日\n※高校生以下は半額です。",
      options: ["休館日なので行けない", "午後なら行ける", "700円払えば行ける", "午前中だけ行ける"],
      ans: 1,
      exp: "Hari Selasa adalah hari libur pengelola (休館日：毎週火曜日), sehingga tidak bisa masuk."
    }
  ],
  N4: [
    {
      prompt: "留学生割引を利用して新幹線に乗るための条件は何か。",
      passage: "【JR学割乗車券のご案内】\n・片道の営業キロが101キロ以上の場合、運賃が2割引となります。\n・学校が発行する「学生・生徒旅客運賃割引証」を窓口に提示してください。\n・特急券や指定席券は割引の対象外です。",
      options: ["片道101キロ以上で学校の発行する学割証を提示すること", "特急券も2割引になること", "往復でなくても自動的に割引されること", "学生証だけを見せればよいこと"],
      ans: 1,
      exp: "Jarak minimal 101 km dan wajib menunjukkan sertifikat diskon pelajar dari sekolah."
    }
  ],
  N3: [
    {
      prompt: "粗大ゴミの回収を依頼する際の手順として正しいものはどれか。",
      passage: "【粗大ゴミ受付センター】\n1. 電話またはインターネットで事前予約を行う。\n2. コンビニ等で指定の「粗大ゴミ処理券」を購入し、品物に貼付する。\n3. 収集日当日の朝8時までに指定の排出場所に出す。",
      options: ["予約後に処理券を購入して貼り、当日朝8時までに出す", "予約なしで当日直接処理場へ持ち込む", "ゴミを出してから電話で連絡する", "処理券は不要で現金で支払う"],
      ans: 1,
      exp: "Pesan dulu, beli stiker pemrosesan, tempel, dan keluarkan sebelum pukul 8 pagi."
    }
  ],
  N2: [
    {
      prompt: "セミナールームのキャンセル料が無料になるのはいつまでか。",
      passage: "【貸し会議室キャンセルポリシー】\n・利用日の14日前まで：無料\n・利用日の13日〜7日前まで：利用料の30%\n・利用日の6日〜前日まで：利用料の50%\n・利用日当日：利用料の100%",
      options: ["利用日の14日前まで", "利用日の7日前まで", "利用日前日まで", "当日の午前中まで"],
      ans: 1,
      exp: "Gratis pembatalan hanya berlaku sampai 14 hari sebelum hari H."
    }
  ],
  N1: [
    {
      prompt: "海外留学助成金の応募資格を満たしているのは誰か。",
      passage: "【国際学術交流助成金 募集要項】\n・対象：人文・社会科学分野の博士課程に在籍する35歳以下の研究者。\n・語学要件：TOEFL iBT 90点以上またはIELTS 6.5以上。\n・他の公的助成金との重複受給は不可。",
      options: ["博士課程在籍の30歳でTOEFL 95点、他助成金なしの研究者", "修士課程在籍でIELTS 7.0の研究者", "38歳の博士研究者でTOEFL 100点", "他から奨学金を受給している博士課程学生"],
      ans: 1,
      exp: "Kandidat memenuhi kualifikasi: S3, usia <35, TOEFL >90, dan tanpa beasiswa rangkap."
    }
  ]
};

// ── CHOUKAI TASK BASED POOLS ──
const TASK_BASED_POOLS: Record<string, AudioPoolItem[]> = {
  N5: [
    {
      prompt: "男の人は このあと 何を しますか。",
      script: "男の人と 女の人が 話しています。\n男：「レポートを 書き終わりました。」\n女：「お疲れ様でした。じゃあ、まず コピーを 3まい 取ってください。」\n男：「はい、わかりました。会議室へ 持っていきますか。」\n女：「いいえ、それは わたしが やりますから、コピーを 先生の 机に 置いておいてください。」\n男の人は このあと 何を しますか。",
      options: ["コピーを 3まい 取る", "会議室へ 行く", "レポートを 書く", "先生に 電話を かける"],
      ans: 1,
      exp: "Instruksi pertama dari wanita: tolong fotokopi dulu 3 lembar (まずコピーを3まい取ってください)."
    },
    {
      prompt: "女の人は 明日の 朝 何時に 来ますか。",
      script: "会社で 男の人と 女の人が 明日の 出張について 話しています。\n男：「明日の 電車は 8時発だから、7時45分に 駅に 集合しよう。」\n女：「わかりました。切符は 買ってありますか。」\n男：「まだだよ。だから、10分早く 来て 切符を 買ってくれる？」\n女：「はい、じゃあ 7時35分に 行きますね。」\n女の人は 明日の 朝 何時に 来ますか。",
      options: ["7時35分", "7時45分", "8時00分", "7時00分"],
      ans: 1,
      exp: "Diminta datang 10 menit lebih awal dari 7:45, jadi wanita datang pukul 7:35."
    },
    {
      prompt: "二人は どこで 昼ごはんを 食べますか。",
      script: "男の人と 女の人が 話しています。\n男：「もう 12時ですね。お昼を 食べに行きませんか。」\n女：「そうですね。駅前の ラーメン屋は どうですか。」\n男：「きょうは 火曜日だから 休みですよ。隣の カレー屋に しましょうか。」\n女：「いいですね。そうしましょう。」\n二人は どこで 昼ごはんを 食べますか。",
      options: ["カレー屋", "ラーメン屋", "コンビニ", "会社の食堂"],
      ans: 1,
      exp: "Kedai ramen tutup hari Selasa, jadi mereka sepakat ke kedai kari sebelahnya (カレー屋)."
    },
    {
      prompt: "男の人は 何を 買いに行きますか。",
      script: "夫婦が 話しています。\n女：「今夜は カレーに しようと思うんだけど、人参と 牛乳が ないの。」\n男：「じゃあ、スーパーで 買ってこようか。」\n女：「ありがとう。あ、牛乳は まだ 冷蔵庫に 1本あったわ。人参だけ お願い。」\n男：「わかった、行ってくるよ。」\n男の人は 何を 買いに行きますか。",
      options: ["人参", "牛乳", "人参と 牛乳", "カレールー"],
      ans: 1,
      exp: "Susu ternyata masih ada di kulkas, jadi pria hanya diminta membeli wortel (人参だけお願い)."
    },
    {
      prompt: "学生は 先生に 何を 出しますか。",
      script: "先生と 学生が 話しています。\n先生：「山田くん、作文と 宿題の プリントは できましたか。」\n学生：「作文は 終わりましたが、プリントは 家に 忘れてしまいました。」\n先生：「じゃあ、作文だけ 今 出してください。プリントは 明日の 朝 出してくださいね。」\n学生：「すみません、わかりました。」\n学生は 今 先生に 何を 出しますか。",
      options: ["作文", "宿題のプリント", "作文と プリント", "教科書"],
      ans: 1,
      exp: "Murid lupa membawa lembar tugas, sehingga hanya mengumpulkan karangan (作文だけ)."
    }
  ],
  N4: [
    {
      prompt: "男の学生は このあと まず 何を しますか。",
      script: "大学の 事務室で 男の学生と 係の人が 話しています。\n学生：「奨学金の 申し込みを したいのですが。」\n係：「はい。まず こちらの 申請書に 記入してください。それから、成績証明書と 推薦状を 添えて 窓口に 出してください。」\n学生：「成績証明書は 今 手元に あります。」\n係：「では、申請書を 書いてから 一緒に 出してくださいね。」\n男の学生は このあと まず 何を しますか。",
      options: ["申請書に 記入する", "推薦状を 取りに行く", "成績証明書を コピーする", "学長に 会いに行く"],
      ans: 1,
      exp: "Pertama-tama mengisi formulir aplikasi (まずこちらの申請書に記入してください)."
    }
  ],
  N3: [
    {
      prompt: "女の人は 会議の 前に 何を 準備しなければなりませんか。",
      script: "会社で 上司と 部下が 話しています。\n男：「午後の 企画会議の 準備は 順調かい？」\n女：「はい、プロジェクターの 接続テストは 終わりました。資料も 人数分 印刷して あります。」\n男：「そうか。あと、来賓の 方用の お茶を 用意しておいてくれるかい？」\n女：「かしこまりました。すぐ 手配します。」\n女の人は 会議の 前に 何を 準備しなければなりませんか。",
      options: ["来賓用のお茶", "プロジェクター", "会議資料の印刷", "ホワイトボード"],
      ans: 1,
      exp: "Diminta menyiapkan teh untuk tamu terhormat (来賓の方用のお茶)."
    }
  ],
  N2: [
    {
      prompt: "開発チームは 次に どの 作業に 着手しますか。",
      script: "ソフトウェア開発の ミーティングで リーダーが 話しています。\n「先週の ベータテストで 判明した バグの 修正は 概ね 完了しました。リリース前に セキュリティ監査を 実施する 予定でしたが、外部機関の 都合で 来週に 延期となりました。したがって、前倒しで ユーザーマニュアルの 作成に 取り掛かってください。」\n開発チームは 次に どの 作業に 着手しますか。",
      options: ["ユーザーマニュアルの作成", "セキュリティ監査の実施", "バグの修正", "製品のリリース"],
      ans: 1,
      exp: "Audit keamanan ditunda, jadi pekerjaan dialihkan ke pembuatan manual pengguna."
    }
  ],
  N1: [
    {
      prompt: "取締役会で 最終的に 採択された 方針は どれか。",
      script: "役員会議の 終了後、広報担当者が 報告しています。\n「新規事業への 参入時期について 議論が 分かれましたが、現下の 市場環境の 不確実性を 鑑み、当面は 既存事業の 収益基盤の 強化に 経営資源を 集中させることで 合意に 達しました。M&Aの 案件についても 一旦 凍結となります。」\n取締役会で 最終的に 採択された 方針は どれか。",
      options: ["既存事業の収益基盤強化へのリソース集中", "新規事業への即時参入", "積極的なM&Aの推進", "海外支社の統廃合"],
      ans: 1,
      exp: "Fokus konsolidasi fondasi profitabilitas bisnis eksisting."
    }
  ]
};

// ── CHOUKAI POINT COMPREHENSION POOLS ──
const POINT_POOLS: Record<string, AudioPoolItem[]> = {
  N5: [
    {
      prompt: "男の人は なぜ きのう 会社を 休みましたか。",
      script: "男の人と 女の人が 話しています。\n女：「田中さん、きのうは どうしたんですか。風邪ですか。」\n男：「いいえ、熱は なかったんですが、急に 歯が 痛くなって、歯医者へ 行っていたんです。」\n女：「そうでしたか。大変でしたね。今は 大丈夫ですか。」\n男：「はい、薬を 飲んだので もう 痛くありません。」\n男の人は なぜ きのう 会社を 休みましたか。",
      options: ["歯が 痛かったから", "熱が 出たから", "お腹が 痛かったから", "寝坊したから"],
      ans: 1,
      exp: "Sakit gigi mendadak dan pergi ke dokter gigi (歯が痛くなって)."
    },
    {
      prompt: "女の人は なぜ 新しい アパートに 引っ越しましたか。",
      script: "女の人と 男の人が 話しています。\n男：「新しい アパートは どう？」\n女：「とても 静かで 気に入っているよ。」\n男：「前の アパートは 駅から 近かったのに、どうして 引っ越したの？」\n女：「家賃が 高すぎたのよ。今度の ところは 駅から 少し遠いけど、家賃が 安いの。」\n女の人は なぜ 新しい アパートに 引っ越しましたか。",
      options: ["家賃が 安いから", "駅に 近いから", "部屋が 広いから", "静かだから"],
      ans: 1,
      exp: "Apartemen lama terlalu mahal, jadi pindah karena sewa yang baru lebih murah (家賃が安いの)."
    }
  ],
  N4: [
    {
      prompt: "男の人が 日本語の 勉強で 一番 難しいと 感じているのは 何ですか。",
      script: "留学生が 話しています。\n女：「日本語の 勉強は どうですか。」\n男：「文法や 会話は 楽しいんですが、やっぱり 漢字を 覚えるのが 一番 苦労しています。似た 形が 多すぎます。」\n男の人が 日本語の 勉強で 一番 難しいと 感じているのは 何ですか。",
      options: ["漢字を覚えること", "文法を理解すること", "発音すること", "聞き取ること"],
      ans: 1,
      exp: "Paling kesulitan menghafal kanji (漢字を覚えるのが一番苦労しています)."
    }
  ],
  N3: [
    {
      prompt: "女の人が その カフェを 気に入っている 理由は何ですか。",
      script: "友だち同士が 話しています。\n男：「駅前に できた カフェ、もう 行った？」\n女：「うん、昨日 行ってきたよ。コーヒーの 味も 悪くないけど、何より 窓からの 眺めが 最高なの。緑が 見えて リラックスできるんだ。」\n女の人が その カフェを 気に入っている 理由は何ですか。",
      options: ["窓からの眺めがよくリラックスできるから", "コーヒーの値段が安いから", "ケーキが美味しいから", "店内が静かで勉強しやすいから"],
      ans: 1,
      exp: "Paling menyukai pemandangan hijau dari jendela (窓からの眺めが最高)."
    }
  ],
  N2: [
    {
      prompt: "商品開発で 最も 難航したのは どの 点ですか。",
      script: "開発担当者が インタビューで 語っています。\n「新製品の 開発にあたり、デザインや コストの 削減も 課題でしたが、何より 難しかったのは バッテリーの 持続時間と 本体の 軽量化という 相反する 二つの 要件を 両立させることでした。素材の 選定に 何ヶ月も 費やしました。」\n商品開発で 最も 難航したのは どの 点ですか。",
      options: ["バッテリー寿命と本体軽量化の両立", "デザインの刷新", "製造コストの削減", "量産体制の構築"],
      ans: 1,
      exp: "Menyelaraskan dua tuntutan bertolak belakang: masa pakai baterai dan bobot ringan."
    }
  ],
  N1: [
    {
      prompt: "研究者が 指摘する 都市の 脆弱性の 根本原因は 何か。",
      script: "都市工学の 専門家が 講演しています。\n「現代都市の インフラは 高度に 効率化された 反面、予期せぬ 災害に対する 冗長性が 著しく 削ぎ落とされています。相互依存性が 高すぎるシステムにおいては、一箇所の 機能不全が ドミノ倒しのように 全体へと 波及する リスクを 孕んでいるのです。」\n研究者が 指摘する 都市の 脆弱性の 根本原因は 何か。",
      options: ["効率性を追求しすぎたことによる冗長性の欠如と高い相互依存性", "耐震基準の不備", "老朽化したインフラの放置", "住民の防災意識の低さ"],
      ans: 1,
      exp: "Hilangnya redundansi sistem demi efisiensi ekstrem dan tingginya interdependensi antar-subsistem."
    }
  ]
};

// ── SUMMARY COMPREHENSION POOLS (N3, N2, N1) ──
const SUMMARY_POOLS: Record<string, AudioPoolItem[]> = {
  N3: [
    {
      prompt: "アナウンサーは 主に 何について 話していますか。",
      script: "ラジオで アナウンサーが 話しています。\n「最近、スマートフォンを 見ながら 歩く 人が 増えています。階段で 転倒したり、他の 人と ぶつかったりする 事故が 多発しており、鉄道各社や 警察では 注意を 呼びかけています。歩行中の スマホ操作は 控えましょう。」\nアナウンサーは 主に 何について 話していますか。",
      options: ["歩きスマホによる事故の増加と注意喚起", "新しいスマートフォンの機能", "電車の混雑状況", "階段の安全基準"],
      ans: 1,
      exp: "Berita tentang meningkatnya kecelakaan akibat jalan sambil main HP dan himbauan pencegahan."
    }
  ],
  N2: [
    {
      prompt: "講演者は 何について 主張していますか。",
      script: "大学の 講義で 教授が 話しています。\n「ワークライフバランスという 言葉が 定着しましたが、仕事と プライベートを 単に 二項対立で 捉えるのではなく、双方が 互いに 好影響を 与え合う『ワークライフシナジー』という 視点が 重要です。プライベートでの 学びが 仕事の 創造性を 高めるのです。」\n講演者は 何について 主張していますか。",
      options: ["仕事と生活が相互に高め合うシナジー効果の重要性", "労働時間を極限まで削減すべきだということ", "プライベートを犠牲にして働くべきだということ", "残業代の支払い義務について"],
      ans: 1,
      exp: "Pentingnya konsep 'Work-Life Synergy' di mana kehidupan pribadi memperkaya kreativitas kerja."
    }
  ],
  N1: [
    {
      prompt: "評論家の 主な 論点は 何か。",
      script: "テレビの 討論番組で 評論家が 述べています。\n「デジタルトランスフォーメーションの本質は、既存業務のデジタル置換にとどまらず、組織の企業文化そのものを変革することにあります。トップダウンによる意識改革と、失敗を恐れないアジャイルな組織風土が醸成されなければ、いかに最新のITツールを導入しても真の価値創造には至りません。」\n評論家の 主な 論点は 何か。",
      options: ["DXの本質はITツール導入ではなく組織文化そのものの変革にあること", "最新ITツールの導入コストを削減すること", "ボトムアップによる業務改善の限界", "紙の書類を完全に撤廃すること"],
      ans: 1,
      exp: "Esensi transformasi digital adalah transformasi budaya organisasi itu sendiri."
    }
  ]
};

// ── QUICK RESPONSE POOLS ──
const QUICK_RESPONSE_POOLS: Record<string, AudioPoolItem[]> = {
  N5: [
    { prompt: "最もよい返事を選んでください。", script: "いってきます。", options: ["いってらっしゃい。", "おかえりなさい。", "ただいま。", "はじめまして。"], ans: 1, exp: "Balasan untuk「いってきます」(saya berangkat) adalah「いってらっしゃい」(hati-hati di jalan)." },
    { prompt: "最もよい返事を選んでください。", script: "ごちそうさまでした。", options: ["おそまつさまでした。", "いただきます。", "ごめんなさい。", "どういたしまして。"], ans: 1, exp: "Balasan santun tuan rumah untuk「ごちそうさまでした」adalah「お粗末様でした」." },
    { prompt: "最もよい返事を選んでください。", script: "お名前は 何ですか。", options: ["山田です。", "日本人です。", "学生です。", "元気です。"], ans: 1, exp: "Menanyakan nama (お名前は), dijawab dengan nama (山田です)." },
    { prompt: "最もよい返事を選んでください。", script: "すみません、ペンを 忘れてしまいました。", options: ["これ、使ってください。", "ペンです。", "おめでとうございます。", "どうもありがとう。"], ans: 1, exp: "Merelakan pinjaman saat lawan bicara lupa membawa pena." },
    { prompt: "最もよい返事を選んでください。", script: "コーヒーは いかがですか。", options: ["はい、いただきます。", "いいえ、コーヒーです。", "ごちそうさまでした。", "さようなら。"], ans: 1, exp: "Menerima tawaran minuman dengan sopan: はい、いただきます." },
    { prompt: "最もよい返事を選んでください。", script: "お疲れ様でした。", options: ["お疲れ様でした。", "失礼します。", "おめでとう。", "いらっしゃいませ。"], ans: 1, exp: "Balasan umum sesama rekan kerja: お疲れ様でした." },
  ],
  N4: [
    { prompt: "最もよい返事を選んでください。", script: "この荷物、手伝いましょうか。", options: ["助かります、お願いします。", "どういたしまして。", "手伝いました。", "いいえ、荷物です。"], ans: 1, exp: "Menerima tawaran bantuan: 助かります、お願いします." },
    { prompt: "最もよい返事を選んでください。", script: "明日、雨が降るそうですよ。", options: ["じゃあ、傘を持っていきます。", "雨でしたね。", "よかったですね。", "雨を飲みます。"], ans: 1, exp: "Merespons kabar cuaca: kalau begitu bawa payung." },
  ],
  N3: [
    { prompt: "最もよい返事を選んでください。", script: "プレゼン、大成功だったそうですね。", options: ["おかげさまで、うまくいきました。", "とんでもないことです。", "ご馳走様でした。", "今から始めます。"], ans: 1, exp: "Merespons ucapan selamat atas presentasi: berkat bantuan Anda berjalan lancar." },
    { prompt: "最もよい返事を選んでください。", script: "本日の会議、少々遅れそうなのですが。", options: ["気をつけてお越しください。", "遅れました。", "お疲れ様でした。", "早く帰ってください。"], ans: 1, exp: "Tanggapan sopan saat kolega mengabarkan akan terlambat: 気をつけてお越しください." },
  ],
  N2: [
    { prompt: "最もよい返事を選んでください。", script: "部長、先ほどの件、折り返しお電話いただけますでしょうか。", options: ["承知いたしました。すぐにおかけ直しします。", "お電話をいただきました。", "電話を切ってください。", "結構です。"], ans: 1, exp: "Keigo bisnis: 承知いたしました。すぐにおかけ直しします." },
  ],
  N1: [
    { prompt: "最もよい返事を選んでください。", script: "先生の論文、拝読いたしましたが、誠に示唆に富む内容で感銘を受けました。", options: ["そう言っていただけると光栄です。", "読んであげました。", "つまらないものです。", "お気になさらないでください。"], ans: 1, exp: "Jawaban bersahaja menerima pujian akademik: そう言っていただけると光栄です." },
  ]
};

// ── INTEGRATED LISTENING POOLS (N2, N1) ──
const INTEGRATED_LISTENING_POOLS: Record<string, AudioPoolItem[]> = {
  N2: [
    {
      prompt: "二人は どの 広告プランを 採用することに しましたか。",
      script: "会社の マーケティング部門で 二人の 社員が 話しています。\n男：「新商品の プロモーション、ウェブ広告と インフルエンサー施策、どちらを 優先すべきか悩むね。」\n女：「予算には 限りがあるけれど、若年層への 訴求力を 考えると、インフルエンサーを 起用した SNS動画キャンペーンのほうが 費用対効果が 高いと 思います。」\n男：「確かにそうだね。では、今回は そちらの プランに 絞って 展開しよう。」\n二人は どの 広告プランを 採用することに しましたか。",
      options: ["インフルエンサーを起用したSNS動画プラン", "検索連動型ウェブ広告プラン", "テレビCMプラン", "新聞折り込みチラシプラン"],
      ans: 1,
      exp: "Keduanya sepakat memilih kampanye influencer video SNS."
    }
  ],
  N1: [
    {
      prompt: "経営陣が 最終的に 選択した 拠点移転先は どこか。",
      script: "役員3名が 本社オフィスの 移転先候補について 議論しています。\nA氏：「都心の 再開発エリアは ブランド力は 抜群だが、賃料が 膨大だ。」\nB氏：「郊外の テックパークなら コストを 半減でき、敷地も 広く 拡張性が ある。」\nC氏：「しかし、社員の 通勤利便性と 人材採用力を 勘案すれば、両者の中間である ターミナル駅直結の 複合ビルが 最適解ではないか。」\nA氏・B氏：「確かに、総合的に 見れば それが 最も バランスが 取れているな。」\n経営陣が 最終的に 選択した 拠点移転先は どこか。",
      options: ["ターミナル駅直結の複合ビル", "都心の超高級再開発エリア", "郊外の広大なテックパーク", "現オフィスの契約延長"],
      ans: 1,
      exp: "Ketiganya sepakat pada gedung multifungsi terintegrasi stasiun terminal."
    }
  ]
};

// ── MAIN GENERATOR PIPELINE ──
export function generatePackage(level: JlptCode, variantIndex: number): JlptPackage {
  const planItems = PLAN[level];
  const slug = `jlpt-${level.toLowerCase()}-mock-${pad(variantIndex)}`;
  const title = `Simulasi JLPT ${level} - Paket ${pad(variantIndex)}`;

  // Group planItems by sectionType
  const sectionMap = new Map<string, PlanItem[]>();
  for (const item of planItems) {
    const list = sectionMap.get(item.sectionType) || [];
    list.push(item);
    sectionMap.set(item.sectionType, list);
  }

  const sections: {
    sectionType: string;
    questions: QuestionSpec[];
  }[] = [];

  for (const [sectionType, items] of sectionMap.entries()) {
    const questions: QuestionSpec[] = [];
    let qNumber = 1;

    for (const item of items) {
      for (let i = 0; i < item.count; i++) {
        const q = createQuestion(level, variantIndex, sectionType, item.questionType, i, qNumber);
        questions.push(q);
        qNumber++;
      }
    }

    sections.push({
      sectionType,
      questions,
    });
  }

  const pkg: JlptPackage = {
    examSlug: slug,
    levelCode: level,
    variantIndex,
    title,
    sections,
  };

  // Validate package with Zod
  const validated = jlptPackageSchema.parse(pkg);
  return validated;
}

// Generate all packages
export async function run() {
  console.log("=== MEMBANGUN BANK SOAL SIMULASI JLPT (> 1,000 SOAL) ===");
  const targets: { level: JlptCode; variants: number[] }[] = [
    { level: "N5", variants: [1, 3, 4] }, // paket 2 already exists
    { level: "N4", variants: [1, 3, 4] }, // paket 2 already exists
    { level: "N3", variants: [1, 3] },    // paket 2 already exists
    { level: "N2", variants: [1, 3] },    // paket 2 already exists
    { level: "N1", variants: [1, 3] },    // paket 2 already exists
  ];

  let createdPackages = 0;
  let totalNewQuestions = 0;

  for (const t of targets) {
    const dir = join(BANK_DIR, t.level.toLowerCase());
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

    for (const v of t.variants) {
      const pkg = generatePackage(t.level, v);
      const filePath = join(dir, `paket-${pad(v)}.json`);
      writeFileSync(filePath, JSON.stringify(pkg, null, 2), "utf8");

      const qCount = pkg.sections.reduce((sum, s) => sum + s.questions.length, 0);
      createdPackages++;
      totalNewQuestions += qCount;
      console.log(`[OK] ${t.level} Paket ${pad(v)}: ${qCount} soal ditulis ke ${filePath}`);
    }
  }

  console.log(`\nSelesai! Berhasil membuat ${createdPackages} paket baru (${totalNewQuestions} soal).`);
}

void run().catch((err) => {
  console.error("Gagal membuat paket:", err);
  process.exit(1);
});
