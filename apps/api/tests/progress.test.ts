import { describe, expect, it } from "vitest";
import { localDay, nextStreak, visibleStreak } from "../src/modules/progress/domain/streak";
import { ACHIEVEMENTS, candidatesFor } from "../src/modules/progress/domain/achievements";

const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

describe("streak harian", () => {
  it("memakai tanggal WIB, bukan UTC", () => {
    // 2026-11-05 18:00 UTC = 2026-11-06 01:00 WIB
    expect(localDay(new Date("2026-11-05T18:00:00Z"))).toBe("2026-11-06");
    expect(localDay(new Date("2026-11-05T16:59:00Z"))).toBe("2026-11-05");
  });

  it("aktivitas pertama memulai streak 1", () => {
    expect(nextStreak(0, null, new Date("2026-11-05T03:00:00Z"))).toMatchObject({ streak: 1, today: "2026-11-05", isNewDay: true });
  });

  it("aktivitas kedua di hari yang sama tidak menambah streak", () => {
    expect(nextStreak(4, day("2026-11-05"), new Date("2026-11-05T10:00:00Z"))).toMatchObject({ streak: 4, isNewDay: false });
  });

  it("hari berikutnya menambah streak", () => {
    expect(nextStreak(4, day("2026-11-04"), new Date("2026-11-05T10:00:00Z")).streak).toBe(5);
  });

  it("melewatkan satu hari mengulang streak dari 1", () => {
    expect(nextStreak(9, day("2026-11-03"), new Date("2026-11-05T10:00:00Z")).streak).toBe(1);
  });

  it("streak yang ditampilkan jadi 0 setelah melewatkan satu hari penuh", () => {
    const now = new Date("2026-11-05T10:00:00Z");
    expect(visibleStreak(6, day("2026-11-05"), now)).toBe(6);
    expect(visibleStreak(6, day("2026-11-04"), now)).toBe(6);
    expect(visibleStreak(6, day("2026-11-03"), now)).toBe(0);
    expect(visibleStreak(6, null, now)).toBe(0);
  });
});

describe("lencana", () => {
  it("kode lencana unik", () => {
    const codes = ACHIEVEMENTS.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("hanya mengecek lencana yang relevan dan belum dimiliki", () => {
    const codes = candidatesFor("srs_review", new Set(["streak_3"])).map((a) => a.code);
    expect(codes).toContain("srs_50");
    expect(codes).toContain("streak_7");
    expect(codes).not.toContain("streak_3");
    expect(codes).not.toContain("first_chat");
  });
});
