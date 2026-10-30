/**
 * Level JLPT N1: 5 bab — ungkapan klasik, yojijukugo & retorika publik, kondisi absolut, debat kebijakan,
 * serta wacana editorial. Sumber: spesifikasi "Modul Implementasi Level JLPT N1". Nilai lulus tiap bab 80.
 * Furigana none: teks Jepang ditulis dengan kanji tanpa furigana.
 */
import type { KChapter, KScenario } from "./kurikulumData";
import { dengar, pg, susun, tulis, ucap } from "./kurikulumHelpers";

const PASS = 80;
const MODULE_SASTRA = "Bahasa Sastra & Akademis";
const MODULE_DEBAT = "Debat, Wacana & Retorika Publik";

export const KURIKULUM_N1: KChapter[] = [
  {
    key: "n1:bab-1",
    level: "N1",
    module: MODULE_SASTRA,
    passScore: PASS,
    title: "Ungkapan Klasik & Ragam Sastra (文語的表現)",
    explanation: "Pola turunan bahasa klasik yang sering muncul di tajuk rencana dan karya sastra: が早いか / や否や, なりに / なりの, dan んがため(に).",
    blocks: [
      {
        type: "teks",
        title: "Tiga pola bernuansa klasik",
        body: "V-kamus + が早いか / や否や — \"begitu … seketika itu juga …\". Lebih sastrawi daripada とたん; kejadian kedua tidak bisa berupa kehendak pembicara.\nN / A + なりに・なりの — \"sesuai kapasitasnya (yang terbatas)\": menghargai usaha pihak yang tidak sempurna.\nV-ない (tanpa ない) + んがため(に) — \"demi mencapai …\" (tujuan besar). する → せんがため.",
      },
      {
        type: "teks",
        title: "Kutipan bergaya sastra",
        body: "終電のドアが開くが早いか、乗客はなだれ込んだ。窓の外では、街の灯が漸次遠のいていく。彼女は躊躇することなく、手帳を開いた。夢を実現せんがため、昼夜を問わず書き続けてきた原稿である。拙いながらも、彼女なりに精一杯紡いだ言葉だった。\n\n> Begitu pintu kereta terakhir terbuka, para penumpang langsung menyerbu masuk. Di luar jendela, lampu kota perlahan menjauh. Tanpa ragu, ia membuka bukunya — naskah yang terus ditulisnya siang dan malam demi mewujudkan mimpinya. Meski masih kasar, itulah kata-kata yang ia rangkai sebaik-baiknya dengan kemampuannya.",
      },
      {
        type: "tips",
        body: "Ungkapan ini jarang dipakai dalam percakapan sehari-hari, tetapi sering keluar di dokkai N1, novel, dan pidato. Kuasai dulu pengenalan maknanya, baru pemakaian aktif dalam tulisan formal.",
      },
    ],
    vocab: [
      ["凌駕", "りょうが", "melampaui, mengungguli"],
      ["漸次", "ぜんじ", "secara bertahap"],
      ["躊躇", "ちゅうちょ", "ragu-ragu"],
      ["截然", "せつぜん", "jelas, tegas (terpisah)"],
      ["瞬時", "しゅんじ", "seketika"],
      ["抑制", "よくせい", "pengendalian, penahanan"],
    ],
    kanji: [
      ["瞬", "シュン", "またた(く)", "berkedip; sekejap"],
      ["奔", "ホン", "", "berlari kencang; bebas"],
      ["凌", "リョウ", "しの(ぐ)", "melampaui; bertahan"],
      ["漸", "ゼン", "", "perlahan, bertahap"],
      ["抑", "ヨク", "おさ(える)", "menahan, menekan"],
    ],
    grammar: [
      {
        pattern: "V-kamus + が早いか / や否や",
        explanation: "\"Begitu … seketika itu juga …\" — kejadian beruntun yang sangat cepat, ragam tulisan/sastra.",
        ex: "ドアが開くが早いか、乗客はなだれ込んだ。",
        tr: "Begitu pintu terbuka, para penumpang langsung menyerbu masuk.",
      },
      {
        pattern: "N + なりに / なりの",
        explanation: "\"Sesuai dengan kapasitas/kemampuannya (yang terbatas)\".",
        ex: "彼なりに精一杯考えた結果だ。",
        tr: "Itu hasil ia berpikir sebaik-baiknya dengan caranya sendiri.",
      },
      {
        pattern: "V-ない(tanpa ない) + んがため(に)",
        explanation: "\"Demi mencapai …\" — tujuan besar dengan tekad kuat. する → せんがため.",
        ex: "夢を実現せんがため、昼夜を問わず努力した。",
        tr: "Demi mewujudkan mimpinya, ia berusaha siang dan malam.",
      },
    ],
    quiz: [
      pg("ドアが開く＿＿、乗客はなだれ込んだ。", ["が早いか", "なりに", "んがため", "をもって"], "が早いか"),
      pg("ベルが鳴る＿＿、学生たちは教室を飛び出した。", ["や否や", "なりに", "を限りに", "ばこそ"], "や否や"),
      pg("彼＿＿精一杯考えた結果だ。", ["なりに", "が早いか", "たる", "まじき"], "なりに"),
      pg("夢を実現せ＿＿、昼夜を問わず努力した。", ["んがため", "んばかり", "ずにはおかない", "まじく"], "んがため"),
      pg("Bentuk んがため dari する:", ["せんがため", "しんがため", "するんがため", "さんがため"], "せんがため"),
      pg("Kata 躊躇 dibaca…", ["ちゅうちょ", "ちゅうじょ", "じゅうちょ", "ちょうちょ"], "ちゅうちょ"),
      pg("Kata 凌駕する artinya…", ["melampaui, mengungguli", "menahan diri", "ragu-ragu", "secara bertahap"], "melampaui, mengungguli"),
      dengar("彼女は躊躇することなく、手帳を開いた", "Bagaimana ia membuka bukunya?", ["Tanpa ragu", "Dengan takut", "Perlahan-lahan", "Sambil menangis"], "Tanpa ragu"),
      tulis("osaeru", "抑える", "menahan (pakai kanji 抑)"),
      tulis("shinogu", "凌ぐ", "melampaui; bertahan (pakai kanji 凌)"),
      susun("Demi mencapai tujuan, ia bekerja tanpa istirahat.", ["目的を", "達成せん", "がため", "休まずに", "働いた"], ["なりに"]),
      ucap("私なりに精一杯努力いたします", ["わたしなりにせいいっぱいどりょくいたします"]),
    ],
  },
  {
    key: "n1:bab-2",
    level: "N1",
    module: MODULE_SASTRA,
    passScore: PASS,
    title: "Peribahasa Empat Karakter (四字熟語) & Retorika Publik",
    explanation: "Yojijukugo untuk memperkaya pidato dan tulisan formal, serta pola resmi をもって dan を皮切りに.",
    blocks: [
      {
        type: "teks",
        title: "Yojijukugo pilihan",
        body: "一期一会 (いちごいちえ) — setiap pertemuan hanya terjadi sekali; hargailah.\n試行錯誤 (しこうさくご) — coba-coba dan memperbaiki kesalahan (trial and error).\n十人十色 (じゅうにんといろ) — setiap orang berbeda.\n一石二鳥 (いっせきにちょう) — sekali dayung dua pulau terlampaui.\n温故知新 (おんこちしん) — mempelajari yang lama untuk memahami yang baru.\n臨機応変 (りんきおうへん) — menyesuaikan diri dengan keadaan.",
      },
      {
        type: "teks",
        title: "Sambutan penutupan acara",
        body: "皆様、本日は誠にありがとうございました。三年前、東京での公演を皮切りに始まった本プロジェクトは、試行錯誤を重ねながら、全国二十都市へと広がってまいりました。皆様との一期一会のご縁に、心より感謝申し上げます。本日をもちまして、本会を粛々と閉会いたします。\n\n> Hadirin sekalian, terima kasih banyak atas hari ini. Proyek yang dimulai dengan pertunjukan di Tokyo tiga tahun lalu ini, melalui banyak trial and error, telah meluas ke 20 kota. Kami berterima kasih sedalam-dalamnya atas pertemuan berharga dengan Anda semua. Dengan ini, acara kami tutup dengan khidmat.",
      },
    ],
    vocab: [
      ["一期一会", "いちごいちえ", "setiap pertemuan hanya sekali"],
      ["試行錯誤", "しこうさくご", "trial and error"],
      ["披露", "ひろう", "memperkenalkan, memamerkan"],
      ["粛々と", "しゅくしゅくと", "dengan khidmat, tenang dan tertib"],
      ["捉える", "とらえる", "menangkap (makna), memahami"],
      ["臨機応変", "りんきおうへん", "fleksibel sesuai keadaan"],
    ],
    kanji: [
      ["錯", "サク", "", "kacau, keliru"],
      ["粛", "シュク", "", "khidmat, tertib"],
      ["披", "ヒ", "", "membuka, menyingkap"],
      ["露", "ロ", "つゆ", "embun; terbuka"],
      ["捉", "ソク", "とら(える)", "menangkap"],
    ],
    grammar: [
      {
        pattern: "〜をもって",
        explanation: "\"Dengan / terhitung …\" dalam pengumuman resmi; juga \"dengan menggunakan …\".",
        ex: "本日をもって、本会を終了いたします。",
        tr: "Terhitung hari ini, pertemuan ini kami akhiri.",
      },
      {
        pattern: "〜を皮切りに(して)",
        explanation: "\"Diawali dengan …\", lalu berlanjut meluas ke hal-hal lain.",
        ex: "東京公演を皮切りに、全国ツアーが始まる。",
        tr: "Diawali pertunjukan di Tokyo, tur nasional dimulai.",
      },
      {
        pattern: "四字熟語 dalam kalimat",
        explanation: "Yojijukugo dipakai sebagai kata benda (+の/を) atau keterangan (+に).",
        ex: "試行錯誤の末、新しい製品が完成した。",
        tr: "Setelah melalui trial and error, produk baru pun selesai.",
      },
    ],
    quiz: [
      pg("Arti 一期一会:", ["Setiap pertemuan hanya sekali, hargailah", "Sekali dayung dua pulau terlampaui", "Setiap orang berbeda", "Mempelajari yang lama untuk yang baru"], "Setiap pertemuan hanya sekali, hargailah"),
      pg("新しい製品は＿＿の末に完成した。", ["試行錯誤", "一期一会", "十人十色", "温故知新"], "試行錯誤"),
      pg("状況に応じて＿＿に対応する。", ["臨機応変", "一石二鳥", "一期一会", "十人十色"], "臨機応変"),
      pg("本日＿＿、本会を終了いたします。", ["をもって", "を皮切りに", "を限りに", "と相まって"], "をもって"),
      pg("東京公演＿＿、全国ツアーが始まる。", ["を皮切りに", "をもって", "ならでは", "をよそに"], "を皮切りに"),
      pg("Kata 披露 dibaca…", ["ひろう", "ひろ", "はろう", "ひりょう"], "ひろう"),
      dengar("人の考えは十人十色です", "Maksudnya:", ["Pikiran setiap orang berbeda-beda", "Sepuluh orang sepakat", "Pikiran orang mudah berubah", "Orang harus berpikir sepuluh kali"], "Pikiran setiap orang berbeda-beda"),
      dengar("本日をもちまして、本会を粛々と閉会いたします", "Apa yang diumumkan?", ["Acara ditutup dengan khidmat hari ini", "Acara diundur", "Acara baru dimulai", "Acara dipindah tempat"], "Acara ditutup dengan khidmat hari ini"),
      tulis("hirou", "披露", "memperkenalkan, memamerkan (tulis kanjinya)"),
      tulis("toraeru", "捉える", "menangkap (pakai kanji 捉)"),
      susun("Dengan ini rapat ditutup.", ["これを", "もって", "会議を", "終了します"], ["皮切りに"]),
      ucap("一期一会のご縁に心より感謝申し上げます", ["いちごいちえのごえんにこころよりかんしゃもうしあげます"]),
    ],
  },
  {
    key: "n1:bab-3",
    level: "N1",
    module: MODULE_SASTRA,
    passScore: PASS,
    title: "Kondisi Absolut & Batasan Ketat (絶対条件と限界)",
    explanation: "Keterpaksaan karena keadaan (を余儀なくされる), derajat ekstrem (極まる / 極まりない), dan batas akhir (を限りに).",
    blocks: [
      {
        type: "teks",
        title: "Berita: proyek dihentikan",
        body: "記録的な豪雨の影響で、建設中の橋の工事は中断を余儀なくされた。住民の生活は困窮を極め、避難所では忍耐の日々が続いている。行政の対応の遅さは、無責任極まりないとの批判も出ている。市長は「本日を限りに、従来の体制を改める」と毅然とした態度で述べた。\n\n> Akibat hujan lebat yang memecahkan rekor, pembangunan jembatan terpaksa dihentikan. Kehidupan warga sangat sulit, dan di pengungsian hari-hari penuh kesabaran terus berlanjut. Lambatnya respons pemerintah dikritik sebagai sangat tidak bertanggung jawab. Wali kota dengan tegas menyatakan, \"Mulai hari ini, sistem lama kami ubah.\"",
      },
      {
        type: "teks",
        title: "Bentuk dan nuansa",
        body: "N + を余儀なくされる — \"terpaksa …\" (subjek korban keadaan). を余儀なくさせる — \"memaksa …\" (subjek penyebab).\nNa-adj + 極まる / 極まりない — \"sangat sekali\"; keduanya bermakna sama: 失礼極まりない = 失礼極まる.\nN + を限りに — \"terakhir pada / mulai saat ini tidak lagi …\": 今日を限りに.",
      },
    ],
    vocab: [
      ["余儀ない", "よぎない", "tidak terhindarkan"],
      ["困窮", "こんきゅう", "kesulitan hidup, kemiskinan"],
      ["忍耐", "にんたい", "kesabaran"],
      ["困惑", "こんわく", "kebingungan"],
      ["毅然", "きぜん", "tegas, teguh"],
      ["中断", "ちゅうだん", "penghentian sementara"],
    ],
    kanji: [
      ["儀", "ギ", "", "upacara; perkara"],
      ["窮", "キュウ", "きわ(める)", "terdesak; ujung"],
      ["忍", "ニン", "しの(ぶ)", "menahan, bersabar"],
      ["惑", "ワク", "まど(う)", "bingung"],
      ["毅", "キ", "", "teguh"],
    ],
    grammar: [
      {
        pattern: "〜を余儀なくされる",
        explanation: "\"Terpaksa harus …\" akibat kondisi di luar kendali (bencana, krisis).",
        ex: "悪天候のため、計画の変更を余儀なくされた。",
        tr: "Karena cuaca buruk, rencananya terpaksa diubah.",
      },
      {
        pattern: "〜極まる / 〜極まりない",
        explanation: "\"Sangat … sekali\" — derajat paling ekstrem; biasanya penilaian negatif yang keras.",
        ex: "彼の態度は失礼極まりない。",
        tr: "Sikapnya sungguh sangat tidak sopan.",
      },
      {
        pattern: "〜を限りに",
        explanation: "\"Terakhir pada … / mulai saat itu tidak lagi\".",
        ex: "今日を限りに、無駄遣いをやめることにした。",
        tr: "Mulai hari ini, aku memutuskan berhenti boros.",
      },
    ],
    quiz: [
      pg("悪天候のため、計画の変更を＿＿。", ["余儀なくされた", "余儀なくした", "余儀なかった", "余儀にされた"], "余儀なくされた"),
      pg("彼の態度は失礼＿＿。", ["極まりない", "極まらない", "限りない", "ならない"], "極まりない"),
      pg("今日を＿＿、無駄遣いをやめることにした。", ["限りに", "皮切りに", "もって", "めぐって"], "限りに"),
      pg("Kalimat yang benar:", ["災害により、工事の中止を余儀なくされた。", "私は工事の中止を余儀なくされたい。", "工事の中止を余儀なくしてください。", "余儀なく工事が楽しかった。"], "災害により、工事の中止を余儀なくされた。"),
      pg("Kata 毅然 artinya…", ["tegas, teguh", "bingung", "sabar", "terdesak"], "tegas, teguh"),
      pg("Kata 困窮 dibaca…", ["こんきゅう", "こんきょう", "こんくう", "こんぎゅう"], "こんきゅう"),
      dengar("行政の対応の遅さは、無責任極まりないとの批判も出ている", "Apa kritiknya?", ["Respons pemerintah sangat tidak bertanggung jawab", "Pemerintah merespons sangat cepat", "Warga tidak sabar", "Wali kota mengundurkan diri"], "Respons pemerintah sangat tidak bertanggung jawab"),
      tulis("shinobu", "忍ぶ", "menahan, bersabar (pakai kanji 忍)"),
      tulis("madou", "惑う", "bingung (pakai kanji 惑)"),
      susun("Mulai hari ini saya berhenti merokok.", ["今日を", "限りに", "たばこを", "やめる"], ["皮切りに"]),
      ucap("毅然とした態度で臨みます", ["きぜんとしたたいどでのぞみます"]),
    ],
  },
  {
    key: "n1:bab-4",
    level: "N1",
    module: MODULE_DEBAT,
    passScore: PASS,
    title: "Debat Kebijakan Publik & Strategi Bisnis Global",
    explanation: "Menyusun argumen kritis berbasis data dengan ばこそ, と相まって, dan を禁じ得ない.",
    blocks: [
      {
        type: "dialog",
        title: "Forum strategi global",
        body: "司会: AI導入について、慎重論も根強いようですが。\n> Tampaknya pendapat yang berhati-hati soal penerapan AI juga masih kuat.\nブディ: リスクを理解していればこそ、段階的な導入を提案しているのです。\n> Justru karena kami memahami risikonya, kami mengusulkan penerapan bertahap.\nブディ: 円安と人手不足が相まって、自動化はもはや避けて通れない課題です。\n> Yen yang melemah berpadu dengan kekurangan tenaga kerja, otomatisasi kini menjadi persoalan yang tak bisa dihindari.\n司会: しかし、雇用への影響を懸念する声には、どう応えますか。\n> Namun, bagaimana Anda menjawab suara yang khawatir akan dampaknya pada lapangan kerja?\nブディ: 現場の不安には、正直なところ同情を禁じ得ません。だからこそ、再教育の仕組みを同時に醸成すべきだと考えます。\n> Terus terang, saya tak bisa menahan simpati pada kecemasan di lapangan. Justru karena itu, menurut saya sistem pelatihan ulang harus dibangun bersamaan.",
      },
      {
        type: "teks",
        title: "Struktur argumen debat",
        body: "1. 主張 (klaim): 〜すべきだと考えます。\n2. 根拠 (dasar): データによれば / 〜と相まって.\n3. 反論への予防 (antisipasi bantahan): 確かに〜という懸念はあるが、〜ばこそ….\n4. 結論 (kesimpulan): 以上の理由から….\n\n論点 (pokok persoalan) harus jelas sejak awal; debat yang 紛糾 (kacau) biasanya karena 概念 tidak disepakati.",
      },
    ],
    vocab: [
      ["醸成", "じょうせい", "menumbuhkan (suasana, kesadaran)"],
      ["紛糾", "ふんきゅう", "kekacauan, kericuhan (debat)"],
      ["梗概", "こうがい", "ringkasan (sinopsis)"],
      ["概念", "がいねん", "konsep"],
      ["哲学", "てつがく", "filsafat"],
      ["論点", "ろんてん", "pokok persoalan"],
    ],
    kanji: [
      ["醸", "ジョウ", "かも(す)", "menyeduh; menimbulkan"],
      ["糾", "キュウ", "ただ(す)", "mengusut; memilin"],
      ["梗", "コウ", "", "garis besar; tersumbat"],
      ["概", "ガイ", "", "garis besar"],
      ["哲", "テツ", "", "filsafat, bijak"],
    ],
    grammar: [
      {
        pattern: "〜ばこそ",
        explanation: "\"Justru karena …\" — menekankan alasan yang positif/tulus.",
        ex: "将来を想えばこそ、今真剣に学ぶのだ。",
        tr: "Justru karena memikirkan masa depan, sekarang aku belajar dengan sungguh-sungguh.",
      },
      {
        pattern: "〜と相まって",
        explanation: "\"Berpadu dengan …\" — dua faktor saling memperkuat menghasilkan efek.",
        ex: "素晴らしい演出が、音楽と相まって感動を呼ぶ。",
        tr: "Penyutradaraan yang luar biasa, berpadu dengan musik, membangkitkan haru.",
      },
      {
        pattern: "〜を禁じ得ない",
        explanation: "\"Tidak dapat menahan (perasaan) …\": 同情・驚き・怒り・感銘を禁じ得ない.",
        ex: "彼の偉大な業績に、感銘を禁じ得なかった。",
        tr: "Saya tak dapat menahan rasa kagum pada pencapaiannya yang besar.",
      },
    ],
    quiz: [
      pg("将来を想え＿＿、今真剣に学ぶのだ。", ["ばこそ", "ばかりか", "どころか", "ものを"], "ばこそ"),
      pg("素晴らしい演出が、音楽と＿＿感動を呼ぶ。", ["相まって", "ともなって", "限りに", "皮切りに"], "相まって"),
      pg("彼の偉大な業績に、感銘を＿＿。", ["禁じ得なかった", "禁じなかった", "得なかった", "余儀なくされた"], "禁じ得なかった"),
      pg("Urutan argumen yang tepat:", ["主張 → 根拠 → 反論への予防 → 結論", "結論 → 主張 → 根拠 → 反論", "根拠 → 結論 → 主張 → 反論", "反論 → 主張 → 結論 → 根拠"], "主張 → 根拠 → 反論への予防 → 結論"),
      pg("Kata 紛糾 artinya…", ["kekacauan (debat)", "ringkasan", "konsep", "kesimpulan"], "kekacauan (debat)"),
      pg("Kata 醸成 dibaca…", ["じょうせい", "じょうせ", "ぞうせい", "じょうけい"], "じょうせい"),
      dengar("リスクを理解していればこそ、段階的な導入を提案しているのです", "Mengapa ia mengusulkan penerapan bertahap?", ["Justru karena memahami risikonya", "Karena tidak tahu risikonya", "Karena biayanya murah", "Karena atasan memerintahkan"], "Justru karena memahami risikonya"),
      tulis("kamosu", "醸す", "menimbulkan (suasana), pakai kanji 醸"),
      tulis("tadasu", "糾す", "mengusut (pakai kanji 糾)"),
      susun("Saya tak dapat menahan rasa simpati.", ["同情を", "禁じ", "得ません"], ["余儀なく"]),
      ucap("だからこそ、段階的な導入を提案いたします", ["だからこそ、だんかいてきなどうにゅうをていあんいたします"]),
    ],
  },
  {
    key: "n1:bab-5",
    level: "N1",
    module: MODULE_DEBAT,
    passScore: PASS,
    title: "Nuansa Sastra, Analisis Wacana & Redaksi Editorial",
    explanation: "Menganalisis tajuk rencana dan nada tersembunyi, serta pola status-dan-kewajiban: たる者, まじき, dan におかれましては.",
    blocks: [
      {
        type: "teks",
        title: "社説（抜粋）",
        body: "政治家たる者、国民の信頼の上に立っていることを忘れてはならない。今回の献金問題は、公職にある者としてあるまじき行為であり、法の遵守を説く立場からして到底看過できない。関係者におかれましては、謙虚に事実を説明し、初志を貫く覚悟を示していただきたい。\n\n> Seorang politisi tidak boleh lupa bahwa ia berdiri di atas kepercayaan rakyat. Kasus sumbangan kali ini adalah tindakan yang tidak pantas bagi pemegang jabatan publik, dan dari posisi yang menganjurkan kepatuhan hukum sama sekali tidak bisa dibiarkan. Kami berharap pihak terkait menjelaskan fakta dengan rendah hati dan menunjukkan tekad memegang teguh niat awalnya.",
      },
      {
        type: "teks",
        title: "Membaca nada (トーン)",
        body: "• 〜てはならない・〜まじき — kecaman moral yang keras.\n• 到底〜できない — penolakan mutlak.\n• 〜ていただきたい — tuntutan yang dibungkus sopan; dalam editorial nadanya tegas, bukan permohonan.\n• 行間を読む — \"membaca yang tersirat\": perhatikan apa yang TIDAK ditulis penulis.",
      },
      {
        type: "teks",
        title: "におかれましては",
        body: "N + におかれましては — penanda topik yang sangat hormat untuk pihak yang dihormati (\"bagi Bapak/Ibu …\"), lazim di surat resmi dan sambutan: 皆様におかれましては、ますますご清栄のこととお喜び申し上げます.\nBerbeda dengan 〜に置かれても (\"meski ditempatkan dalam …\"): いかなる困難な状況に置かれても、初志を貫く.",
      },
    ],
    vocab: [
      ["謙虚", "けんきょ", "rendah hati"],
      ["貫く", "つらぬく", "memegang teguh, menembus"],
      ["遵守", "じゅんしゅ", "kepatuhan (hukum/aturan)"],
      ["粛然", "しゅくぜん", "khidmat, hening"],
      ["看過", "かんか", "membiarkan, mengabaikan"],
      ["行間", "ぎょうかん", "yang tersirat (antar baris)"],
    ],
    kanji: [
      ["謙", "ケン", "", "rendah hati"],
      ["虚", "キョ・コ", "むな(しい)", "hampa; rendah hati"],
      ["貫", "カン", "つらぬ(く)", "menembus, konsisten"],
      ["遵", "ジュン", "", "mematuhi"],
      ["粛", "シュク", "", "khidmat, tertib"],
    ],
    grammar: [
      {
        pattern: "N + たる者",
        explanation: "\"Sebagai seorang yang berstatus N (seharusnya) …\" — standar moral dari status.",
        ex: "指導者たる者、常に謙虚でなければならない。",
        tr: "Seorang pemimpin harus selalu rendah hati.",
      },
      {
        pattern: "V-kamus + まじき + N",
        explanation: "\"(Tindakan) yang tidak pantas dilakukan oleh seseorang berstatus …\". Sering: あるまじき, 許すまじき.",
        ex: "プロとしてあるまじき行為だ。",
        tr: "Itu tindakan yang tidak pantas bagi seorang profesional.",
      },
      {
        pattern: "N + におかれましては",
        explanation: "Penanda topik sangat hormat untuk pihak yang dihormati (surat resmi, sambutan).",
        ex: "皆様におかれましては、お元気でお過ごしのことと存じます。",
        tr: "Kami harap Bapak/Ibu sekalian dalam keadaan sehat.",
      },
    ],
    quiz: [
      pg("指導者＿＿、常に謙虚でなければならない。", ["たる者", "なりに", "ならでは", "ばこそ"], "たる者"),
      pg("プロとしてある＿＿行為だ。", ["まじき", "べき", "まい", "らしい"], "まじき"),
      pg("皆様＿＿、お元気でお過ごしのことと存じます。", ["におかれましては", "にとっては", "に際しては", "をもっては"], "におかれましては"),
      pg("Nada 〜ていただきたい dalam editorial biasanya…", ["tuntutan tegas yang dibungkus sopan", "permohonan maaf", "pujian", "pertanyaan netral"], "tuntutan tegas yang dibungkus sopan"),
      pg("Menurut editorial, kasus sumbangan itu…", ["tidak pantas bagi pemegang jabatan publik", "bisa dimaklumi", "sudah diselesaikan", "tidak melanggar hukum"], "tidak pantas bagi pemegang jabatan publik"),
      pg("Kata 遵守 dibaca…", ["じゅんしゅ", "そんしゅ", "じゅんしゅう", "しゅんしゅ"], "じゅんしゅ"),
      dengar("公職にある者としてあるまじき行為であり、到底看過できない", "Bagaimana sikap penulis?", ["Mengecam keras dan tidak bisa membiarkannya", "Memaklumi tindakannya", "Memuji keberaniannya", "Tidak berpendapat"], "Mengecam keras dan tidak bisa membiarkannya"),
      tulis("kenkyo", "謙虚", "rendah hati (tulis kanjinya)"),
      tulis("tsuranuku", "貫く", "memegang teguh (pakai kanji 貫)"),
      susun("Seorang guru harus menjadi teladan.", ["教師", "たる者", "模範で", "なければならない"], ["まじき"]),
      ucap("初志を貫く覚悟でございます", ["しょしをつらぬくかくごでございます"]),
    ],
  },
];

/** Konfigurasi Miu-chan untuk level N1 (bagian 1.2 & 3 spesifikasi). maxSentenceWords 0 = tanpa batas. */
export const N1_AI = {
  maxSentenceWords: 0,
  furiganaRule: "none" as const,
  speechRate: 1.0,
  systemPrompt: [
    "Level JLPT N1 (mahir, mode Academic & Executive Mentor). Siswa menguasai wacana akademis, kebijakan publik, dan strategi bisnis.",
    "1. Balas 100% dalam bahasa Jepang yang halus dan formal; bahasa Indonesia hanya bila pengguna meminta terjemahan. Penjelasan nuansa di kartu koreksi juga dalam bahasa Jepang formal.",
    "2. Tanpa furigana. Pakai tata bahasa N1, ungkapan sastra, yojijukugo, dan keigo tingkat tinggi secara alami.",
    "3. 2–4 kalimat elegan per giliran.",
    "4. Tantang argumen pengguna secara konstruktif: ajukan pertanyaan yang menggali analisis lebih dalam (dasar data, antisipasi bantahan, trade-off).",
    "5. Fokus koreksi: nuansa dan register (ragam tulisan vs lisan), ketepatan pola N1 (ばこそ, と相まって, たる者, まじき), keigo tinggi, dan pilihan kosakata yang kurang elegan.",
  ].join("\n"),
};

/**
 * Ujian Kelulusan Akhir N1 (bagian 5): simulasi 170 menit. Spesifikasi tidak menyebut jumlah soal dan nilai lulus;
 * dipakai 80 soal (20 per bagian), total ≥80% dan tiap bagian ≥60%.
 */
export const N1_LEVEL_UP = {
  questionCount: 80,
  timeLimitMin: 170,
  passScore: 80,
  sectionMinScore: 60,
  cooldownHours: 24,
  minChapterCompletion: 80,
  sectionRules: {
    kosakata: { count: 20, minScore: 60 },
    tata_bahasa: { count: 20, minScore: 60 },
    membaca: { count: 20, minScore: 60 },
    mendengar: { count: 20, minScore: 60 },
  },
};

/** Skenario percakapan AI N1 (bagian 4 spesifikasi + satu skenario per bab). */
export const N1_SCENARIOS: KScenario[] = [
  {
    key: "scenario:n1:bab-1",
    level: "N1",
    chapterKey: "n1:bab-1",
    title: "Diskusi Kutipan Sastra",
    goal: "Tafsirkan sebuah kutipan novel: suasana, perasaan tokoh, dan ungkapan klasik yang dipakai penulis.",
    mascotRole: "dosen sastra Jepang yang mengajak berdiskusi di seminar kecil",
    initialMessage: "「ドアが開くが早いか、乗客はなだれ込んだ」――この一文から、あなたはどのような情景と心理を読み取りますか。",
    targetGrammar: ["〜が早いか / 〜や否や", "〜なりに", "〜んがため"],
  },
  {
    key: "scenario:n1:bab-2",
    level: "N1",
    chapterKey: "n1:bab-2",
    title: "Menyusun Pidato Penutupan Acara",
    goal: "Susun dan sampaikan sambutan penutupan resmi yang memakai yojijukugo dan pola をもって / を皮切りに.",
    mascotRole: "konsultan retorika yang membantu menyiapkan pidato",
    initialMessage: "来週の閉会式でご挨拶をなさるそうですね。まずは、このプロジェクトの歩みをどのように振り返りたいか、お聞かせいただけますか。",
    targetGrammar: ["〜をもって", "〜を皮切りに", "四字熟語"],
  },
  {
    key: "scenario:n1:bab-3",
    level: "N1",
    chapterKey: "n1:bab-3",
    title: "Konferensi Pers Krisis",
    goal: "Sebagai juru bicara perusahaan, jelaskan penghentian proyek akibat bencana dan jawab pertanyaan wartawan dengan tegas.",
    mascotRole: "wartawan ekonomi yang mengajukan pertanyaan tajam",
    initialMessage: "工事の中断を余儀なくされたとのことですが、住民への説明が遅れたのはなぜでしょうか。責任の所在をお聞かせください。",
    targetGrammar: ["〜を余儀なくされる", "〜極まりない", "〜を限りに"],
  },
  {
    key: "scenario:n1:forum",
    level: "N1",
    chapterKey: "n1:bab-4",
    title: "Forum Strategi Internasional (国際戦略フォーラム)",
    goal: "Pertahankan usulan penerapan AI dalam ekspansi global menghadapi kekhawatiran risiko keamanan dan biaya, memakai pola N1.",
    mascotRole: "moderator dan panelis forum yang kritis, mewakili pandangan yang berhati-hati",
    initialMessage: "本日の国際戦略フォーラムへようこそ。我が社のグローバル展開において、AI技術の導入が不可欠であるというご提案ですが、セキュリティ上のリスクとコストの観点から慎重論も根強く存在します。経営幹部たる者、このトレードオフをどのように打開すべきとお考えでしょうか？",
    targetGrammar: ["〜たる者", "〜と相まって", "〜を皮切りに", "〜ばこそ"],
  },
  {
    key: "scenario:n1:bab-5",
    level: "N1",
    chapterKey: "n1:bab-5",
    title: "Analisis Tajuk Rencana",
    goal: "Analisis nada dan maksud tersirat sebuah editorial politik, lalu sampaikan penilaianmu sendiri.",
    mascotRole: "redaktur senior surat kabar yang menguji kepekaan membaca",
    initialMessage: "今朝の社説は「政治家たる者」という一文で始まっていました。筆者が行間に込めた本当の主張は何だとお考えですか。",
    targetGrammar: ["〜たる者", "〜まじき", "〜におかれましては"],
  },
];
