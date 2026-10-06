import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { filterSpec, type OpenApi, type PolicyRule } from "./lib/spec";

const root = path.resolve(import.meta.dirname, "..");
const base = (process.env.EDGEOS_API_BASE ?? "https://api.edgeos.world").replace(/\/+$/, "");
const res = await fetch(`${base}/openapi.json`);
if (!res.ok) throw new Error(`openapi.json returned ${res.status}`);
const spec = (await res.json()) as OpenApi;
const policy = JSON.parse(
  readFileSync(path.join(root, "spec/route-policy.json"), "utf-8"),
) as PolicyRule[];
writeFileSync(
  path.join(root, "spec/edgeos-openapi.json"),
  `${JSON.stringify(filterSpec(spec, policy), null, 2)}\n`,
);
execFileSync("pnpm", ["spec:gen"], {
  stdio: "inherit",
  cwd: root,
  shell: process.platform === "win32",
});
