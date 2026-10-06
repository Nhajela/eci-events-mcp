import { readFileSync } from "node:fs";
import path from "node:path";
import { type PolicyRule, parsePolicy } from "./lib/spec";

const URL_PY =
  "https://raw.githubusercontent.com/p2p-lanes/edgeos-monorepo/main/backend/app/core/security.py";
const root = path.resolve(import.meta.dirname, "..");
const res = await fetch(URL_PY);
if (!res.ok) throw new Error(`security.py returned ${res.status}`);
const upstream = parsePolicy(await res.text());
const local = JSON.parse(
  readFileSync(path.join(root, "spec/route-policy.json"), "utf-8"),
) as PolicyRule[];
const norm = (r: PolicyRule[]) =>
  JSON.stringify(
    [...r].sort((a, b) => `${a.method}${a.path}`.localeCompare(`${b.method}${b.path}`)),
  );
if (norm(upstream) !== norm(local)) {
  console.error("EdgeOS API-key route policy changed upstream. Update spec/route-policy.json:");
  console.error(JSON.stringify(upstream, null, 2));
  process.exit(1);
}
console.log("Route policy matches upstream.");
