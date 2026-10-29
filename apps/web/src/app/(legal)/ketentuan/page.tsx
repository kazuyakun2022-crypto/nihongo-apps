import Link from "next/link";
import { CONTACT_EMAIL } from "../contact";
import styles from "../legal.module.css";

export const metadata = { title: "Ketentuan Layanan" };

export default function TermsPage() {
  return (
    <article>
      <h1>Ketentuan Layanan</h1>
      <p className={styles.updated}>Berlaku sejak 28 Oktober 2026</p>

      <p>
        Dengan memakai Nihongo bersama Miu-chan, kamu menyetujui ketentuan berikut. Pengelolaan datamu dijelaskan di{" "}
        <Link href="/privasi">Kebijakan Privasi</Link>.
      </p>

      <h2>Akun</h2>
      <ul>
        <li>Kamu bertanggung jawab menjaga kerahasiaan password akunmu.</li>
        <li>Satu akun untuk satu orang. Data yang kamu isi harus benar.</li>
        <li>Akun yang dipakai untuk penyalahgunaan dapat dinonaktifkan oleh admin.</li>
      </ul>

      <h2>Pemakaian yang wajar</h2>
      <ul>
        <li>Jangan mencoba membobol, membebani, atau mengganggu layanan.</li>
        <li>Jangan memakai fitur percakapan AI untuk konten yang melanggar hukum atau menyinggung orang lain.</li>
      </ul>

      <h2>Konten dan jawaban AI</h2>
      <p>
        Materi pelajaran disusun untuk membantu belajar dan dapat diperbarui sewaktu-waktu. Jawaban Miu-chan dibuat
        oleh AI dan bisa keliru, jadi periksa kembali hal penting dengan sumber lain. Kelulusan tes di aplikasi ini bukan
        sertifikat JLPT resmi.
      </p>

      <h2>Ketersediaan layanan</h2>
      <p>
        Layanan disediakan apa adanya. Kami berusaha menjaganya tetap berjalan, tetapi bisa ada gangguan atau
        pemeliharaan tanpa pemberitahuan.
      </p>

      <h2>Kontak</h2>
      <p>
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>
    </article>
  );
}
