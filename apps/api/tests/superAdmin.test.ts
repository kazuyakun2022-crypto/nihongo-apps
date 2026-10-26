import { describe, expect, it } from "vitest";
import { ChangeUserRole, SuspendUser, UnsuspendUser } from "../src/modules/users/application/UserAdminUseCases";
import type { AuditLogger, UserAdminRepository, UserListItem } from "../src/modules/users/domain/ports";
import type { AuthUser, Clock, Role } from "../src/shared/domain/types";

class FakeAdminRepo implements UserAdminRepository {
  users = new Map<string, UserListItem>();

  async search() {
    return { items: [...this.users.values()], total: this.users.size };
  }
  async findById(id: string) {
    return this.users.get(id) ?? null;
  }
  async update(id: string, data: { role?: Role; status?: "active" | "suspended" | "pending_deletion" }) {
    const existing = this.users.get(id);
    if (existing) {
      this.users.set(id, { ...existing, ...data });
    }
  }
  async revokeAllSessions() {}
  async getStats() {
    return {
      totalUsers: this.users.size,
      activeUsers: this.users.size,
      suspendedUsers: 0,
      roleBreakdown: { guest: 0, student: 0, premium: 0, teacher: 0, admin: 0, super_admin: 0 },
      totalConversations: 0,
      totalChapters: 0,
    };
  }
}

class FakeAuditLogger implements AuditLogger {
  logs: any[] = [];
  async log(entry: any) {
    this.logs.push(entry);
  }
  async list() {
    return { items: this.logs, total: this.logs.length };
  }
}

const fakeClock: Clock = { now: () => new Date("2026-10-25T12:00:00Z") };

describe("Super Admin & Admin Security Invariants", () => {
  const superAdminActor: AuthUser = { id: "sa-1", role: "super_admin" };
  const adminActor: AuthUser = { id: "adm-1", role: "admin" };
  const studentUser: UserListItem = {
    id: "stu-1",
    email: "student@test.com",
    displayName: "Student",
    role: "student",
    status: "active",
    createdAt: new Date(),
    lastLoginAt: null,
  };
  const adminTarget: UserListItem = {
    id: "adm-2",
    email: "admin2@test.com",
    displayName: "Admin 2",
    role: "admin",
    status: "active",
    createdAt: new Date(),
    lastLoginAt: null,
  };
  const superAdminTarget: UserListItem = {
    id: "sa-2",
    email: "sa2@test.com",
    displayName: "Super Admin 2",
    role: "super_admin",
    status: "active",
    createdAt: new Date(),
    lastLoginAt: null,
  };

  it("mencegah admin/super admin mengubah rolenya sendiri", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(superAdminActor.id, { ...superAdminTarget, id: superAdminActor.id });
    const audit = new FakeAuditLogger();
    const uc = new ChangeUserRole({ repo, audit });

    await expect(uc.execute(superAdminActor, superAdminActor.id, "student")).rejects.toThrow(
      "Admin tidak bisa mengubah role akunnya sendiri.",
    );
  });

  it("mencegah admin biasa mempromosikan user menjadi admin atau super_admin", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(studentUser.id, studentUser);
    const audit = new FakeAuditLogger();
    const uc = new ChangeUserRole({ repo, audit });

    await expect(uc.execute(adminActor, studentUser.id, "admin")).rejects.toThrow(
      "Hanya Super Admin yang dapat mengangkat Admin atau Super Admin baru.",
    );

    await expect(uc.execute(adminActor, studentUser.id, "super_admin")).rejects.toThrow(
      "Hanya Super Admin yang dapat mengangkat Admin atau Super Admin baru.",
    );
  });

  it("mencegah admin biasa mengubah role sesama admin atau super_admin", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(adminTarget.id, adminTarget);
    repo.users.set(superAdminTarget.id, superAdminTarget);
    const audit = new FakeAuditLogger();
    const uc = new ChangeUserRole({ repo, audit });

    await expect(uc.execute(adminActor, adminTarget.id, "student")).rejects.toThrow(
      "Hanya Super Admin yang dapat mengubah role akun Admin atau Super Admin.",
    );

    await expect(uc.execute(adminActor, superAdminTarget.id, "student")).rejects.toThrow(
      "Hanya Super Admin yang dapat mengubah role akun Admin atau Super Admin.",
    );
  });

  it("mengizinkan Super Admin mempromosikan user menjadi admin", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(studentUser.id, studentUser);
    const audit = new FakeAuditLogger();
    const uc = new ChangeUserRole({ repo, audit });

    await uc.execute(superAdminActor, studentUser.id, "admin");
    expect(repo.users.get(studentUser.id)?.role).toBe("admin");
    expect(audit.logs[0].action).toBe("change_role");
  });

  it("mencegah suspend terhadap akun Super Admin", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(superAdminTarget.id, superAdminTarget);
    const audit = new FakeAuditLogger();
    const uc = new SuspendUser({ repo, audit, clock: fakeClock });

    await expect(uc.execute(adminActor, superAdminTarget.id, "alasan")).rejects.toThrow(
      "Akun Super Admin memiliki imunitas dan tidak dapat di-suspend.",
    );

    await expect(uc.execute(superAdminActor, superAdminTarget.id, "alasan")).rejects.toThrow(
      "Akun Super Admin memiliki imunitas dan tidak dapat di-suspend.",
    );
  });

  it("mencegah admin biasa men-suspend sesama admin", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(adminTarget.id, adminTarget);
    const audit = new FakeAuditLogger();
    const uc = new SuspendUser({ repo, audit, clock: fakeClock });

    await expect(uc.execute(adminActor, adminTarget.id, "alasan")).rejects.toThrow(
      "Hanya Super Admin yang dapat men-suspend akun Admin.",
    );
  });

  it("mengizinkan Super Admin men-suspend akun admin dan unsuspend kembali", async () => {
    const repo = new FakeAdminRepo();
    repo.users.set(adminTarget.id, adminTarget);
    const audit = new FakeAuditLogger();
    const suspendUc = new SuspendUser({ repo, audit, clock: fakeClock });
    const unsuspendUc = new UnsuspendUser({ repo, audit });

    await suspendUc.execute(superAdminActor, adminTarget.id, "Pelanggaran serius");
    expect(repo.users.get(adminTarget.id)?.status).toBe("suspended");

    await unsuspendUc.execute(superAdminActor, adminTarget.id);
    expect(repo.users.get(adminTarget.id)?.status).toBe("active");
  });

  it("memastikan Super Admin dan Admin bukan akun pelajar (tidak dapat belajar)", async () => {
    const { canAccessLevel } = await import("../src/modules/learning/domain/Learning");
    const regularLevel = { id: 1, code: "N5", name: "Level 1", sortOrder: 1, isPremium: false };
    const premiumLevel = { id: 2, code: "N4", name: "Level 2", sortOrder: 2, isPremium: true };

    // Siswa dan premium bisa belajar
    expect(canAccessLevel(regularLevel, "student")).toBe(true);
    expect(canAccessLevel(premiumLevel, "premium")).toBe(true);
    expect(canAccessLevel(premiumLevel, "teacher")).toBe(true);

    // Super Admin dan Admin DILARANG belajar level siswa
    expect(canAccessLevel(regularLevel, "admin")).toBe(false);
    expect(canAccessLevel(regularLevel, "super_admin")).toBe(false);
    expect(canAccessLevel(premiumLevel, "admin")).toBe(false);
    expect(canAccessLevel(premiumLevel, "super_admin")).toBe(false);
  });
});
