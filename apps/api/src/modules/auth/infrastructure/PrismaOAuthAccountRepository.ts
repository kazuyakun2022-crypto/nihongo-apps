import type { Db } from "../../../shared/infrastructure/prisma";
import type { OAuthAccountRepository, OAuthProviderName } from "../domain/ports";

export class PrismaOAuthAccountRepository implements OAuthAccountRepository {
  constructor(private readonly db: Db) {}

  async findUserId(provider: OAuthProviderName, providerUserId: string): Promise<string | null> {
    const row = await this.db.oAuthAccount.findUnique({
      where: { provider_providerUserId: { provider, providerUserId } },
      select: { userId: true },
    });
    return row?.userId ?? null;
  }

  async link(userId: string, provider: OAuthProviderName, providerUserId: string, email: string | null): Promise<void> {
    await this.db.oAuthAccount.create({ data: { userId, provider, providerUserId, email } });
  }
}
