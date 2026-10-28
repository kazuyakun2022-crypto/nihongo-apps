import { beforeEach, describe, expect, it } from "vitest";
import { UpdateAvatar } from "../src/modules/auth/application/UpdateAvatar";
import { FakeUsers } from "./fakes";

describe("UpdateAvatar Use Case", () => {
  let users: FakeUsers;
  let updateAvatar: UpdateAvatar;

  beforeEach(() => {
    users = new FakeUsers();
    updateAvatar = new UpdateAvatar({ users });
  });

  it("berhasil memasang foto profil pengguna", async () => {
    const user = await users.create({
      displayName: "Budi",
      email: "budi@mail.com",
      passwordHash: "hash123",
      isGuest: false,
      role: "student",
    });

    const dummyAvatar = "data:image/webp;base64,UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==";
    const updated = await updateAvatar.execute(user.id, dummyAvatar);

    expect(updated.avatarUrl).toBe(dummyAvatar);
    const inDb = await users.findById(user.id);
    expect(inDb?.avatarUrl).toBe(dummyAvatar);
  });

  it("berhasil menghapus foto profil pengguna (set to null)", async () => {
    const user = await users.create({
      displayName: "Siti",
      email: "siti@mail.com",
      passwordHash: "hash123",
      isGuest: false,
      role: "student",
    });

    await updateAvatar.execute(user.id, "data:image/webp;base64,dummy");
    const cleared = await updateAvatar.execute(user.id, null);

    expect(cleared.avatarUrl).toBeNull();
    const inDb = await users.findById(user.id);
    expect(inDb?.avatarUrl).toBeNull();
  });
});
