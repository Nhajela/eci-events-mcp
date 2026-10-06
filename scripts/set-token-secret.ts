// Generates a TOKEN_SECRETS value and hands it straight to the host without
// printing it, so the operator never holds the secret.
//   pnpm secret:new --vercel production   pipes into `vercel env add TOKEN_SECRETS production --sensitive`
//   pnpm secret:new --pipe | <your host's secret command reading stdin>
// Rotating TOKEN_SECRETS signs every attendee out.

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const secret = randomBytes(32).toString("base64url");
const args = process.argv.slice(2);

if (args[0] === "--pipe") {
  process.stdout.write(secret);
} else if (args[0] === "--vercel") {
  const env = args[1] ?? "production";
  const r = spawnSync("vercel", ["env", "add", "TOKEN_SECRETS", env, "--sensitive"], {
    input: secret,
    stdio: ["pipe", "inherit", "inherit"],
    shell: process.platform === "win32",
  });
  if (r.status !== 0) process.exit(r.status ?? 1);
  console.error(
    `TOKEN_SECRETS set for ${env} as a sensitive (write-only) variable. It was never printed.`,
  );
} else {
  console.error("Usage: pnpm secret:new --vercel <environment> | --pipe");
  process.exit(2);
}
