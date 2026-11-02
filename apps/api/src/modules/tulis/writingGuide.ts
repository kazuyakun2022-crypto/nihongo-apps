/**
 * Panduan koreksi tulisan yang disusun manual. Model hanya memutuskan jenis masalahnya (kode), sedangkan
 * kalimat penjelasannya diambil dari sini supaya selalu benar dan mudah dipahami pemula.
 */

/** Ciri pembeda huruf yang sering tertukar, dipakai saat tulisan terbaca sebagai huruf lain. */
export const DISTINCT: Record<string, string> = {
  // Hiragana
  あ: "garis mendatar, garis tegak yang memotongnya, lalu lengkungan besar terpisah; tanpa titik di kanan atas",
  お: "garis mendatar, garis tegak yang di bawah berbelok membentuk lingkaran ke kanan, plus titik kecil di kanan atas",
  め: "garis miring pendek, lalu goresan melingkar besar yang ujungnya terbuka (tanpa simpul)",
  ぬ: "seperti め, tetapi ujung goresan keduanya membentuk simpul kecil di kanan bawah",
  の: "satu goresan melingkar yang dimulai dari tengah",
  い: "dua goresan tegak terpisah; yang kiri lebih panjang dengan kait kecil, yang kanan lebih pendek",
  り: "dua goresan; yang kiri pendek dengan kait, yang kanan jauh lebih panjang dan melengkung turun ke kiri",
  こ: "dua garis mendatar, atas dan bawah",
  う: "titik miring di atas, lalu satu lengkungan membulat ke kanan dan turun",
  つ: "satu lengkungan mendatar tanpa titik di atas",
  ら: "titik di atas, lalu garis tegak yang di bawah melengkung terbuka ke kiri",
  え: "titik di atas, lalu goresan berliku yang diakhiri ekor bergelombang mendatar",
  ん: "satu goresan tanpa titik di atas: turun miring, naik membentuk punuk, lalu ekor naik ke kanan",
  そ: "satu goresan berliku: dua lekukan kecil di atas, lalu lengkungan terbuka di bawah",
  ろ: "satu goresan yang bagian bawahnya melengkung terbuka tanpa simpul",
  る: "seperti ろ, tetapi ujungnya membentuk simpul kecil di kiri bawah",
  き: "dua garis mendatar, garis miring yang memotong keduanya, lalu lengkungan bawah",
  さ: "satu garis mendatar, garis miring yang memotongnya, lalu lengkungan bawah terbuka ke kanan seperti huruf c",
  ち: "satu garis mendatar, garis miring, lalu lengkungan bawah terbuka ke kiri seperti angka 5",
  は: "garis tegak di kiri, satu garis mendatar di kanan, dan garis tegak kanan yang berakhir simpul",
  ほ: "garis tegak di kiri, dua garis mendatar di kanan, dan garis tegak kanan yang berakhir simpul",
  ま: "dua garis mendatar dan garis tegak yang berakhir simpul, tanpa garis tegak di kiri",
  け: "garis tegak di kiri, garis mendatar pendek, dan garis panjang yang turun melengkung ke kiri, tanpa simpul",
  よ: "garis mendatar pendek di kanan atas dan garis tegak yang berakhir simpul",
  ね: "garis tegak, goresan berliku yang diakhiri simpul kecil di kanan bawah",
  れ: "garis tegak, goresan berliku yang diakhiri ekor naik ke kanan (tanpa simpul)",
  わ: "garis tegak, goresan berliku yang diakhiri lengkungan besar membulat ke kiri",
  し: "satu goresan turun lurus lalu melengkung ke kanan atas",
  く: "satu goresan bersudut seperti tanda <",
  へ: "satu goresan seperti puncak gunung: naik pendek lalu turun panjang",
  て: "garis mendatar yang berbelok turun melengkung ke kiri",
  と: "garis miring pendek, lalu lengkungan bawah yang berbelok ke kanan",
  た: "garis mendatar dan garis miring di kiri, lalu dua garis pendek seperti こ di kanan",
  な: "garis mendatar dan miring di kiri, titik di kanan atas, dan garis tegak yang berakhir simpul",
  に: "garis tegak di kiri dan dua garis mendatar seperti こ di kanan",
  む: "garis mendatar, garis tegak bersimpul yang berbelok ke kanan, plus titik di kanan atas",
  す: "garis mendatar dan garis tegak yang membuat simpul di tengah lalu turun",
  せ: "garis mendatar panjang dan dua garis tegak; yang kiri turun lalu berbelok ke kanan",
  ひ: "satu goresan lebar seperti senyum dengan ujung naik",
  ゆ: "lengkungan di kiri dan garis tegak melengkung yang memotong bagian tengahnya",
  // Katakana
  シ: "dua titik tersusun ke bawah di kiri, goresan panjang NAIK dari kiri bawah ke kanan atas",
  ツ: "dua titik berjajar mendatar di atas, goresan panjang TURUN dari kanan atas ke kiri bawah",
  ン: "satu titik di kiri yang lebih mendatar, goresan panjang NAIK dari kiri bawah ke kanan atas",
  ソ: "satu titik di kiri atas yang lebih tegak, goresan panjang TURUN dari kanan atas ke kiri bawah",
  ク: "garis miring pendek di kiri, lalu atap yang berbelok turun panjang ke kiri",
  ケ: "garis miring di kiri, garis mendatar, dan garis panjang turun ke kiri yang terpisah dari atap",
  タ: "seperti ク, ditambah goresan pendek di tengahnya",
  ア: "garis mendatar yang berbelok ke kiri bawah, lalu garis turun melengkung dari tengah",
  マ: "garis mendatar yang berbelok miring ke kiri bawah, lalu titik pendek di bawahnya ke arah kanan",
  ウ: "garis tegak pendek di atas, lalu bentuk seperti ワ di bawahnya",
  ワ: "garis tegak pendek di kiri dan atap yang turun ke kiri, tanpa garis di atasnya",
  フ: "satu goresan mendatar lalu turun melengkung ke kiri",
  ヌ: "seperti フ, ditambah garis pendek yang menyilangnya",
  ス: "seperti フ, ditambah garis miring ke kanan bawah dari tengah",
  ナ: "garis mendatar dan garis tegak yang melengkung ke kiri",
  メ: "garis panjang turun ke kiri dan garis pendek yang menyilangnya",
  チ: "garis miring pendek di atas, garis mendatar, dan garis tegak melengkung yang memotong garis mendatar",
  テ: "dua garis mendatar (bawah lebih panjang) dan garis tegak melengkung yang dimulai dari garis bawah",
  コ: "garis atas yang berbelok turun, lalu garis bawah; terbuka di sisi kiri",
  ユ: "garis yang berbelok turun di kanan, lalu garis bawah panjang yang melewati kedua sisi",
  ロ: "kotak tertutup dari tiga goresan",
  ル: "dua goresan: yang kiri melengkung ke kiri, yang kanan turun lalu naik ke kanan",
  レ: "satu goresan turun lalu naik ke kanan",
  ハ: "dua goresan terpisah seperti atap terbuka",
  ニ: "dua garis mendatar, yang bawah lebih panjang",
  // Kanji
  人: "dua goresan; goresan kiri lebih panjang dan menjadi puncaknya",
  入: "dua goresan; goresan kanan lebih panjang dan menjadi puncaknya",
  土: "garis mendatar bawah lebih panjang daripada yang atas",
  士: "garis mendatar atas lebih panjang daripada yang bawah",
  日: "kotak dengan satu garis di tengah",
  目: "kotak tinggi dengan dua garis di dalam",
  田: "kotak dengan tanda tambah di dalamnya",
  白: "seperti 日 dengan goresan miring kecil di atas",
  木: "garis mendatar, garis tegak, dan dua kaki miring",
  本: "seperti 木, ditambah garis pendek mendatar di bagian bawah batang",
  大: "garis mendatar dan dua kaki",
  犬: "seperti 大, ditambah titik di kanan atas",
  太: "seperti 大, ditambah titik di bawah tengah",
  天: "dua garis mendatar dengan dua kaki",
  一: "satu garis mendatar",
  二: "dua garis mendatar; yang bawah lebih panjang",
  三: "tiga garis mendatar; yang tengah paling pendek, yang bawah paling panjang",
  千: "goresan miring pendek di atas, garis mendatar, dan garis tegak",
  干: "dua garis mendatar dan garis tegak",
  十: "satu garis mendatar dan satu garis tegak",
  未: "garis mendatar atas lebih pendek daripada yang bawah",
  末: "garis mendatar atas lebih panjang daripada yang bawah",
  力: "garis tegak yang menembus atap ke atas",
  刀: "garis tegak tidak menembus atap",
  右: "garis miring memotong garis mendatar, dengan 口 di bawah",
  石: "garis mendatar di atas, garis miring dimulai di bawahnya, dengan 口 di bawah",
  左: "garis mendatar dan miring, dengan 工 di bawah",
};

export type IssueCode =
  | "goresan_kurang"
  | "goresan_lebih"
  | "terlalu_panjang"
  | "terlalu_pendek"
  | "sambung"
  | "terputus"
  | "lengkung"
  | "miring"
  | "proporsi"
  | "terlalu_kecil"
  | "keluar_kotak"
  | "tanda"
  | "tidak_jelas"
  | "tome"
  | "hane"
  | "harai"
  | "tidak_tengah";

export const ISSUE_CODES = [
  "goresan_kurang",
  "goresan_lebih",
  "terlalu_panjang",
  "terlalu_pendek",
  "sambung",
  "terputus",
  "lengkung",
  "miring",
  "proporsi",
  "terlalu_kecil",
  "keluar_kotak",
  "tanda",
  "tidak_jelas",
  "tome",
  "hane",
  "harai",
] as const satisfies readonly IssueCode[];

/** Apa masalahnya (singkat) dan cara memperbaikinya. {n} = jumlah goresan huruf itu. */
export const ISSUES: Record<IssueCode, { label: string; fix: string }> = {
  goresan_kurang: { label: "Ada goresan yang hilang", fix: "Hitung goresannya: huruf ini punya {n} goresan. Tulis satu per satu sesuai urutan contoh." },
  goresan_lebih: { label: "Ada goresan tambahan", fix: "Huruf ini cukup {n} goresan. Hindari menebalkan dengan goresan berulang." },
  terlalu_panjang: { label: "Ada goresan yang terlalu panjang", fix: "Bandingkan panjang tiap goresan dengan contoh; berhenti saat ujungnya sejajar dengan contoh." },
  terlalu_pendek: { label: "Ada goresan yang terlalu pendek", fix: "Tarik goresan sampai ujungnya sejajar dengan contoh supaya bentuknya tidak berubah." },
  sambung: { label: "Goresan yang seharusnya terpisah tersambung", fix: "Angkat pensil di akhir tiap goresan, lalu mulai goresan berikutnya dari titik awalnya." },
  terputus: { label: "Goresan yang seharusnya bersambung malah terputus", fix: "Tulis goresan itu dalam satu tarikan tanpa mengangkat pensil." },
  lengkung: { label: "Bentuk lengkungannya belum tepat", fix: "Perhatikan arah dan besar lengkungan pada contoh; tulis lebih pelan di bagian yang melengkung." },
  miring: { label: "Hurufnya terlalu miring", fix: "Pakai garis bantu tengah kotak sebagai patokan agar huruf berdiri tegak." },
  proporsi: { label: "Ukuran bagian-bagiannya belum seimbang", fix: "Bagi kotak dengan garis bantu, lalu letakkan tiap bagian huruf di posisi yang sama seperti contoh." },
  terlalu_kecil: { label: "Tulisannya terlalu kecil", fix: "Isi kira-kira tiga perempat kotak, dengan titik tengah huruf di tengah kotak." },
  keluar_kotak: { label: "Tulisan keluar dari kotak", fix: "Mulai dari tengah kotak dan sisakan sedikit ruang di setiap sisi." },
  tanda: { label: "Titik atau tanda kecilnya hilang/salah posisi", fix: "Periksa titik, tenten (゛), atau goresan kecil pada contoh, lalu letakkan di posisi yang sama." },
  tidak_jelas: { label: "Goresannya tipis atau kurang jelas", fix: "Tekan pensil sedikit lebih mantap dan pakai pensil 2B supaya goresannya terbaca." },
  tome: { label: "Akhiran goresan berhenti (tome) belum tegas", fix: "Di ujung goresan, tahan pensil sebentar lalu angkat lurus supaya ujungnya berhenti tegas." },
  hane: { label: "Kait di ujung goresan (hane) belum ada", fix: "Di ujung goresan, pantulkan pensil sedikit ke atas seperti kait kecil, lalu angkat." },
  harai: { label: "Sapuan di ujung goresan (harai) belum menipis", fix: "Kurangi tekanan sambil terus bergerak di ujung goresan supaya ujungnya meruncing." },
  tidak_tengah: { label: "Hurufnya belum di tengah kotak", fix: "Letakkan titik tengah huruf di persilangan garis bantu, dengan jarak ke keempat sisi kotak hampir sama." },
};

/** Lima dimensi rubrik penilaian tulisan (bobotnya di handwritingCheck.ts). */
export type Dimension = "strokeCount" | "strokeEnding" | "proportion" | "centerAlignment" | "legibility";

/** Dimensi yang diturunkan nilainya oleh tiap jenis masalah. */
export const DIMENSION_OF: Record<IssueCode, Dimension> = {
  goresan_kurang: "strokeCount",
  goresan_lebih: "strokeCount",
  tanda: "strokeCount",
  tome: "strokeEnding",
  hane: "strokeEnding",
  harai: "strokeEnding",
  terlalu_panjang: "strokeEnding",
  terlalu_pendek: "strokeEnding",
  sambung: "strokeEnding",
  terputus: "strokeEnding",
  proporsi: "proportion",
  lengkung: "legibility",
  tidak_jelas: "legibility",
  miring: "centerAlignment",
  terlalu_kecil: "centerAlignment",
  keluar_kotak: "centerAlignment",
  tidak_tengah: "centerAlignment",
};

export type Quadrant = "kiri_atas" | "kanan_atas" | "kiri_bawah" | "kanan_bawah" | "tengah";
export const QUADRANTS = ["kiri_atas", "kanan_atas", "kiri_bawah", "kanan_bawah", "tengah"] as const satisfies readonly Quadrant[];
export const QUADRANT_NAME: Record<Quadrant, string> = {
  kiri_atas: "kiri atas",
  kanan_atas: "kanan atas",
  kiri_bawah: "kiri bawah",
  kanan_bawah: "kanan bawah",
  tengah: "tengah",
};

/**
 * Penjelasan sudut pandang kedua (analogi), dipakai saat kesalahan yang sama terulang supaya Miu-chan tidak mengulang
 * kalimat yang sama. {n} = jumlah goresan, {q} = bagian kotak.
 */
export const ANALOGY: Record<IssueCode, string> = {
  goresan_kurang: "Bayangkan huruf ini rangka rumah dari {n} batang kayu. Kalau satu batang hilang, rumahnya belum lengkap.",
  goresan_lebih: "Huruf ini seperti resep dengan {n} bahan. Kalau ditambah bahan lain, hasilnya jadi huruf yang berbeda.",
  terlalu_panjang: "Goresan itu seperti tali yang kepanjangan sampai menabrak bagian lain. Bayangkan ada garis batas di ujung contoh, lalu berhenti di sana.",
  terlalu_pendek: "Goresan itu seperti jembatan yang belum sampai ke seberang. Teruskan sampai menyentuh tepi seberang seperti di contoh.",
  sambung: "Dua goresan yang tersambung seperti dua kata yang ditulis tanpa spasi. Beri spasi kecil dengan mengangkat pensil.",
  terputus: "Goresan ini seperti perosotan: sekali meluncur dari atas sampai bawah, tanpa berhenti di tengah.",
  lengkung: "Lengkungan itu seperti jalan di tikungan: berbelok pelan dan bulat, bukan patah bersudut.",
  miring: "Bayangkan hurufmu berdiri di lantai kotak. Kalau miring, ia seperti hampir jatuh. Tegakkan seperti tiang di garis tengah.",
  proporsi: "Garis silang membagi kotak menjadi 4 kamar. Contoh memakai kamar {q} dengan takaran tertentu, tulisanmu belum sama takarannya.",
  terlalu_kecil: "Hurufmu seperti foto kecil di bingkai besar. Perbesar sampai mengisi kira-kira tiga perempat bingkai.",
  keluar_kotak: "Kotak itu seperti selimut: semua bagian huruf harus ada di dalamnya, tidak ada kaki yang keluar.",
  tanda: "Titik atau tenten itu seperti tanda baca: kecil, tapi mengubah arti. Tanpa itu, hurufnya jadi huruf lain.",
  tidak_jelas: "Goresan tipis itu seperti suara berbisik, sulit didengar. Tulis dengan suara lantang: tekanan pensil yang mantap.",
  tome: "Tome itu seperti rem mobil: goresan berhenti tegas di ujung, tidak dibiarkan meluncur.",
  hane: "Hane itu seperti lompatan kecil di ujung: setelah goresan turun, pensil memantul sedikit ke atas.",
  harai: "Harai itu seperti sapuan kuas: makin ke ujung makin ringan, lalu pensil terangkat sambil bergerak.",
  tidak_tengah: "Bayangkan kotak itu panggung dan hurufmu penyanyinya: berdirilah di tengah panggung supaya terlihat jelas.",
};

/** Sudut pandang ketiga: panduan langkah demi langkah (dipakai bila urutan goresan baku tidak tersedia). */
export const STEPS: Record<IssueCode, string> = {
  goresan_kurang: "Tulis sambil menghitung pelan: satu, dua, … sampai {n}. Setelah hitungan ke-{n}, hurufnya selesai.",
  goresan_lebih: "Tulis sambil menghitung pelan: satu, dua, … sampai {n}, lalu berhenti. Jangan menebalkan dengan goresan ulang.",
  terlalu_panjang: "1) Taruh pensil di titik awal seperti contoh, 2) tarik pelan sambil melihat ujung contoh, 3) berhenti tepat sejajar dengan ujung itu.",
  terlalu_pendek: "1) Taruh pensil di titik awal seperti contoh, 2) tarik pelan, 3) teruskan sampai ujungnya sejajar dengan contoh.",
  sambung: "1) Selesaikan goresan, 2) angkat pensil sepenuhnya, 3) pindah ke titik awal goresan berikutnya, 4) baru mulai lagi.",
  terputus: "1) Letakkan pensil di titik awal, 2) tarik terus sampai ujung tanpa diangkat, 3) baru angkat pensil.",
  lengkung: "1) Mulai goresan, 2) perlambat saat mendekati lengkungan, 3) putar pergelangan perlahan mengikuti contoh, 4) lanjutkan ke ujung.",
  miring: "1) Lihat garis tegak di tengah kotak, 2) tulis goresan tegak sejajar garis itu, 3) cek bagian kiri dan kanan seimbang di kedua sisi garis.",
  proporsi: "1) Lihat bagian {q} pada contoh, 2) perhatikan seberapa besar bagian itu, 3) tulis bagian itu dengan ukuran serupa, 4) lanjutkan bagian lain.",
  terlalu_kecil: "1) Bayangkan titik tengah kotak, 2) mulai goresan pertama agak dekat ke tepi atas, 3) biarkan huruf mengisi hampir seluruh kotak.",
  keluar_kotak: "1) Tandai titik tengah kotak, 2) mulai goresan pertama sedikit lebih ke dalam, 3) sisakan ruang di keempat sisi.",
  tanda: "1) Selesaikan bentuk utama, 2) lihat posisi titik atau tenten di contoh, 3) tambahkan di posisi yang sama.",
  tidak_jelas: "1) Pegang pensil sedikit lebih dekat ke ujungnya, 2) tekan dengan mantap, 3) tulis lebih pelan.",
  tome: "1) Tarik goresan sampai ujung, 2) tahan pensil sebentar di kertas, 3) angkat lurus.",
  hane: "1) Tarik goresan turun, 2) di ujungnya belokkan pensil sedikit ke atas, 3) angkat sambil bergerak.",
  harai: "1) Mulai dengan tekanan mantap, 2) kurangi tekanan sambil terus bergerak, 3) angkat pensil di ujung tanpa berhenti.",
  tidak_tengah: "1) Lihat persilangan garis bantu, 2) mulai huruf sehingga titik tengahnya jatuh di persilangan itu, 3) cek jarak ke empat sisi hampir sama.",
};


/** Penjelasan pembeda dua huruf; null bila salah satunya belum ada di panduan. */
export function compareChars(target: string, read: string): string | null {
  const a = DISTINCT[target];
  const b = DISTINCT[read];
  if (!a || !b) return null;
  return `${target}: ${a}. Sedangkan ${read}: ${b}.`;
}

/** Kelompok huruf yang sering tertukar; disebutkan ke model supaya waspada terhadap pasangan ini. */
const CONFUSABLE_GROUPS = [
  "あおめぬの", "いりこ", "うつら", "えんそろる", "きさち", "はほまけよ", "ねれわ", "しつくへて", "たなに", "むす",
  "シツンソ", "クケタワウフ", "アマ", "ヌスフメナ", "チテ", "コユロ", "ルレハ",
  "一二三", "人入", "土士", "日目田白", "木本", "大犬太天", "千干十", "未末", "力刀", "右石左",
];

/** Huruf lain yang mudah tertukar dengan `char`, beserta cirinya (bila ada di panduan). */
export function lookalikes(char: string): string[] {
  const others = new Set<string>();
  for (const group of CONFUSABLE_GROUPS) if ([...group].includes(char)) for (const c of group) if (c !== char) others.add(c);
  return [...others].map((c) => (DISTINCT[c] ? `${c} (${DISTINCT[c]})` : c));
}
