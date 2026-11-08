/** Garis bawah pada soal ditulis sebagai <u>kata</u> di bank soal; selain tag ini, teks tampil apa adanya (bukan HTML). */
export function MarkedText({ text }: { text: string }) {
  const parts = text.split(/<u>(.*?)<\/u>/g);
  return <>{parts.map((p, i) => (i % 2 === 1 ? <u key={i}>{p}</u> : p))}</>;
}
