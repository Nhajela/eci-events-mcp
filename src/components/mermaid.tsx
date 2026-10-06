"use client";

import { useEffect, useId, useState } from "react";

export function Mermaid({ chart, caption }: { chart: string; caption: string }) {
  const id = useId().replace(/:/g, "");
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    import("mermaid").then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
      const { svg } = await mermaid.render(`m${id}`, chart);
      if (alive) setSvg(svg);
    });
    return () => {
      alive = false;
    };
  }, [chart, id]);
  return (
    <figure className="my-6 overflow-x-auto rounded-xl border border-neutral-200 bg-neutral-50 p-4">
      {svg ? (
        // biome-ignore lint/security/noDangerouslySetInnerHtml: SVG produced by mermaid in strict mode from our own static chart text
        <div dangerouslySetInnerHTML={{ __html: svg }} />
      ) : (
        <pre className="text-xs text-neutral-500">{chart}</pre>
      )}
      <figcaption className="mt-2 text-sm text-neutral-600">{caption}</figcaption>
    </figure>
  );
}
