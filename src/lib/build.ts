import { edgeosBase, REPO_URL } from "@/lib/env";

export function buildInfo() {
  const commit = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "unknown";
  return {
    repo: REPO_URL,
    commit,
    commitUrl: commit === "unknown" ? REPO_URL : `${REPO_URL}/tree/${commit}`,
    builtAt: process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
    host: process.env.HOST_NAME || (process.env.VERCEL ? "Vercel" : "not set"),
    deployMethod: process.env.DEPLOY_METHOD ?? "git push to main",
    edgeosBase: edgeosBase(),
  };
}
