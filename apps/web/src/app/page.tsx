"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/features/auth/application/AuthProvider";
import {
  ArrowRightIcon,
  BookOpenIcon,
  BrainIcon,
  BotIcon,
  CheckIcon,
  GraduationCapIcon,
  LightbulbIcon,
  MessageIcon,
  MinusIcon,
  PawIcon,
  PlusIcon,
  SakuraIcon,
  SmartphoneIcon,
  SparklesIcon,
  StarIcon,
} from "@/shared/ui/icons";
import { ChibiMascot } from "@/shared/ui/neko/ChibiMascot";
import { TransitionLink } from "@/shared/ui/ViewTransitions";
import fujiBg from "../../public/images/fuji-bg.webp";
import styles from "./landing.module.css";

// Percakapan sapaan interaktif maskot di Hero
const MASCOT_PHRASES = [
  {
    ja: "はじめまして！よろしくね！",
    ro: "Hajimemashite! Yoroshiku ne!",
    id: "Senang berkenalan denganmu! Aku Miu-chan!",
  },
  {
    ja: "一緒に楽しく日本語をマスターしよう！",
    ro: "Issho ni tanoshiku nihongo wo masutaa shiyou!",
    id: "Ayo belajar bahasa Jepang seru bersamaku!",
  },
  {
    ja: "間違えても大丈夫、何度でも練習できるよ！",
    ro: "Machigaetemo daijoubu, nando demo renshuu dekiru yo!",
    id: "Jangan takut salah, kita bisa latihan ngobrol sesering mungkin!",
  },
  {
    ja: "ひらがなからJLPTまで、私に任せて！",
    ro: "Hiragana kara JLPT made, watashi ni makasete!",
    id: "Dari huruf dasar sampai persiapan JLPT, serahkan padaku!",
  },
];

// Skenario simulasi percakapan di landing page
interface Scenario {
  id: string;
  tabLabel: string;
  mascotInitial: {
    ja: string;
    furiganaHtml: string;
    id: string;
  };
  options: {
    text: string;
    translation: string;
    response: {
      ja: string;
      furiganaHtml: string;
      id: string;
      feedback: string;
    };
  }[];
}

const SCENARIOS: Scenario[] = [
  {
    id: "jikoshoukai",
    tabLabel: "1. Perkenalan Diri (自己紹介)",
    mascotInitial: {
      ja: "こんにちは！お名前は何ですか？",
      furiganaHtml: "こんにちは！お<ruby>名前<rt>なまえ</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？",
      id: "Halo! Siapa namamu?",
    },
    options: [
      {
        text: "はじめまして、ブディです。よろしく！",
        translation: "Senang bertemu denganmu, aku Budi. Salam kenal!",
        response: {
          ja: "ブディさん、よろしくね！日本へ行ったことがありますか？",
          furiganaHtml: "ブディさん、よろしくね！<ruby>日本<rt>にほん</rt></ruby>へ<ruby>行<rt>い</rt></ruby>ったことがありますか？",
          id: "Salam kenal Budi! Apakah kamu sudah pernah pergi ke Jepang sebelumnya?",
          feedback: "Bagus sekali! Penggunaan 'はじめまして' sangat tepat untuk menyapa pertama kali.",
        },
      },
      {
        text: "私はインドネシアから来ました。",
        translation: "Saya datang dari Indonesia.",
        response: {
          ja: "インドネシア！素敵な国ですね。日本語を勉強する目的は何ですか？",
          furiganaHtml: "インドネシア！<ruby>素敵<rt>すてき</rt></ruby>な<ruby>国<rt>くに</rt></ruby>ですね。<ruby>日本語<rt>にほんご</rt></ruby>を<ruby>勉強<rt>べんきょう</rt></ruby>する<ruby>目的<rt>もくてき</rt></ruby>は<ruby>何<rt>なん</rt></ruby>ですか？",
          id: "Indonesia! Negara yang indah ya. Apa tujuanmu belajar bahasa Jepang?",
          feedback: "Pola '〜から来ました' (kara kimashita) kamu terapkan dengan benar dan natural!",
        },
      },
    ],
  },
  {
    id: "ramen",
    tabLabel: "2. Di Kedai Ramen (ラーメン屋)",
    mascotInitial: {
      ja: "いらっしゃいませ！何にしますか？",
      furiganaHtml: "いらっしゃいませ！<ruby>何<rt>なに</rt></ruby>にしますか？",
      id: "Selamat datang! Mau pesan menu apa?",
    },
    options: [
      {
        text: "しょうゆラーメンをひとつお願いします。",
        translation: "Pesan satu shoyu ramen tolong.",
        response: {
          ja: "しょうゆラーメンですね！麺のかたさはどうしますか？",
          furiganaHtml: "しょうゆラーメンですね！<ruby>麺<rt>めん</rt></ruby>のかたさはどうしますか？",
          id: "Satu shoyu ramen! Untuk tingkat kematangan mienya mau seperti apa?",
          feedback: "Bagus! '〜をお願いします' (onegaishimasu) adalah cara memesan yang sangat sopan dan lazim.",
        },
      },
      {
        text: "一番おすすめのラーメンは何ですか？",
        translation: "Ramen yang paling direkomendasikan apa ya?",
        response: {
          ja: "当店の特製味噌チャーシュー麺が一番人気ですよ！",
          furiganaHtml: "<ruby>当店<rt>とうてん</rt></ruby>の<ruby>特製<rt>とくせい</rt></ruby><ruby>味噌<rt>みそ</rt></ruby>チャーシュー<ruby>麺<rt>めん</rt></ruby>が<ruby>一番<rt>いちばん</rt></ruby><ruby>人気<rt>にんき</rt></ruby>ですよ！",
          id: "Miso chashu ramen spesial kedai kami yang paling populer lho!",
          feedback: "Pertanyaan '一番おすすめ' (paling direkomendasikan) sangat sering dipakai wisatawan di Jepang!",
        },
      },
    ],
  },
  {
    id: "eki",
    tabLabel: "3. Tanya Stasiun (駅で)",
    mascotInitial: {
      ja: "何かお困りですか？",
      furiganaHtml: "<ruby>何<rt>なに</rt></ruby>かお<ruby>困<rt>こま</rt></ruby>りですか？",
      id: "Ada yang bisa kubantu?",
    },
    options: [
      {
        text: "すみません、新宿駅はどこですか？",
        translation: "Permisi, stasiun Shinjuku di sebelah mana ya?",
        response: {
          ja: "あの交差点を右に曲がると、すぐ見えますよ！",
          furiganaHtml: "あの<ruby>交差点<rt>こうさてん</rt></ruby>を<ruby>右<rt>みぎ</rt></ruby>に<ruby>曲<rt>ま</rt></ruby>がると、すぐ<ruby>見<rt>み</rt></ruby>えますよ！",
          id: "Belok kanan di perempatan itu, stasiunnya langsung terlihat kok!",
          feedback: "Awalan 'すみません' (permisi) selalu membuka percakapan dengan ramah dan sopan.",
        },
      },
      {
        text: "きっぷの買い方を教えてもらえますか？",
        translation: "Bisakah tolong ajarkan cara membeli tiket?",
        response: {
          ja: "もちろんです！券売機で行き先のボタンを押してくださいね。",
          furiganaHtml: "もちろんです！<ruby>券売機<rt>けんばいき</rt></ruby>で<ruby>行<rt>い</rt></ruby>き<ruby>先<rt>さき</rt></ruby>のボタンを<ruby>押<rt>お</rt></ruby>してくださいね。",
          id: "Tentu saja! Tekan tombol stasiun tujuan pada mesin tiket ya.",
          feedback: "Bentuk '〜を教えてもらえますか' meminta bantuan dengan sangat halus dan tepat.",
        },
      },
    ],
  },
];

// Data Roadmap JLPT
const JLPT_LEVELS = [
  {
    code: "N5",
    name: "Tingkat Dasar (Pemula)",
    desc: "Fondasi bahasa Jepang dari nol. Menguasai huruf Hiragana, Katakana, salam harian, angka, dan percakapan dasar di toko atau restoran.",
    kanjiCount: "100+",
    vocabCount: "800+",
    topics: ["Huruf Hiragana & Katakana lengkap", "Partikel dasar: は, が, を, に, で", "Waktu, hari, jam, dan angka", "Membeli barang dan memesan makanan"],
  },
  {
    code: "N4",
    name: "Tingkat Dasar Lanjutan",
    desc: "Mampu memahami percakapan sehari-hari bertempo santai, membaca cerita pendek dengan kosakata umum, dan mengungkapkan keinginan.",
    kanjiCount: "300+",
    vocabCount: "1.500+",
    topics: ["Bentuk kata kerja: Bentuk Te, Nai, Ta", "Mengajak teman dan janji bertemu", "Menyatakan alasan dan syarat (〜から, 〜たら)", "Situasi di stasiun dan transportasi umum"],
  },
  {
    code: "N3",
    name: "Tingkat Menengah (Jembatan)",
    desc: "Memahami artikel pendek, berita santai, dan percakapan sehari-hari dalam kecepatan alami penutur asli Jepang.",
    kanjiCount: "650+",
    vocabCount: "3.750+",
    topics: ["Pola kalimat formal dan ragam bahasa santai", "Memahami intisari berita singkat", "Menyampaikan pendapat dan alasan logis", "Nuansa kata dan peribahasa sehari-hari"],
  },
  {
    code: "N2",
    name: "Tingkat Bisnis & Kerja",
    desc: "Mampu berkomunikasi luwes di lingkungan profesional, memahami koran, artikel opini, dan instruksi kerja.",
    kanjiCount: "1.000+",
    vocabCount: "6.000+",
    topics: ["Bahasa sopan formal tingkat lanjut (Keigo)", "Wawancara kerja dan etika bisnis Jepang", "Membaca teks esai dan editorial", "Diskusi topik sosial dan budaya"],
  },
  {
    code: "N1",
    name: "Tingkat Mahir & Fasih",
    desc: "Pemahaman menyeluruh dalam berbagai situasi kompleks, tulisan sastra, dan diskusi ilmiah atau filosofis.",
    kanjiCount: "2.000+",
    vocabCount: "10.000+",
    topics: ["Keigo tingkat tinggi dan ragam bahasa klasik", "Analisis wacana kritik dan editorial mendalam", "Nuansa tersirat dalam sastra Jepang", "Debat dan presentasi profesional"],
  },
];

// Pertanyaan FAQ
const FAQS = [
  {
    q: "Apakah pemula yang belum bisa baca huruf Jepang bisa langsung mulai?",
    a: "Bisa banget! Miu-chan menyediakan panduan huruf Hiragana dan Katakana dari awal, lengkap dengan cara tulis dan pelafalan audio penutur asli.",
  },
  {
    q: "Bagaimana Miu-chan menyesuaikan level percakapan?",
    a: "Sistem mengenali level belajarmu saat ini. Jika kamu berada di level N5, Miu-chan tidak akan memakai kanji rumit dan otomatis menyertakan furigana agar kamu tetap nyaman memahami dialog.",
  },
  {
    q: "Apakah aplikasi ini bisa dipasang di ponsel tanpa download dari Play Store / App Store?",
    a: "Bisa! Aplikasi ini berbasis Progressive Web App (PWA). Cukup buka di browser ponsel (Chrome di Android atau Safari di iPhone), lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).",
  },
  {
    q: "Bagaimana cara kerja metode Spaced Repetition (SRS) di sini?",
    a: "Sistem menggunakan algoritma SM-2 teruji yang menghitung kapan kamu hampir melupakan suatu kosakata atau kanji, lalu menampilkannya kembali tepat waktu untuk review jangka panjang.",
  },
  {
    q: "Berapa biayanya?",
    a: "Kamu bisa memulai secara gratis tanpa kartu kredit. Cukup daftar dengan email dan password untuk mulai belajar materi dan latihan bersama Miu-chan.",
  },
];

/** Foto Fuji di hero: placeholder buram dulu, lalu foto aslinya memudar masuk begitu selesai dimuat. */
function HeroBackdrop() {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  // Gambar priority bisa selesai sebelum hidrasi sehingga onLoad terlewat
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  return (
    <div className={styles.heroBannerBg} data-loaded={loaded} aria-hidden="true">
      <div className={styles.heroBannerPlaceholder} style={{ backgroundImage: `url(${fujiBg.blurDataURL})` }} />
      <Image
        ref={imgRef}
        src={fujiBg}
        alt=""
        fill
        priority
        sizes="100vw"
        className={styles.heroBannerImg}
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
}

export default function LandingPage() {
  const { status } = useAuth();
  const router = useRouter();

  // State untuk maskot sapaan
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [mascotPokes, setMascotPokes] = useState(0);

  // State untuk demo percakapan interaktif
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [userSelectedOption, setUserSelectedOption] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showFurigana, setShowFurigana] = useState(true);

  // State untuk roadmap JLPT
  const [selectedLevel, setSelectedLevel] = useState("N5");

  // State untuk FAQ accordion
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  useEffect(() => {
    if (status === "authenticated") router.replace("/beranda");
  }, [status, router]);

  function handleMascotClick() {
    setMascotPokes((n) => n + 1);
    setPhraseIdx((prev) => (prev + 1) % MASCOT_PHRASES.length);
  }

  function handleSelectScenario(index: number) {
    setActiveScenarioIdx(index);
    setUserSelectedOption(null);
    setIsTyping(false);
  }

  function handleSelectUserOption(optionIdx: number) {
    setUserSelectedOption(optionIdx);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
    }, 800);
  }

  const currentScenario = SCENARIOS[activeScenarioIdx];
  const activeLevelData = JLPT_LEVELS.find((l) => l.code === selectedLevel) || JLPT_LEVELS[0];

  return (
    <div className={styles.pageWrapper}>
      {/* ──────── Falling Sakura Petals Background ──────── */}
      <div className={styles.sakuraContainer} aria-hidden="true">
        <span className={styles.petal} style={{ left: "8%", animationDuration: "9s, 3s", animationDelay: "0s" }} />
        <span className={styles.petal} style={{ left: "22%", animationDuration: "12s, 4s", animationDelay: "2s" }} />
        <span className={styles.petal} style={{ left: "38%", animationDuration: "10s, 3.5s", animationDelay: "1s" }} />
        <span className={styles.petal} style={{ left: "55%", animationDuration: "13s, 4.5s", animationDelay: "3s" }} />
        <span className={styles.petal} style={{ left: "72%", animationDuration: "11s, 3.2s", animationDelay: "0.5s" }} />
        <span className={styles.petal} style={{ left: "88%", animationDuration: "14s, 4s", animationDelay: "2.5s" }} />
      </div>

      {/* ──────── Navigation Header ──────── */}
      <header className={styles.navbar}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandIconWrap}>
              <Image
                src="/app-icon.png"
                alt="Miu-chan"
                width={40}
                height={40}
                className={styles.brandIconImg}
                priority
              />
            </div>
            <div className={styles.brandText}>
              <span className={styles.brandTitle}>Nihongo</span>
              <span className={styles.brandSubtitle}>日本語 × ミウちゃん</span>
            </div>
          </Link>

          <nav>
            <ul className={styles.navLinks}>
              <li>
                <a href="#simulasi" className={styles.navLink}>
                  Simulasi Ngobrol
                </a>
              </li>
              <li>
                <a href="#fitur" className={styles.navLink}>
                  Fitur Unggulan
                </a>
              </li>
              <li>
                <a href="#level" className={styles.navLink}>
                  Level JLPT
                </a>
              </li>
              <li>
                <a href="#faq" className={styles.navLink}>
                  Tanya Jawab
                </a>
              </li>
            </ul>
          </nav>

          <div className={styles.navActions}>
            <TransitionLink href="/masuk" className={styles.loginBtn}>
              Masuk
            </TransitionLink>
            <TransitionLink href="/daftar" className={styles.ctaBtnSmall}>
              Mulai Gratis
            </TransitionLink>
          </div>
        </div>
      </header>

      {/* ──────── Hero Section ──────── */}
      <div className={styles.heroBannerWrap}>
        <HeroBackdrop />
        <div className={styles.heroBannerOverlay} aria-hidden="true" />
      <section className={styles.heroSection}>
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>
            <SakuraIcon size={16} />
            <span>Belajar Bahasa Jepang Interaktif dengan Maskot AI</span>
          </div>

          <h1 className={styles.heroTitle}>
            Kuasai Bahasa Jepang Lewat <span className={styles.heroTitleHighlight}>Praktik Ngobrol Asli</span> Bersama Miu-chan
          </h1>

          <p className={styles.heroSubtitle}>
            Belajar huruf Kana, tata bahasa penting, hingga percakapan luwes persiapan JLPT. Miu-chan otomatis menyesuaikan kosakata dan kanji dengan level kemampuanmu.
          </p>

          <div className={styles.heroActions}>
            <TransitionLink href="/daftar" className={styles.btnPrimary}>
              <span>Mulai Belajar Sekarang</span>
              <ArrowRightIcon size={18} />
            </TransitionLink>

            <TransitionLink href="/masuk" className={styles.btnSecondary}>
              <span>Sudah Punya Akun? Masuk</span>
            </TransitionLink>
          </div>

          <div className={styles.heroChips}>
            <span className={styles.chipItem}>
              <SparklesIcon size={15} /> 100% Gratis untuk Memulai
            </span>
            <span className={styles.chipItem}>
              <BrainIcon size={15} /> Spaced Repetition (SRS)
            </span>
            <span className={styles.chipItem}>
              <MessageIcon size={15} /> Furigana & Koreksi Otomatis
            </span>
          </div>
        </div>

        {/* ──────── Visual Maskot Interaktif ──────── */}
        <div className={styles.heroVisual}>
          <div
            className={styles.mascotStage}
            onClick={handleMascotClick}
            title="Klik Miu-chan untuk mendengar sapaan lainnya!"
          >
            {/* Interactive Speech Bubble */}
            <div className={styles.interactiveBubble} lang="ja">
              <span className={styles.bubbleJapanese}>{MASCOT_PHRASES[phraseIdx].ja}</span>
              <span className={styles.bubbleRomaji}>{MASCOT_PHRASES[phraseIdx].ro}</span>
              <span className={styles.bubbleTranslation}>{MASCOT_PHRASES[phraseIdx].id}</span>
              <span className={styles.bubbleTapHint}>
                <PawIcon size={13} /> Sentuh Miu-chan
              </span>
            </div>

            <div className={styles.mascotGlowCircle}>
              <div className={styles.mascotAura} />
              <ChibiMascot
                alt="Miu-chan Maskot Bahasa Jepang"
                pokeSignal={mascotPokes}
                className={styles.mascotMainImg}
                priority
              />

              {/* Orbiting Badges */}
              <div className={styles.orbitBadge1}>
                <GraduationCapIcon size={14} />
                <span>JLPT N5 - N1</span>
              </div>
              <div className={styles.orbitBadge2}>
                <StarIcon size={14} />
                <span>Praktik Ngobrol AI</span>
              </div>
            </div>
          </div>
        </div>
      </section>
        <div className={styles.heroBannerFade} aria-hidden="true" />
      </div>{/* end heroBannerWrap */}

      {/* ──────── Interactive Demo / Simulasi Percakapan ──────── */}
      <section id="simulasi" className={styles.demoSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Simulasi Langsung</span>
          <h2 className={styles.sectionTitle}>Rasakan Serunya Latihan Ngobrol bersama Miu-chan</h2>
          <p className={styles.sectionDesc}>
            Coba klik salah satu pilihan respons di bawah untuk melihat bagaimana Miu-chan merespons dan memberikan masukan tata bahasa seketika!
          </p>
        </div>

        <div className={styles.demoContainer}>
          {/* Tabs Skenario */}
          <div className={styles.scenarioTabs} role="tablist">
            {SCENARIOS.map((sc, idx) => (
              <button
                key={sc.id}
                type="button"
                role="tab"
                aria-selected={activeScenarioIdx === idx}
                onClick={() => handleSelectScenario(idx)}
                className={`${styles.scenarioTab} ${activeScenarioIdx === idx ? styles.activeTab : ""}`}
              >
                {sc.tabLabel}
              </button>
            ))}
          </div>

          {/* Chat Window */}
          <div className={styles.chatMockup}>
            {/* Pesan Awal Miu-chan */}
            <div className={`${styles.chatMessageRow} ${styles.chatMascotRow}`}>
              <div className={styles.chatAvatar}>
                <Image src="/neko/chibi/neko-chibi-face.webp" alt="Miu-chan" width={44} height={44} />
              </div>
              <div className={`${styles.chatBubble} ${styles.chatBubbleMascot}`}>
                <p
                  className={styles.chatTextMain}
                  lang="ja"
                  dangerouslySetInnerHTML={{
                    __html: showFurigana ? currentScenario.mascotInitial.furiganaHtml : currentScenario.mascotInitial.ja,
                  }}
                />
                <span className={styles.chatTranslation}>{currentScenario.mascotInitial.id}</span>
              </div>
            </div>

            {/* Pesan Balasan Pengguna (Jika sudah diklik) */}
            {userSelectedOption !== null && (
              <div className={`${styles.chatMessageRow} ${styles.chatUserRow}`}>
                <div className={`${styles.chatAvatar} ${styles.chatAvatarUser}`}>Kamu</div>
                <div className={`${styles.chatBubble} ${styles.chatBubbleUser}`}>
                  <p className={styles.chatTextMain} lang="ja">
                    {currentScenario.options[userSelectedOption].text}
                  </p>
                  <span className={styles.chatTranslation}>
                    {currentScenario.options[userSelectedOption].translation}
                  </span>
                </div>
              </div>
            )}

            {/* Indikator Mengetik atau Jawaban Miu-chan */}
            {isTyping && (
              <div className={`${styles.chatMessageRow} ${styles.chatMascotRow}`}>
                <div className={styles.chatAvatar}>
                  <Image src="/neko/chibi/neko-chibi-face.webp" alt="Miu-chan" width={44} height={44} />
                </div>
                <div className={styles.typingIndicator}>
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                  <span className={styles.typingDot} />
                </div>
              </div>
            )}

            {!isTyping && userSelectedOption !== null && (
              <div className={`${styles.chatMessageRow} ${styles.chatMascotRow}`}>
                <div className={styles.chatAvatar}>
                  <Image src="/neko/chibi/neko-chibi-face.webp" alt="Miu-chan" width={44} height={44} />
                </div>
                <div className={`${styles.chatBubble} ${styles.chatBubbleMascot}`}>
                  <p
                    className={styles.chatTextMain}
                    lang="ja"
                    dangerouslySetInnerHTML={{
                      __html: showFurigana
                        ? currentScenario.options[userSelectedOption].response.furiganaHtml
                        : currentScenario.options[userSelectedOption].response.ja,
                    }}
                  />
                  <span className={styles.chatTranslation}>
                    {currentScenario.options[userSelectedOption].response.id}
                  </span>
                  <div className={styles.feedbackPill}>
                    <LightbulbIcon size={14} />
                    <span>{currentScenario.options[userSelectedOption].response.feedback}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Kotak Pilihan Pengguna */}
          <div className={styles.choiceContainer}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className={styles.choiceLabel}>Pilih Jawabanmu:</span>
              <button
                type="button"
                onClick={() => setShowFurigana(!showFurigana)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "0.8rem",
                  color: "var(--color-primary)",
                  cursor: "pointer",
                  fontWeight: "bold",
                }}
              >
                {showFurigana ? "Sembunyikan Furigana" : "Tampilkan Furigana"}
              </button>
            </div>

            <div className={styles.choiceButtons}>
              {currentScenario.options.map((opt, oIdx) => (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectUserOption(oIdx)}
                  className={styles.choiceBtn}
                >
                  <MessageIcon size={16} />
                  <span>{opt.text}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ──────── Fitur Unggulan Section ──────── */}
      <section id="fitur" className={styles.featuresSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Fitur Unggulan</span>
          <h2 className={styles.sectionTitle}>Metode Cerdas untuk Belajar Lebih Cepat</h2>
          <p className={styles.sectionDesc}>
            Menggabungkan kecerdasan buatan, linguistik terstruktur, dan teknik pengulangan berjeda agar kosakata menempel kuat di ingatan.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <BotIcon size={26} strokeWidth={1.8} />
            </div>
            <h3 className={styles.featureTitle}>AI Maskot Beradaptasi</h3>
            <p className={styles.featureDesc}>
              Miu-chan membatasi kosakata dan kanji sesuai level yang kamu pilih. Tidak ada kalimat rumit membingungkan jika kamu pemula.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <BrainIcon size={26} strokeWidth={1.8} />
            </div>
            <h3 className={styles.featureTitle}>Spaced Repetition (SRS)</h3>
            <p className={styles.featureDesc}>
              Algoritma SM-2 menghitung interval waktu peninjauan flashcard secara otomatis, tepat sebelum kamu melupakan kosakata dan kanji.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <BookOpenIcon size={26} strokeWidth={1.8} />
            </div>
            <h3 className={styles.featureTitle}>Kurikulum Terstruktur</h3>
            <p className={styles.featureDesc}>
              Setiap bab dilengkapi penjelasan tata bahasa, pola kalimat esensial, kuis interaktif, dan latihan menyusun kalimat.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <SmartphoneIcon size={26} strokeWidth={1.8} />
            </div>
            <h3 className={styles.featureTitle}>Web & Mobile PWA</h3>
            <p className={styles.featureDesc}>
              Satu aplikasi untuk desktop dan ponsel. Pasang langsung di layar utama HP tanpa beban memori app store yang berat.
            </p>
          </div>
        </div>
      </section>

      {/* ──────── Curriculum & JLPT Roadmap Section ──────── */}
      <section id="level" className={styles.curriculumSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Jalur Belajar</span>
          <h2 className={styles.sectionTitle}>Peta Kemampuan dari Dasar hingga Mahir</h2>
          <p className={styles.sectionDesc}>
            Pilih target level JLPT (Japanese Language Proficiency Test) yang ingin kamu capai.
          </p>
        </div>

        <div className={styles.roadmapContainer}>
          <div className={styles.levelPills}>
            {JLPT_LEVELS.map((lvl) => (
              <button
                key={lvl.code}
                type="button"
                onClick={() => setSelectedLevel(lvl.code)}
                className={`${styles.levelPillBtn} ${selectedLevel === lvl.code ? styles.activeLevelPill : ""}`}
              >
                {lvl.code}
              </button>
            ))}
          </div>

          <div className={styles.levelDetailCard}>
            <div className={styles.levelLeft}>
              <div className={styles.levelNameHeader}>
                <span className={styles.levelBadgeBig}>{activeLevelData.code}</span>
                <h3 className={styles.levelTitleBig}>{activeLevelData.name}</h3>
              </div>

              <p className={styles.levelDesc}>{activeLevelData.desc}</p>

              <div className={styles.levelStatsRow}>
                <div className={styles.levelStatBox}>
                  <span className={styles.statNumber}>{activeLevelData.kanjiCount}</span>
                  <span className={styles.statLabel}>Target Kanji</span>
                </div>
                <div className={styles.levelStatBox}>
                  <span className={styles.statNumber}>{activeLevelData.vocabCount}</span>
                  <span className={styles.statLabel}>Target Kosakata</span>
                </div>
              </div>

              <div style={{ marginTop: "1rem" }}>
                <TransitionLink href="/daftar" className={styles.ctaBtnSmall}>
                  Mulai Belajar Level {activeLevelData.code}
                </TransitionLink>
              </div>
            </div>

            <div className={styles.levelRight}>
              <span className={styles.sampleTopicTitle}>Fokus Materi Level Ini:</span>
              <ul className={styles.sampleList}>
                {activeLevelData.topics.map((top, tIdx) => (
                  <li key={tIdx} className={styles.sampleListItem}>
                    <CheckIcon size={16} />
                    <span>{top}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── FAQ Section ──────── */}
      <section id="faq" className={styles.faqSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTag}>Tanya Jawab</span>
          <h2 className={styles.sectionTitle}>Pertanyaan yang Sering Diajukan</h2>
          <p className={styles.sectionDesc}>
            Semua yang perlu kamu ketahui sebelum memulai belajar bersama Miu-chan.
          </p>
        </div>

        <div className={styles.faqList}>
          {FAQS.map((faq, fIdx) => {
            const isOpen = openFaqIdx === fIdx;
            return (
              <div key={fIdx} className={styles.faqItem}>
                <button
                  type="button"
                  onClick={() => setOpenFaqIdx(isOpen ? null : fIdx)}
                  className={styles.faqQuestion}
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <span style={{ fontSize: "1.25rem", color: "var(--color-primary)", display: "inline-flex" }}>
                    {isOpen ? <MinusIcon size={20} /> : <PlusIcon size={20} />}
                  </span>
                </button>
                {isOpen && <p className={styles.faqAnswer}>{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* ──────── CTA Banner (Bottom) ──────── */}
      <section className={styles.ctaBannerSection}>
        <div className={styles.ctaCard}>
          <div className={styles.ctaMascotWrap}>
            <ChibiMascot alt="Miu-chan Melambai" className={styles.ctaMascotImg} />
          </div>

          <div className={styles.ctaInfo}>
            <h2 className={styles.ctaHeading}>Siap Menguasai Bahasa Jepang dengan Percaya Diri?</h2>
            <p className={styles.ctaSubheading}>
              Bergabunglah hari ini dan rasakan kemudahan latihan ngobrol setiap hari bersama Miu-chan.
            </p>
            <div className={styles.ctaButtonRow}>
              <TransitionLink href="/daftar" className={styles.ctaBtnLight}>
                Buat Akun Gratis Sekarang
              </TransitionLink>
              <TransitionLink href="/masuk" className={styles.ctaBtnGhost}>
                Masuk ke Akun
              </TransitionLink>
            </div>
          </div>
        </div>
      </section>

      {/* ──────── Footer ──────── */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <div className={styles.footerBrand}>
            <Image src="/app-icon.png" alt="Miu-chan" width={32} height={32} style={{ borderRadius: "50%" }} />
            <span className={styles.footerBrandText}>
              © 2026 Nihongo bersama Miu-chan. Aplikasi E-learning Bahasa Jepang & PWA.
            </span>
          </div>

          <ul className={styles.footerLinks}>
            <li>
              <TransitionLink href="/masuk" className={styles.footerLink}>
                Masuk
              </TransitionLink>
            </li>
            <li>
              <TransitionLink href="/daftar" className={styles.footerLink}>
                Daftar
              </TransitionLink>
            </li>
            <li>
              <Link href="/privasi" className={styles.footerLink}>
                Privasi
              </Link>
            </li>
            <li>
              <Link href="/ketentuan" className={styles.footerLink}>
                Ketentuan
              </Link>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}
