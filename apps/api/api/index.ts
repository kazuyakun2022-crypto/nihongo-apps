// Entry Vercel: vercel.json mengarahkan semua path ke fungsi ini, lalu Express yang memilih route.
import { loadEnv } from "../src/shared/config/env";
import { prisma } from "../src/shared/infrastructure/prisma";
import { buildContainer } from "../src/main/container";
import { createApp } from "../src/main/app";

const env = loadEnv();

export default createApp(env, buildContainer(env, prisma));
