/**
 * Tur Miu-chan: urutan langkah yang menyorot satu elemen [data-spotlight] per langkah sambil menjelaskannya.
 * Langkah "click" mengajari pengguna mengetuk sendiri (mis. menu bawah) dan baru lanjut setelah diketuk,
 * jadi pengguna belajar jalannya, bukan sekadar dipindahkan.
 */
import type { LevelBand } from "./intents";

export interface Say {
  id: string;
  ja: string;
  romaji?: string;
}

export interface TourStep {
  /** Nilai data-spotlight; daftar = pakai yang pertama ditemukan; null = kartu di tengah tanpa sorotan. */
  target: string | string[] | null;
  say: Say;
  /** Langkah selesai saat target diketuk (tombol "Ketukkan untukku" juga tersedia). */
  click?: boolean;
  /** Lewati bila pengguna sudah berada di rute ini. */
  skipOn?: string[];
  /** Lewati bila elemen ini sudah tampil (mis. tab tujuan sudah terbuka). */
  skipIfPresent?: string;
  /** Teks pengganti bila target yang ditemukan adalah id tertentu; end = tur selesai di langkah ini. */
  alt?: Record<string, { say: Say; end?: boolean }>;
  /** Penjelasan bila target tidak muncul di layar. */
  missing?: string;
}

export interface Tour {
  title: string;
  steps: TourStep[];
}

type NavKey = "beranda" | "belajar" | "ngobrol" | "profil";

const NAV_NAME: Record<NavKey, { id: string; ja: string; romaji: string }> = {
  beranda: { id: "Beranda", ja: "ホーム", romaji: "hoomu" },
  belajar: { id: "Belajar", ja: "べんきょう", romaji: "benkyou" },
  ngobrol: { id: "Ngobrol", ja: "かいわ", romaji: "kaiwa" },
  profil: { id: "Profil", ja: "プロフィール", romaji: "purofiiru" },
};

/** Langkah pertama: ajari jalan lewat menu, dilewati kalau sudah di halamannya. */
function viaNav(key: NavKey, alsoSkipOn: string[] = []): TourStep {
  const n = NAV_NAME[key];
  return {
    target: `nav-${key}`,
    click: true,
    skipOn: [`/${key}`, ...alsoSkipOn],
    say: {
      id: `Pertama, ketuk menu ${n.id} ini. Menu ini selalu ada, jadi kamu bisa ke sana kapan saja.`,
      ja: `まず「${n.ja}」を タップしてね。`,
      romaji: `mazu "${n.romaji}" o tappu shite ne.`,
    },
  };
}

/* ── Langkah per halaman ── */

const BERANDA: TourStep[] = [
  {
    target: "beranda-lanjut",
    say: { id: "Ini tombol terpenting: langsung lanjut ke bab berikutnya tanpa mencari-cari.", ja: "ここから つぎの レッスンを はじめよう。", romaji: "koko kara tsugi no ressun o hajimeyou." },
  },
  {
    target: "beranda-progres",
    say: { id: "Di sini terlihat berapa bab, kosakata, dan kanji yang sudah kamu kuasai di level ini.", ja: "これは いまの レベルの しんちょくだよ。", romaji: "kore wa ima no reberu no shinchoku da yo." },
  },
  {
    target: "beranda-streak",
    say: { id: "Ini streak dan XP-mu. Belajar sedikit tiap hari supaya apinya tidak padam!", ja: "まいにち べんきょうして、きろくを のばそう！", romaji: "mainichi benkyou shite, kiroku o nobasou!" },
  },
  {
    target: "beranda-siap",
    say: { id: "Ini kesiapan naik level. Kalau semua bab dan Gerbang Tulis sudah lulus, tombol tes naik tahap terbuka di sini.", ja: "レベルアップの じゅんびは ここで みてね。", romaji: "reberu appu no junbi wa koko de mite ne." },
    missing: "Kartu kesiapan naik level muncul di beranda setelah levelmu dimuat.",
  },
  {
    target: "beranda-latihan",
    say: { id: "Latihan tambahan ada di sini: review kosakata, simulasi JLPT, dan ngobrol dengan Miu-chan.", ja: "ほかの れんしゅうは ここだよ。", romaji: "hoka no renshuu wa koko da yo." },
  },
  {
    target: null,
    say: { id: "Kalau bingung, ketuk aku di pojok layar lalu bilang mau ke mana. Nanti aku tunjukkan jalannya!", ja: "こまったら、わたしを タップしてね！", romaji: "komattara, watashi o tappu shite ne!" },
  },
];

const PETA_AKTIF: TourStep = {
  target: "peta-bab-aktif",
  say: { id: "Bab yang berdenyut dengan aku di atasnya adalah bab yang sedang kamu pelajari.", ja: "いまの レッスンは ここ！", romaji: "ima no ressun wa koko!" },
  missing: "Peta bab belum tampil. Coba muat ulang halaman Belajar.",
};

const LIMA_LANGKAH: TourStep = {
  target: null,
  say: {
    id: "Tiap bab punya 5 langkah: ulang bab lalu, materi, praktik, kuis, lalu hasil. Lulus kuis membuka bab berikutnya. Ketuk bab yang berdenyut untuk mulai!",
    ja: "レッスンは 5つの ステップで すすむよ。",
    romaji: "ressun wa itsutsu no suteppu de susumu yo.",
  },
};

const PETA_GERBANG: TourStep = {
  target: "peta-gerbang",
  say: { id: "Di ujung peta ada Gerbang Tulis. Lulus di sini untuk naik ke level berikutnya.", ja: "さいごは かきの ゲート。ごうかくして レベルアップ！", romaji: "saigo wa kaki no geeto. goukaku shite reberu appu!" },
};

const BELAJAR: TourStep[] = [
  {
    target: "belajar-level",
    say: { id: "Ini level-levelmu. Level yang bergembok terbuka setelah kamu lulus Gerbang di akhir peta.", ja: "これは レベルだよ。ゲートに ごうかくすると つぎが ひらくよ。", romaji: "kore wa reberu da yo. geeto ni goukaku suru to tsugi ga hiraku yo." },
  },
  PETA_AKTIF,
  LIMA_LANGKAH,
  PETA_GERBANG,
];

const REVIEW: TourStep[] = [
  {
    target: ["review-kartu-depan", "review-kosong"],
    say: { id: "Ini kartu hafalan. Lihat katanya, lalu coba ingat artinya dalam hati dulu.", ja: "ことばを みて、いみを おもいだしてね。", romaji: "kotoba o mite, imi o omoidashite ne." },
    alt: {
      "review-kosong": {
        say: { id: "Hari ini belum ada kartu yang perlu diulang. Kartu baru masuk ke sini setiap kamu lulus bab.", ja: "きょうの カードは おわり！", romaji: "kyou no kaado wa owari!" },
        end: true,
      },
    },
  },
  {
    target: "review-kartu",
    click: true,
    say: { id: "Sudah ingat? Ketuk Lihat jawaban.", ja: "「こたえを みる」を タップ！", romaji: "kotae o miru o tappu!" },
  },
  {
    target: "review-nilai",
    say: { id: "Pilih dengan jujur: Lupa, Sulit, Bisa, atau Mudah. Kartu yang sulit akan muncul lebih sering.", ja: "どのくらい おぼえていたか えらんでね。", romaji: "dono kurai oboete ita ka erande ne." },
  },
];

const NGOBROL_TAB_SKENARIO: TourStep = {
  target: "ngobrol-tab-skenario",
  say: { id: "Skenario: latihan peran, misalnya belanja di konbini atau memesan makanan.", ja: "ロールプレイで れんしゅう！", romaji: "rooru purei de renshuu!" },
};

const NGOBROL: TourStep[] = [
  {
    target: "ngobrol-tabs",
    say: { id: "Ada tiga cara ngobrol denganku. Aku jelaskan satu per satu ya.", ja: "はなしかたは 3つ あるよ。", romaji: "hanashikata wa mittsu aru yo." },
  },
  {
    target: "ngobrol-tab-tanya",
    say: { id: "Tanya AI: ketik pertanyaan soal tata bahasa, kanji, atau arti kata.", ja: "しつもんは ここ！", romaji: "shitsumon wa koko!" },
  },
  {
    target: "ngobrol-tab-suara",
    say: { id: "Suara: bicara langsung denganku memakai mikrofon.", ja: "こえで はなそう！", romaji: "koe de hanasou!" },
  },
  NGOBROL_TAB_SKENARIO,
];

const TULIS_BUKU: TourStep[] = [
  {
    target: "tulis-buku-langkah",
    say: { id: "Ada 3 langkah: pilih lembar, foto tulisanmu, lalu lihat koreksinya.", ja: "3つの ステップで すすむよ。", romaji: "mittsu no suteppu de susumu yo." },
  },
  {
    target: "tulis-buku-lembar",
    say: { id: "Pilih jenis huruf dan lembar yang mau kamu latih.", ja: "れんしゅうする シートを えらぼう。", romaji: "renshuu suru shiito o erabou." },
  },
  {
    target: "tulis-buku-aksi",
    say: { id: "Cetak lembarnya atau salin ke buku, tulis dengan pensil, lalu ketuk Foto sekarang.", ja: "いんさつして、かいて、しゃしんを とろう！", romaji: "insatsu shite, kaite, shashin o torou!" },
  },
  {
    target: "tulis-buku-cara",
    say: { id: "Tips: foto dari atas dengan cahaya terang dan pastikan semua kotak masuk bingkai.", ja: "あかるい ところで、うえから とってね。", romaji: "akarui tokoro de, ue kara totte ne." },
  },
];

const PROFIL: TourStep = {
  target: null,
  say: {
    id: "Di halaman profil kamu bisa ganti foto dan nama, mengatur target menit belajar harian, dan melihat pencapaianmu.",
    ja: "ここで プロフィールを かえられるよ。",
    romaji: "koko de purofiiru o kaerareru yo.",
  },
};

/* ── Tur ── */

export type TourKey =
  | "page-beranda"
  | "page-belajar"
  | "page-review"
  | "page-ngobrol"
  | "page-tulis-buku"
  | "page-profil"
  | "review"
  | "continue"
  | "gate"
  | "roleplay"
  | "voice"
  | "profile"
  | "home"
  | "level-test"
  | "jlpt-sim"
  | "ask"
  | "progress"
  | "welcome";

export const TOURS: Record<TourKey, Tour> = {
  "page-beranda": { title: "Kenalan dengan Beranda", steps: BERANDA },
  "page-belajar": { title: "Cara memakai peta belajar", steps: BELAJAR },
  "page-review": { title: "Cara review kartu", steps: REVIEW },
  "page-ngobrol": { title: "Cara ngobrol dengan Miu-chan", steps: NGOBROL },
  "page-tulis-buku": { title: "Cara Tulis di Buku", steps: TULIS_BUKU },
  "page-profil": { title: "Halaman profil", steps: [PROFIL] },

  review: {
    title: "Review kosakata",
    steps: [
      viaNav("beranda", ["/review"]),
      {
        target: "beranda-review",
        click: true,
        skipOn: ["/review"],
        say: { id: "Di bagian Latihan lain, ketuk Review kosakata.", ja: "「ふくしゅう」を タップ！", romaji: "fukushuu o tappu!" },
      },
      ...REVIEW,
    ],
  },
  "jlpt-sim": {
    title: "Simulasi JLPT",
    steps: [
      viaNav("beranda", ["/simulasi", "/belajar/simulasi-jlpt"]),
      {
        target: "beranda-jlpt",
        click: true,
        skipOn: ["/simulasi", "/belajar/simulasi-jlpt"],
        say: {
          id: "Di bagian Latihan lain, ketuk Simulasi JLPT. Pilih levelnya, lalu kerjakan seperti ujian sungguhan. Selama ujian aku diam dulu ya.",
          ja: "「もぎしけん」を タップ！",
          romaji: "mogi shiken o tappu!",
        },
      },
    ],
  },
  continue: { title: "Lanjut belajar", steps: [viaNav("belajar"), PETA_AKTIF, LIMA_LANGKAH] },
  gate: { title: "Gerbang Tulis", steps: [viaNav("belajar"), PETA_GERBANG] },
  roleplay: {
    title: "Latihan percakapan",
    steps: [
      viaNav("ngobrol"),
      { ...NGOBROL_TAB_SKENARIO, click: true, skipIfPresent: "ngobrol-skenario", say: { id: "Ketuk tab Skenario.", ja: "「シナリオ」を タップ！", romaji: "shinario o tappu!" } },
      {
        target: "ngobrol-skenario",
        say: { id: "Pilih satu skenario. Aku akan berperan jadi kasir, pelayan, atau temanmu, dan kesalahanmu dikoreksi pelan-pelan.", ja: "すきな シーンを えらんでね。", romaji: "suki na shiin o erande ne." },
      },
    ],
  },
  voice: {
    title: "Ngobrol pakai suara",
    steps: [
      viaNav("ngobrol"),
      {
        target: "ngobrol-tab-suara",
        click: true,
        say: { id: "Ketuk tab Suara, lalu tekan tombol mikrofon untuk mulai bicara.", ja: "「こえ」を タップしてね。", romaji: "koe o tappu shite ne." },
      },
    ],
  },
  profile: { title: "Profil", steps: [viaNav("profil"), PROFIL] },
  home: { title: "Ke beranda", steps: [viaNav("beranda"), BERANDA[0]] },
  "level-test": {
    title: "Naik level",
    steps: [
      viaNav("beranda"),
      {
        target: "beranda-siap",
        say: {
          id: "Ini kartu kesiapan naik level. Selesaikan semua bab, lulus Gerbang Tulis, lalu tombol tes di bawah kartu ini terbuka. Selama tes nanti aku diam dulu ya, supaya adil.",
          ja: "ぜんぶ おわったら、ここから テストを うけよう。",
          romaji: "zenbu owattara, koko kara tesuto o ukeyou.",
        },
      },
    ],
  },
  ask: {
    title: "Tanya AI",
    steps: [
      viaNav("ngobrol"),
      {
        target: "ngobrol-tab-tanya",
        click: true,
        skipIfPresent: "tanya-input",
        say: { id: "Ketuk tab Tanya AI.", ja: "「しつもん」を タップ！", romaji: "shitsumon o tappu!" },
      },
      {
        target: "tanya-input",
        say: { id: "Ketik pertanyaanmu di sini, misalnya cara pakai partikel atau arti sebuah kanji. Jawabannya lengkap dengan contoh.", ja: "ここに しつもんを かいてね。", romaji: "koko ni shitsumon o kaite ne." },
      },
    ],
  },
  // Sambutan pengguna baru: kenalan dengan semua menu tanpa berpindah layar
  welcome: {
    title: "Selamat datang!",
    steps: [
      {
        target: null,
        say: {
          id: "Ini aplikasi belajar bahasa Jepang dari nol sampai JLPT. Aku kenalkan menu-menunya satu per satu ya.",
          ja: "ようこそ！アプリを あんないするね。",
          romaji: "youkoso! apuri o annai suru ne.",
        },
      },
      {
        target: "nav-beranda",
        say: { id: "Beranda: ringkasan harianmu, progres, dan tombol untuk langsung lanjut ke bab berikutnya.", ja: "ホームは まいにちの スタート！", romaji: "hoomu wa mainichi no sutaato!" },
      },
      {
        target: "nav-belajar",
        say: {
          id: "Belajar: peta bab dari Pemula sampai N1. Tiap bab berisi materi, latihan, dan kuis. Lulus kuis membuka bab berikutnya.",
          ja: "べんきょうは レッスンの ちず だよ。",
          romaji: "benkyou wa ressun no chizu da yo.",
        },
      },
      {
        target: "nav-ngobrol",
        say: { id: "Ngobrol: tanya apa saja, bicara langsung denganku pakai suara, atau latihan peran seperti belanja di konbini.", ja: "わたしと おしゃべり しよう！", romaji: "watashi to oshaberi shiyou!" },
      },
      {
        target: "nav-profil",
        say: { id: "Profil: ganti foto dan nama, serta atur target menit belajar harianmu.", ja: "プロフィールは ここ。", romaji: "purofiiru wa koko." },
      },
      {
        target: null,
        say: {
          id: "Terakhir, aku selalu ada di pojok layar. Ketuk aku kapan saja lalu bicara: tanya materi yang bikin bingung, atau minta ditunjukkan jalan. Yuk mulai bab pertamamu!",
          ja: "こまったら、いつでも よんでね！",
          romaji: "komattara, itsudemo yonde ne!",
        },
      },
    ],
  },
  progress: {
    title: "Progres belajarmu",
    steps: [viaNav("beranda"), BERANDA[1], BERANDA[2], BERANDA[3]],
  },
};

export function isTourKey(key: string | null | undefined): key is TourKey {
  return !!key && key in TOURS;
}

/** Tur pengenalan untuk halaman yang sedang dibuka (null = halaman ini belum punya tur). */
export function pageTourFor(pathname: string): TourKey | null {
  switch (pathname) {
    case "/beranda":
      return "page-beranda";
    case "/belajar":
      return "page-belajar";
    case "/review":
      return "page-review";
    case "/ngobrol":
      return "page-ngobrol";
    case "/belajar/tulis-buku":
      return "page-tulis-buku";
    case "/profil":
      return "page-profil";
    default:
      return null;
  }
}

/** Teks yang ditampilkan dan dibacakan sesuai level: pemula didampingi bahasa Indonesia, level tinggi berbahasa Jepang. */
export interface StepLines {
  ja: string;
  romaji?: string;
  id: string;
  /** Baris utama: "id" untuk Pemula/N5, "ja" untuk N4 ke atas. */
  main: "id" | "ja";
  /** N3 ke atas: terjemahan disembunyikan di balik tombol. */
  idCollapsed: boolean;
  speech: string;
}

export function linesFor(say: Say, band: LevelBand): StepLines {
  switch (band) {
    case "PRE_N5":
      return { ja: say.ja, romaji: say.romaji, id: say.id, main: "id", idCollapsed: false, speech: say.id };
    case "N5":
      return { ja: say.ja, id: say.id, main: "id", idCollapsed: false, speech: say.id };
    case "N4":
      return { ja: say.ja, id: say.id, main: "ja", idCollapsed: false, speech: say.ja };
    default:
      return { ja: say.ja, id: say.id, main: "ja", idCollapsed: true, speech: say.ja };
  }
}
