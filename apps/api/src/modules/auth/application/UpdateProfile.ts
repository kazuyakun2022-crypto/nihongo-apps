import { Errors } from "../../../shared/domain/errors";
import { toPublicUser, type Gender, type PublicUser } from "../domain/User";
import type { UserRepository } from "../domain/ports";

export interface UpdateProfileInput {
  displayName: string;
  gender?: Gender | null;
}

export class UpdateProfile {
  constructor(private readonly deps: { users: UserRepository }) {}

  async execute(userId: string, input: UpdateProfileInput): Promise<PublicUser> {
    const user = await this.deps.users.findById(userId);
    if (!user) {
      throw Errors.notFound("Pengguna");
    }

    const trimmedName = input.displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      throw Errors.validation("Nama panggilan minimal 2 karakter.");
    }
    if (trimmedName.length > 50) {
      throw Errors.validation("Nama panggilan maksimal 50 karakter.");
    }

    const updates: Parameters<UserRepository["update"]>[1] = {
      displayName: trimmedName,
    };

    // Cek apakah jenis kelamin diubah
    const isGenderSpecified = input.gender !== undefined;
    const isGenderChanging = isGenderSpecified && input.gender !== (user.gender ?? null);

    if (isGenderChanging) {
      // Periksa jeda (cooldown) 2 hari = 48 jam
      if (user.genderUpdatedAt) {
        const COOLDOWN_MS = 2 * 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - new Date(user.genderUpdatedAt).getTime();

        if (elapsed < COOLDOWN_MS) {
          const remainingMs = COOLDOWN_MS - elapsed;
          const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
          const availableDate = new Date(new Date(user.genderUpdatedAt).getTime() + COOLDOWN_MS);
          const formattedDate = availableDate.toLocaleString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });

          throw Errors.validation(
            `Jenis kelamin baru dapat diubah kembali setelah jeda 2 hari. Tersisa sekitar ${remainingHours} jam lagi (tersedia pada ${formattedDate}).`
          );
        }
      }

      updates.gender = input.gender ?? null;
      updates.genderUpdatedAt = new Date();
    }

    const updated = await this.deps.users.update(userId, updates);
    return toPublicUser(updated);
  }
}
