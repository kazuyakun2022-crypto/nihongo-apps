import { loadEnv } from "../shared/config/env";
import { prisma } from "../shared/infrastructure/prisma";
import { buildContainer } from "./container";
import { createApp } from "./app";

const env = loadEnv();
const container = buildContainer(env, prisma);
const app = createApp(env, container);

app.listen(env.PORT, () => {
  console.info(`API berjalan di http://localhost:${env.PORT} (AI maskot: ${container.aiMode})`);
});
