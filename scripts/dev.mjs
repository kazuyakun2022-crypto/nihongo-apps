import { spawn } from "node:child_process";

const isWindows = process.platform === "win32";
const npmCmd = isWindows ? "npm.cmd" : "npm";

function run(label, args) {
  const child = spawn(npmCmd, args, { stdio: "inherit", shell: true });
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      console.log(`[${label}] exited with code ${code}`);
    }
  });
  return child;
}

console.log("Starting NihonGo Dev Servers (API + Web)...");
const api = run("API", ["run", "dev:api"]);
const web = run("WEB", ["run", "dev:web"]);

const cleanup = () => {
  api.kill();
  web.kill();
  process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
