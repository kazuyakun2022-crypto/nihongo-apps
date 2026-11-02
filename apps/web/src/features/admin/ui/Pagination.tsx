"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./pagination.module.css";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  /** Tanpa ini pilihan jumlah baris tidak ditampilkan (mis. ukuran halaman ditentukan server). */
  onPageSize?: (size: number) => void;
  pageSizes?: number[];
  /** Satuan data, mis. "bab" atau "pengguna". */
  unit?: string;
}

/** Nomor halaman yang ditampilkan: selalu halaman pertama, terakhir, dan dua di sekitar halaman aktif. */
function pageList(page: number, pages: number): (number | "gap")[] {
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

export function Pagination({ page, pageSize, total, onPage, onPageSize, pageSizes = [10, 20, 50, 100], unit = "data" }: PaginationProps) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav className={styles.pager} aria-label="Navigasi halaman">
      <span className={styles.info}>
        {from.toLocaleString("id-ID")}–{to.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")} {unit}
      </span>
      <div className={styles.controls}>
        {onPageSize && (
          <select className={styles.size} value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))} aria-label="Jumlah baris per halaman">
            {pageSizes.map((n) => (
              <option key={n} value={n}>
                {n} / halaman
              </option>
            ))}
          </select>
        )}
        {pages > 1 && (
          <>
            <button type="button" className={styles.btn} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Halaman sebelumnya">
              ‹
            </button>
            {pageList(page, pages).map((p, i) =>
              p === "gap" ? (
                <span key={`gap${i}`} className={styles.gap} aria-hidden>
                  …
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  className={styles.btn}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`Halaman ${p}`}
                  onClick={() => onPage(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button type="button" className={styles.btn} disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Halaman berikutnya">
              ›
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

/**
 * Pagination di browser untuk daftar yang sudah dimuat utuh. Kembali ke halaman 1 saat `resetKey`
 * berubah (mis. filter atau level diganti) dan menyesuaikan diri bila daftarnya memendek.
 */
export function usePaged<T>(items: T[], resetKey: unknown = null, initialSize = 20) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialSize);

  useEffect(() => setPage(1), [resetKey]);

  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, pages);
  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);

  return {
    pageItems,
    offset: (current - 1) * pageSize,
    pagerProps: {
      page: current,
      pageSize,
      total: items.length,
      onPage: setPage,
      onPageSize: (size: number) => {
        setPageSize(size);
        setPage(1);
      },
    },
  };
}

/** Membungkus daftar yang sudah dimuat utuh dengan pagination; `children` merender potongan halaman aktif. */
export function Paged<T>({
  items,
  unit,
  pageSize = 10,
  children,
}: {
  items: T[];
  unit: string;
  pageSize?: number;
  children: (pageItems: T[], offset: number) => ReactNode;
}) {
  const { pageItems, offset, pagerProps } = usePaged(items, null, pageSize);
  return (
    <>
      {children(pageItems, offset)}
      <Pagination {...pagerProps} unit={unit} pageSizes={[10, 20, 50]} />
    </>
  );
}
