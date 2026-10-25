import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, PawIcon } from "@/shared/ui/icons";
import styles from "./auth.module.css";

export function AuthCard({
  title,
  japaneseTitle,
  lead,
  bubbleText,
  children,
}: {
  title: string;
  japaneseTitle?: string;
  lead?: string;
  bubbleText?: string;
  mood?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={styles.page}>
      {/* ──────── Falling Sakura Petals Background ──────── */}
      <div className={styles.sakuraContainer} aria-hidden="true">
        <span className={styles.petal} style={{ left: "10%", animationDuration: "10s, 3s", animationDelay: "0s" }} />
        <span className={styles.petal} style={{ left: "28%", animationDuration: "13s, 4s", animationDelay: "2s" }} />
        <span className={styles.petal} style={{ left: "70%", animationDuration: "11s, 3.5s", animationDelay: "1s" }} />
        <span className={styles.petal} style={{ left: "88%", animationDuration: "14s, 4.5s", animationDelay: "3s" }} />
      </div>

      {/* ──────── Top Back Link & Brand Badge ──────── */}
      <div className={styles.topNav}>
        <Link href="/" className={styles.backLink}>
          <ArrowLeftIcon size={16} />
          <span>Kembali ke Beranda</span>
        </Link>
        <Link href="/" className={styles.brandBadge}>
          <Image
            src="/app-icon.png"
            alt="Nihongo"
            width={32}
            height={32}
            className={styles.brandIcon}
          />
          <span className={styles.brandText}>Nihongo</span>
        </Link>
      </div>

      {/* ──────── Elevated Auth Card ──────── */}
      <section className={styles.card}>
        <div className={styles.header}>
          {bubbleText && (
            <div className={styles.speechBubble}>
              <PawIcon size={14} />
              <span>{bubbleText}</span>
            </div>
          )}

          <div className={styles.mascotWrapper}>
            <div className={styles.mascotAura} />
            <Image
              src="/neko-sensei.png"
              alt="Neko-sensei"
              width={96}
              height={96}
              className={styles.mascotImg}
              priority
            />
          </div>

          <div className={styles.titleArea}>
            {japaneseTitle && <span className={styles.japaneseBadge}>{japaneseTitle}</span>}
            <h1 className={styles.title}>{title}</h1>
            {lead && <p className={styles.lead}>{lead}</p>}
          </div>
        </div>

        {children}
      </section>
    </main>
  );
}
