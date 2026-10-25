import type { LevelProgress } from "../domain/types";
import styles from "./levelProgress.module.css";

interface Props {
  progress: LevelProgress;
  levelCode: string;
}

export function LevelProgressBar({ progress, levelCode }: Props) {
  const vocabPct =
    progress.vocabTarget > 0
      ? Math.min(100, Math.round((progress.vocabLearned / progress.vocabTarget) * 100))
      : 0;
  const kanjiPct =
    progress.kanjiTarget > 0
      ? Math.min(100, Math.round((progress.kanjiLearned / progress.kanjiTarget) * 100))
      : 0;

  return (
    <div className={styles.wrap}>
      <p className={styles.heading}>Progress {levelCode}</p>

      <div className={styles.row}>
        <div className={styles.label}>
          <span>Kosakata</span>
          <span className={styles.count}>
            {progress.vocabLearned}/{progress.vocabTarget}
          </span>
        </div>
        <div className={styles.bar}>
          <div className={styles.fill} style={{ width: `${vocabPct}%` }} />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.label}>
          <span>Kanji</span>
          <span className={styles.count}>
            {progress.kanjiLearned}/{progress.kanjiTarget}
          </span>
        </div>
        <div className={styles.bar}>
          <div className={`${styles.fill} ${styles.fillKanji}`} style={{ width: `${kanjiPct}%` }} />
        </div>
      </div>

      <p className={styles.chapters}>
        {progress.chaptersCompleted} dari {progress.chaptersTotal} bab selesai
      </p>
    </div>
  );
}
