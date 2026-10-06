import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  buildReference,
  type OpenApi,
  type PolicyRule,
  renderGuidesModule,
  renderReferenceModule,
} from "./lib/spec";

const root = path.resolve(import.meta.dirname, "..");
const spec = JSON.parse(
  readFileSync(path.join(root, "spec/edgeos-openapi.json"), "utf-8"),
) as OpenApi;
const policy = JSON.parse(
  readFileSync(path.join(root, "spec/route-policy.json"), "utf-8"),
) as PolicyRule[];

const reference = buildReference(spec, policy);
writeFileSync(path.join(root, "src/generated/reference.ts"), renderReferenceModule(reference));

const guides = Object.fromEntries(
  readdirSync(path.join(root, "guides"))
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => [
      f.replace(/\.md$/, ""),
      readFileSync(path.join(root, "guides", f), "utf-8").trim(),
    ]),
);
writeFileSync(path.join(root, "src/generated/guides.ts"), renderGuidesModule(guides));
console.log(
  `Generated reference (${Object.keys(reference.routes).length} routes) and ${Object.keys(guides).length} guides.`,
);
