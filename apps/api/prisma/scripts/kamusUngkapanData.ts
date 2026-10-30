/**
 * Kamus ungkapan & sebutan: salam, panggilan, sebutan keluarga, kata bantu bilangan, keigo, dan ungkapan.
 * Melengkapi kosakata/kanji/tata bahasa dari bab; dibuka bertahap mengikuti level siswa.
 * Format baris: [kategori, level, tulisan, kana, romaji, arti, catatan?]
 */

export type KamusLevelCode = "PEMULA" | "N5" | "N4" | "N3" | "N2" | "N1";

export interface UngkapanEntry {
  kategori: string;
  level: KamusLevelCode;
  ja: string;
  kana: string;
  romaji: string;
  arti: string;
  catatan: string | null;
}

export const UNGKAPAN_CATEGORIES: { key: string; label: string }[] = [
  { key: "salam", label: "Salam & Sapaan" },
  { key: "kelas", label: "Ungkapan Kelas" },
  { key: "panggilan", label: "Panggilan & Akhiran Nama" },
  { key: "keluarga", label: "Sebutan Keluarga" },
  { key: "penunjuk", label: "Kata Penunjuk & Tanya" },
  { key: "bilangan", label: "Kata Bantu Bilangan" },
  { key: "waktu", label: "Ungkapan Waktu" },
  { key: "sopan", label: "Ungkapan Sopan & Kerja" },
  { key: "keigo", label: "Keigo (Bahasa Hormat)" },
  { key: "bisnis", label: "Sebutan Bisnis" },
  { key: "peribahasa", label: "Peribahasa & Yojijukugo" },
];

type Row = [string, KamusLevelCode, string, string, string, string, string?];

const ROWS: Row[] = [
  // ── Salam & sapaan ──
  ["salam", "PEMULA", "おはようございます", "おはようございます", "ohayou gozaimasu", "Selamat pagi", "Ke teman cukup おはよう."],
  ["salam", "PEMULA", "こんにちは", "こんにちは", "konnichiwa", "Selamat siang / Halo", "Dipakai kira-kira pukul 10–17."],
  ["salam", "PEMULA", "こんばんは", "こんばんは", "konbanwa", "Selamat malam (bertemu)"],
  ["salam", "PEMULA", "おやすみなさい", "おやすみなさい", "oyasumi nasai", "Selamat tidur", "Ke teman cukup おやすみ."],
  ["salam", "PEMULA", "さようなら", "さようなら", "sayounara", "Selamat tinggal", "Terasa berpisah lama; ke teman lebih umum じゃあね / またね."],
  ["salam", "PEMULA", "またね", "またね", "mata ne", "Sampai jumpa (santai)"],
  ["salam", "PEMULA", "ありがとうございます", "ありがとうございます", "arigatou gozaimasu", "Terima kasih", "Ke teman cukup ありがとう."],
  ["salam", "PEMULA", "どういたしまして", "どういたしまして", "dou itashimashite", "Sama-sama"],
  ["salam", "PEMULA", "すみません", "すみません", "sumimasen", "Permisi / Maaf", "Juga dipakai untuk memanggil pelayan."],
  ["salam", "PEMULA", "ごめんなさい", "ごめんなさい", "gomen nasai", "Maaf", "Lebih personal daripada すみません; ke teman ごめん."],
  ["salam", "PEMULA", "はじめまして", "はじめまして", "hajimemashite", "Senang berkenalan", "Hanya diucapkan pada pertemuan pertama."],
  ["salam", "PEMULA", "よろしくお願いします", "よろしくおねがいします", "yoroshiku onegaishimasu", "Mohon bantuannya / Salam kenal", "Penutup perkenalan diri."],
  ["salam", "PEMULA", "いただきます", "いただきます", "itadakimasu", "Selamat makan (sebelum makan)"],
  ["salam", "PEMULA", "ごちそうさまでした", "ごちそうさまでした", "gochisousama deshita", "Terima kasih atas makanannya (setelah makan)"],
  ["salam", "PEMULA", "いってきます", "いってきます", "ittekimasu", "Saya berangkat dulu", "Diucapkan yang pergi; dijawab いってらっしゃい."],
  ["salam", "PEMULA", "いってらっしゃい", "いってらっしゃい", "itterasshai", "Hati-hati di jalan", "Diucapkan yang tinggal di rumah."],
  ["salam", "PEMULA", "ただいま", "ただいま", "tadaima", "Saya pulang", "Dijawab おかえりなさい."],
  ["salam", "PEMULA", "おかえりなさい", "おかえりなさい", "okaeri nasai", "Selamat datang kembali (di rumah)"],
  ["salam", "N5", "お元気ですか", "おげんきですか", "o-genki desu ka", "Apa kabar?", "Untuk orang yang lama tidak bertemu, bukan sapaan harian."],
  ["salam", "N5", "いらっしゃいませ", "いらっしゃいませ", "irasshaimase", "Selamat datang (di toko)", "Diucapkan pegawai; pembeli tidak perlu menjawab."],
  ["salam", "N4", "おめでとうございます", "おめでとうございます", "omedetou gozaimasu", "Selamat (atas keberhasilan)"],
  ["salam", "N4", "お大事に", "おだいじに", "o-daiji ni", "Semoga lekas sembuh"],
  ["salam", "N4", "気をつけて", "きをつけて", "ki o tsukete", "Hati-hati"],

  // ── Ungkapan kelas ──
  ["kelas", "PEMULA", "わかりました", "わかりました", "wakarimashita", "Saya mengerti"],
  ["kelas", "PEMULA", "わかりません", "わかりません", "wakarimasen", "Saya tidak mengerti"],
  ["kelas", "PEMULA", "もう一度お願いします", "もういちどおねがいします", "mou ichido onegaishimasu", "Tolong ulangi sekali lagi"],
  ["kelas", "PEMULA", "ゆっくりお願いします", "ゆっくりおねがいします", "yukkuri onegaishimasu", "Tolong (bicara) pelan-pelan"],
  ["kelas", "PEMULA", "質問があります", "しつもんがあります", "shitsumon ga arimasu", "Saya punya pertanyaan"],
  ["kelas", "N5", "〜は日本語で何ですか", "〜はにほんごでなんですか", "~ wa nihongo de nan desu ka", "~ dalam bahasa Jepang apa?"],
  ["kelas", "N5", "どういう意味ですか", "どういういみですか", "dou iu imi desu ka", "Apa artinya?"],

  // ── Panggilan & akhiran nama ──
  ["panggilan", "N5", "〜さん", "〜さん", "~san", "Sdr./Bpk./Ibu (akhiran nama umum)", "Tidak pernah dipakai untuk nama diri sendiri."],
  ["panggilan", "N5", "〜くん", "〜くん", "~kun", "Akhiran untuk anak laki-laki / junior", "Atasan kadang memakainya untuk bawahan."],
  ["panggilan", "N5", "〜ちゃん", "〜ちゃん", "~chan", "Akhiran akrab untuk anak kecil / teman dekat"],
  ["panggilan", "N5", "先生", "せんせい", "sensei", "Guru / dokter / sebutan hormat ahli", "Juga dipakai sebagai akhiran: 田中先生."],
  ["panggilan", "N4", "〜様", "〜さま", "~sama", "Akhiran sangat hormat (pelanggan, surat)", "Dipakai di amplop dan untuk pelanggan: お客様."],
  ["panggilan", "N4", "先輩", "せんぱい", "senpai", "Senior (sekolah/kerja)"],
  ["panggilan", "N4", "後輩", "こうはい", "kouhai", "Junior (sekolah/kerja)", "Jarang dipakai untuk memanggil langsung."],
  ["panggilan", "N4", "あなた", "あなた", "anata", "Kamu / Anda", "Sering terdengar kurang sopan; lebih baik memanggil nama + さん."],

  // ── Sebutan keluarga: milik sendiri vs orang lain ──
  ["keluarga", "N5", "家族", "かぞく", "kazoku", "Keluarga (sendiri)", "Keluarga orang lain: ご家族 (ごかぞく)."],
  ["keluarga", "N5", "父", "ちち", "chichi", "Ayah (saya)", "Ayah orang lain / memanggil ayah sendiri: お父さん (おとうさん)."],
  ["keluarga", "N5", "母", "はは", "haha", "Ibu (saya)", "Ibu orang lain / memanggil ibu sendiri: お母さん (おかあさん)."],
  ["keluarga", "N5", "兄", "あに", "ani", "Kakak laki-laki (saya)", "Milik orang lain: お兄さん (おにいさん)."],
  ["keluarga", "N5", "姉", "あね", "ane", "Kakak perempuan (saya)", "Milik orang lain: お姉さん (おねえさん)."],
  ["keluarga", "N5", "弟", "おとうと", "otouto", "Adik laki-laki (saya)", "Milik orang lain: 弟さん (おとうとさん)."],
  ["keluarga", "N5", "妹", "いもうと", "imouto", "Adik perempuan (saya)", "Milik orang lain: 妹さん (いもうとさん)."],
  ["keluarga", "N5", "両親", "りょうしん", "ryoushin", "Orang tua (saya)", "Milik orang lain: ご両親 (ごりょうしん)."],
  ["keluarga", "N5", "兄弟", "きょうだい", "kyoudai", "Saudara kandung", "Milik orang lain: ご兄弟 (ごきょうだい)."],
  ["keluarga", "N4", "祖父", "そふ", "sofu", "Kakek (saya)", "Milik orang lain: おじいさん."],
  ["keluarga", "N4", "祖母", "そぼ", "sobo", "Nenek (saya)", "Milik orang lain: おばあさん."],
  ["keluarga", "N4", "夫", "おっと", "otto", "Suami (saya)", "Suami orang lain: ご主人 (ごしゅじん)."],
  ["keluarga", "N4", "妻", "つま", "tsuma", "Istri (saya)", "Istri orang lain: 奥さん (おくさん)."],
  ["keluarga", "N4", "息子", "むすこ", "musuko", "Anak laki-laki (saya)", "Milik orang lain: 息子さん (むすこさん)."],
  ["keluarga", "N4", "娘", "むすめ", "musume", "Anak perempuan (saya)", "Milik orang lain: 娘さん (むすめさん)."],

  // ── Kata penunjuk & tanya ──
  ["penunjuk", "PEMULA", "これ・それ・あれ", "これ・それ・あれ", "kore / sore / are", "Ini / itu (dekat lawan bicara) / itu (jauh)", "Berdiri sendiri sebagai kata benda."],
  ["penunjuk", "N5", "この・その・あの", "この・その・あの", "kono / sono / ano", "~ini / ~itu / ~itu (jauh)", "Selalu diikuti kata benda: この本."],
  ["penunjuk", "N5", "ここ・そこ・あそこ", "ここ・そこ・あそこ", "koko / soko / asoko", "Sini / situ / sana"],
  ["penunjuk", "N5", "こちら・そちら・あちら", "こちら・そちら・あちら", "kochira / sochira / achira", "Arah sini/situ/sana (sopan)", "Juga sopan untuk 'orang ini': こちらは田中さんです."],
  ["penunjuk", "N5", "何", "なに・なん", "nani / nan", "Apa", "Dibaca なん sebelum です, の, dan kata bantu bilangan."],
  ["penunjuk", "N5", "誰", "だれ", "dare", "Siapa", "Sopan: どなた."],
  ["penunjuk", "N5", "どこ", "どこ", "doko", "Di mana", "Sopan: どちら."],
  ["penunjuk", "N5", "いつ", "いつ", "itsu", "Kapan"],
  ["penunjuk", "N5", "いくら", "いくら", "ikura", "Berapa (harga)"],
  ["penunjuk", "N5", "どうして", "どうして", "doushite", "Mengapa", "Lebih formal: なぜ."],

  // ── Kata bantu bilangan (josuushi) ──
  ["bilangan", "N5", "〜つ", "〜つ", "~tsu", "Benda umum (1–10)", "ひとつ, ふたつ, みっつ … とお. Dipakai jika ragu."],
  ["bilangan", "N5", "〜人", "〜にん", "~nin", "Orang", "Pengecualian: ひとり (1), ふたり (2), よにん (4)."],
  ["bilangan", "N5", "〜枚", "〜まい", "~mai", "Benda tipis-datar (kertas, tiket, baju)"],
  ["bilangan", "N5", "〜本", "〜ほん", "~hon", "Benda panjang (pensil, botol, payung)", "Berubah bunyi: いっぽん, さんぼん, ろっぽん, はっぽん."],
  ["bilangan", "N5", "〜匹", "〜ひき", "~hiki", "Hewan kecil (kucing, anjing, ikan)", "いっぴき, さんびき, ろっぴき, はっぴき."],
  ["bilangan", "N5", "〜台", "〜だい", "~dai", "Mesin & kendaraan"],
  ["bilangan", "N5", "〜冊", "〜さつ", "~satsu", "Buku & majalah", "いっさつ, はっさつ."],
  ["bilangan", "N5", "〜個", "〜こ", "~ko", "Benda kecil (apel, telur)", "いっこ, ろっこ, はっこ, じゅっこ."],
  ["bilangan", "N5", "〜歳", "〜さい", "~sai", "Umur", "Pengecualian: はたち (20 tahun), いっさい, はっさい."],
  ["bilangan", "N5", "〜回", "〜かい", "~kai", "Kali (frekuensi)", "いっかい, ろっかい, はっかい."],
  ["bilangan", "N5", "〜階", "〜かい・がい", "~kai / ~gai", "Lantai", "いっかい, さんがい."],
  ["bilangan", "N5", "〜杯", "〜はい", "~hai", "Gelas / mangkuk", "いっぱい, さんばい, ろっぱい."],
  ["bilangan", "N4", "〜番", "〜ばん", "~ban", "Nomor urut"],
  ["bilangan", "N4", "〜頭", "〜とう", "~tou", "Hewan besar (sapi, gajah)"],
  ["bilangan", "N4", "〜足", "〜そく", "~soku", "Pasang alas kaki / kaus kaki", "いっそく, さんぞく."],
  ["bilangan", "N4", "〜軒", "〜けん", "~ken", "Rumah / toko", "いっけん, さんげん."],

  // ── Ungkapan waktu ──
  ["waktu", "N5", "今日", "きょう", "kyou", "Hari ini"],
  ["waktu", "N5", "明日", "あした", "ashita", "Besok", "Formal: あす / みょうにち."],
  ["waktu", "N5", "昨日", "きのう", "kinou", "Kemarin"],
  ["waktu", "N5", "毎日", "まいにち", "mainichi", "Setiap hari"],
  ["waktu", "N5", "今週・先週・来週", "こんしゅう・せんしゅう・らいしゅう", "konshuu / senshuu / raishuu", "Minggu ini / lalu / depan"],
  ["waktu", "N5", "今年・去年・来年", "ことし・きょねん・らいねん", "kotoshi / kyonen / rainen", "Tahun ini / lalu / depan"],
  ["waktu", "N5", "一日", "ついたち", "tsuitachi", "Tanggal 1", "Tanggal 2–10 juga khusus: ふつか, みっか, よっか, いつか, むいか, なのか, ようか, ここのか, とおか."],
  ["waktu", "N4", "さっき", "さっき", "sakki", "Barusan"],
  ["waktu", "N4", "そのうち", "そのうち", "sono uchi", "Suatu saat nanti"],
  ["waktu", "N3", "先日", "せんじつ", "senjitsu", "Tempo hari (formal)"],

  // ── Ungkapan sopan & tempat kerja ──
  ["sopan", "N4", "お疲れ様です", "おつかれさまです", "otsukaresama desu", "Terima kasih atas kerja kerasnya", "Sapaan antarrekan kerja, juga saat pamit."],
  ["sopan", "N4", "失礼します", "しつれいします", "shitsurei shimasu", "Permisi (masuk/keluar ruangan)"],
  ["sopan", "N4", "お先に失礼します", "おさきにしつれいします", "osaki ni shitsurei shimasu", "Saya pulang duluan", "Dijawab お疲れ様でした."],
  ["sopan", "N4", "お邪魔します", "おじゃまします", "ojama shimasu", "Permisi (masuk rumah orang)"],
  ["sopan", "N4", "お待たせしました", "おまたせしました", "omatase shimashita", "Maaf membuat menunggu"],
  ["sopan", "N4", "申し訳ありません", "もうしわけありません", "moushiwake arimasen", "Mohon maaf (formal)", "Lebih formal dari すみません; wajib di tempat kerja."],
  ["sopan", "N3", "少々お待ちください", "しょうしょうおまちください", "shoushou omachi kudasai", "Mohon tunggu sebentar"],
  ["sopan", "N3", "恐れ入ります", "おそれいります", "osoreirimasu", "Mohon maaf / terima kasih (sangat sopan)"],
  ["sopan", "N3", "報告・連絡・相談", "ほうこく・れんらく・そうだん", "houkoku / renraku / soudan", "Lapor, kabari, konsultasi (Hourenso)", "Prinsip komunikasi kerja di perusahaan Jepang."],

  // ── Keigo: sonkeigo (menghormati) vs kenjougo (merendah) ──
  ["keigo", "N3", "いらっしゃる", "いらっしゃる", "irassharu", "Ada / datang / pergi (hormat)", "Sonkeigo dari いる・来る・行く. Kenjougo: おる / まいる."],
  ["keigo", "N3", "参る", "まいる", "mairu", "Datang / pergi (merendah)", "Kenjougo dari 行く・来る."],
  ["keigo", "N3", "召し上がる", "めしあがる", "meshiagaru", "Makan / minum (hormat)", "Kenjougo: いただく."],
  ["keigo", "N3", "いただく", "いただく", "itadaku", "Makan / menerima (merendah)"],
  ["keigo", "N3", "おっしゃる", "おっしゃる", "ossharu", "Berkata (hormat)", "Kenjougo: 申す (もうす)."],
  ["keigo", "N3", "申す", "もうす", "mousu", "Berkata / bernama (merendah)", "田中と申します = Nama saya Tanaka."],
  ["keigo", "N3", "なさる", "なさる", "nasaru", "Melakukan (hormat)", "Kenjougo: いたす."],
  ["keigo", "N3", "致す", "いたす", "itasu", "Melakukan (merendah)"],
  ["keigo", "N2", "ご覧になる", "ごらんになる", "goran ni naru", "Melihat (hormat)", "Kenjougo: 拝見する (はいけんする)."],
  ["keigo", "N2", "拝見する", "はいけんする", "haiken suru", "Melihat (merendah)"],
  ["keigo", "N2", "伺う", "うかがう", "ukagau", "Bertanya / berkunjung (merendah)"],
  ["keigo", "N2", "ご存じ", "ごぞんじ", "gozonji", "Mengetahui (hormat)", "Kenjougo: 存じております."],

  // ── Sebutan bisnis ──
  ["bisnis", "N3", "私", "わたくし", "watakushi", "Saya (sangat formal)"],
  ["bisnis", "N2", "弊社", "へいしゃ", "heisha", "Perusahaan kami (merendah, tulisan & lisan)"],
  ["bisnis", "N2", "御社", "おんしゃ", "onsha", "Perusahaan Anda (lisan)", "Dalam tulisan/surat: 貴社 (きしゃ)."],
  ["bisnis", "N2", "貴社", "きしゃ", "kisha", "Perusahaan Anda (tulisan)"],
  ["bisnis", "N2", "お世話になっております", "おせわになっております", "osewa ni natte orimasu", "Terima kasih atas kerja samanya", "Pembuka baku telepon & email bisnis."],
  ["bisnis", "N2", "かしこまりました", "かしこまりました", "kashikomarimashita", "Baik, saya mengerti (melayani)"],
  ["bisnis", "N2", "承知しました", "しょうちしました", "shouchi shimashita", "Baik, dimengerti (ke atasan/klien)"],
  ["bisnis", "N2", "お手数をおかけします", "おてすうをおかけします", "otesuu o okake shimasu", "Maaf merepotkan"],

  // ── Peribahasa & yojijukugo ──
  ["peribahasa", "N3", "猿も木から落ちる", "さるもきからおちる", "saru mo ki kara ochiru", "Monyet pun bisa jatuh dari pohon", "Ahli pun bisa salah."],
  ["peribahasa", "N3", "十人十色", "じゅうにんといろ", "juunin toiro", "Sepuluh orang, sepuluh warna", "Setiap orang berbeda selera dan pendapat."],
  ["peribahasa", "N2", "急がば回れ", "いそがばまわれ", "isogaba maware", "Kalau terburu-buru, ambil jalan memutar", "Cara yang pasti lebih cepat daripada jalan pintas berisiko."],
  ["peribahasa", "N2", "七転び八起き", "ななころびやおき", "nanakorobi yaoki", "Jatuh tujuh kali, bangkit delapan kali"],
  ["peribahasa", "N2", "一石二鳥", "いっせきにちょう", "isseki nichou", "Sekali dayung dua pulau terlampaui"],
  ["peribahasa", "N1", "一期一会", "いちごいちえ", "ichigo ichie", "Setiap pertemuan hanya terjadi sekali", "Hargai setiap momen karena tidak akan terulang."],
  ["peribahasa", "N1", "試行錯誤", "しこうさくご", "shikou sakugo", "Coba-coba dan belajar dari kesalahan (trial and error)"],
  ["peribahasa", "N1", "以心伝心", "いしんでんしん", "ishin denshin", "Saling memahami tanpa kata-kata"],
  ["peribahasa", "N1", "自業自得", "じごうじとく", "jigou jitoku", "Menuai hasil perbuatan sendiri"],
  ["peribahasa", "N1", "有言実行", "ゆうげんじっこう", "yuugen jikkou", "Melakukan apa yang sudah diucapkan"],
];

export const UNGKAPAN: UngkapanEntry[] = ROWS.map(([kategori, level, ja, kana, romaji, arti, catatan]) => ({
  kategori,
  level,
  ja,
  kana,
  romaji,
  arti,
  catatan: catatan ?? null,
}));
