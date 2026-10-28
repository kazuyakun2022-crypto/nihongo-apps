import Link from "next/link";
import { CONTACT_EMAIL } from "../contact";
import styles from "../legal.module.css";

export const metadata = { title: "Kebijakan Privasi" };

export default function PrivacyPage() {
  return (
    <article>
      <h1>Kebijakan Privasi</h1>
      <p className={styles.updated}>Berlaku sejak 28 Oktober 2026</p>

      <p>
        Nihongo bersama Neko-sensei ("kami") adalah aplikasi belajar bahasa Jepang. Halaman ini menjelaskan data apa
        yang kami simpan, untuk apa, dan bagaimana kamu bisa menghapusnya.
      </p>

      <h2>Data yang kami simpan</h2>
      <ul>
        <li>
          <strong>Akun:</strong> nama tampilan, email, dan password yang disimpan dalam bentuk hash. Jika masuk dengan
          Google, kami menerima nama, email, dan foto profil dari akun Google-mu. Kami tidak menerima password Google.
        </li>
        <li>
          <strong>Profil belajar:</strong> level, tujuan belajar, target menit harian, jenis kelamin (opsional), dan
          avatar.
        </li>
        <li>
          <strong>Kemajuan belajar:</strong> bab yang diselesaikan, jawaban kuis dan ujian, kartu hafalan, XP, dan
          streak.
        </li>
        <li>
          <strong>Percakapan dengan Neko-sensei:</strong> teks percakapan dan rekaman suara yang kamu kirim ke fitur
          tanya jawab.
        </li>
        <li>
          <strong>Keamanan:</strong> sesi login dan catatan aktivitas admin untuk mencegah penyalahgunaan.
        </li>
      </ul>

      <h2>Untuk apa data dipakai</h2>
      <ul>
        <li>Menjalankan akun dan menyimpan kemajuan belajarmu.</li>
        <li>Menyesuaikan materi dengan level dan tujuanmu.</li>
        <li>Menjawab pertanyaan dan percakapan melalui maskot AI.</li>
      </ul>
      <p>Kami tidak menjual data dan tidak memakai data untuk iklan.</p>

      <h2>Layanan pihak ketiga</h2>
      <ul>
        <li>
          <strong>Google Sign-In</strong> untuk login dengan akun Google.
        </li>
        <li>
          <strong>Penyedia AI</strong> (Google Gemini, Groq, Anthropic) yang memproses teks dan rekaman suara
          percakapan dengan Neko-sensei untuk menghasilkan jawaban dan suara.
        </li>
        <li>
          <strong>Vercel</strong> (hosting aplikasi) dan <strong>Neon</strong> (database).
        </li>
      </ul>

      <h2>Menghapus data</h2>
      <p>
        Kirim permintaan ke <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> dari email akunmu. Akun beserta
        kemajuan belajar dan riwayat percakapan akan dihapus paling lambat 30 hari setelah permintaan diterima.
      </p>

      <h2>Anak-anak</h2>
      <p>Pengguna di bawah 13 tahun sebaiknya memakai aplikasi ini dengan izin orang tua atau wali.</p>

      <h2>Perubahan</h2>
      <p>
        Jika kebijakan ini berubah, tanggal di atas akan diperbarui. Lihat juga{" "}
        <Link href="/ketentuan">Ketentuan Layanan</Link>.
      </p>

      <h2>Kontak</h2>
      <p>
        Pertanyaan soal privasi: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </article>
  );
}
