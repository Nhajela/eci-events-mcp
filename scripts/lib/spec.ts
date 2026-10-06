export type PolicyRule = { method: string; path: string; exact: boolean; scopes: string[] };
type Schema = Record<string, unknown>;
type Operation = {
  summary?: string;
  description?: string;
  parameters?: {
    name: string;
    in: string;
    required?: boolean;
    description?: string;
    schema?: Schema;
  }[];
  requestBody?: { content?: Record<string, { schema?: Schema }> };
  responses?: Record<string, unknown>;
};
export type OpenApi = {
  openapi: string;
  info: { title: string; version: string };
  paths: Record<string, Record<string, Operation>>;
  components: { schemas: Record<string, Schema> };
};
export type ParamDoc = {
  name: string;
  required: boolean;
  type: string;
  description: string;
  enum?: string[];
};
export type RouteDoc = {
  method: string;
  path: string;
  summary: string;
  scopes: string[];
  query: ParamDoc[];
  body: ParamDoc[];
};
export type Reference = {
  version: string;
  routes: Record<string, RouteDoc>;
  enums: Record<string, string[]>;
};

const METHODS = ["get", "post", "patch", "put", "delete"];
const PREFIX = "/api/v1";

export function policyFor(
  policy: PolicyRule[],
  method: string,
  path: string,
): PolicyRule | undefined {
  return policy.find(
    (r) =>
      r.method === method.toUpperCase() && (r.exact ? path === r.path : path.startsWith(r.path)),
  );
}

function refName(s: Schema | undefined): string | undefined {
  const ref = s?.$ref;
  return typeof ref === "string" ? ref.split("/").pop() : undefined;
}

function collectRefs(node: unknown, out: Set<string>, schemas: Record<string, Schema>): void {
  if (Array.isArray(node)) {
    for (const n of node) collectRefs(n, out, schemas);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const [k, v] of Object.entries(node)) {
    if (k === "$ref" && typeof v === "string") {
      const name = v.split("/").pop() as string;
      if (!out.has(name)) {
        out.add(name);
        collectRefs(schemas[name], out, schemas);
      }
    } else collectRefs(v, out, schemas);
  }
}

export function filterSpec(spec: OpenApi, policy: PolicyRule[]): OpenApi {
  const paths: OpenApi["paths"] = {};
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      if (!METHODS.includes(method) || !policyFor(policy, method, path)) continue;
      paths[path] ??= {};
      paths[path][method] = op;
    }
  }
  const used = new Set<string>();
  collectRefs(paths, used, spec.components.schemas);
  const schemas = Object.fromEntries(
    Object.entries(spec.components.schemas).filter(([n]) => used.has(n)),
  );
  return { openapi: spec.openapi, info: spec.info, paths, components: { schemas } };
}

function typeOf(s: Schema | undefined): string {
  if (!s) return "unknown";
  const r = refName(s);
  if (r) return r;
  if (Array.isArray(s.anyOf)) return (s.anyOf as Schema[]).map(typeOf).join(" | ");
  if (s.type === "array") return `${typeOf(s.items as Schema)}[]`;
  return String(s.type ?? "unknown");
}

function enumOf(s: Schema | undefined, schemas: Record<string, Schema>): string[] | undefined {
  if (!s) return undefined;
  if (Array.isArray(s.enum)) return s.enum as string[];
  const r = refName(s);
  if (r && Array.isArray(schemas[r]?.enum)) return schemas[r].enum as string[];
  if (Array.isArray(s.anyOf)) {
    for (const a of s.anyOf as Schema[]) {
      const e = enumOf(a, schemas);
      if (e) return e;
    }
  }
  return undefined;
}

function bodyFields(op: Operation, schemas: Record<string, Schema>): ParamDoc[] {
  const raw = op.requestBody?.content?.["application/json"]?.schema;
  let s = raw;
  const r =
    refName(raw) ??
    (Array.isArray(raw?.anyOf) ? (raw.anyOf as Schema[]).map(refName).find(Boolean) : undefined);
  if (r) s = schemas[r];
  const props = (s?.properties ?? {}) as Record<string, Schema>;
  const required = new Set((s?.required as string[]) ?? []);
  return Object.entries(props).map(([name, p]) => ({
    name,
    required: required.has(name),
    type: typeOf(p),
    description: String(p.description ?? ""),
    ...(enumOf(p, schemas) ? { enum: enumOf(p, schemas) } : {}),
  }));
}

export function buildReference(spec: OpenApi, policy: PolicyRule[]): Reference {
  const routes: Reference["routes"] = {};
  const schemas = spec.components.schemas;
  for (const [path, ops] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(ops)) {
      const rule = policyFor(policy, method, path);
      if (!rule) continue;
      const short = path.startsWith(PREFIX) ? path.slice(PREFIX.length) : path;
      routes[`${method.toUpperCase()} ${short}`] = {
        method: method.toUpperCase(),
        path: short,
        summary: op.summary ?? "",
        scopes: rule.scopes.filter((s) => s !== "venues:read"),
        query: (op.parameters ?? [])
          .filter((p) => p.in === "query")
          .map((p) => ({
            name: p.name,
            required: Boolean(p.required),
            type: typeOf(p.schema),
            description: p.description ?? "",
            ...(enumOf(p.schema, schemas) ? { enum: enumOf(p.schema, schemas) } : {}),
          })),
        body: bodyFields(op, schemas),
      };
    }
  }
  const enums = Object.fromEntries(
    Object.entries(schemas)
      .filter(([, s]) => Array.isArray(s.enum))
      .map(([n, s]) => [n, s.enum as string[]]),
  );
  return { version: spec.info.version, routes, enums };
}

export function parsePolicy(py: string): PolicyRule[] {
  const block = py.match(/_PAT_ROUTE_POLICIES[^=]*=\s*\{([\s\S]*?)\n\}/);
  if (!block) throw new Error("_PAT_ROUTE_POLICIES not found");
  const rules: PolicyRule[] = [];
  const methodRe = /"(GET|POST|PATCH|PUT|DELETE)"\s*:\s*\(([\s\S]*?)\n\s{4}\),/g;
  for (const m of block[1].matchAll(methodRe)) {
    const tupleRe = /\(\s*"([^"]+)"\s*,\s*(True|False)\s*,\s*\(([^)]*)\)\s*,?\s*\)/g;
    for (const t of m[2].matchAll(tupleRe)) {
      rules.push({
        method: m[1],
        path: t[1],
        exact: t[2] === "True",
        scopes: [...t[3].matchAll(/"([^"]+)"/g)].map((s) => s[1]),
      });
    }
  }
  return rules;
}

export function renderReferenceModule(ref: Reference): string {
  return `// Generated by scripts/gen-reference.ts from spec/edgeos-openapi.json. Do not edit.
export type ParamDoc = { name: string; required: boolean; type: string; description: string; enum?: string[] };
export type RouteDoc = { method: string; path: string; summary: string; scopes: string[]; query: ParamDoc[]; body: ParamDoc[] };
export const SPEC_VERSION = ${JSON.stringify(ref.version)};
export const ROUTES: Record<string, RouteDoc> = ${JSON.stringify(ref.routes, null, 2)};
export const ENUMS: Record<string, string[]> = ${JSON.stringify(ref.enums, null, 2)};
`;
}

export function renderGuidesModule(guides: Record<string, string>): string {
  return `// Generated by scripts/gen-reference.ts from guides/*.md. Do not edit.
export const GUIDES = ${JSON.stringify(guides, null, 2)} as const;
export type GuideTopic = keyof typeof GUIDES;
`;
}
