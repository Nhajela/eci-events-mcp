import { buildInfo } from "@/lib/build";

export function BuildBox() {
  const b = buildInfo();
  return (
    <section className="rounded-xl border border-neutral-200 p-5">
      <h3 className="font-display text-lg font-semibold">Where this runs</h3>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-neutral-600">Code</dt>
        <dd>
          <a className="underline" href={b.repo}>
            {b.repo.replace("https://", "")}
          </a>{" "}
          (public)
        </dd>
        <dt className="text-neutral-600">Running commit</dt>
        <dd className="font-mono break-all">
          <a className="underline" href={b.commitUrl}>
            {b.commit.slice(0, 12)}
          </a>
        </dd>
        <dt className="text-neutral-600">Built</dt>
        <dd>{b.builtAt}</dd>
        <dt className="text-neutral-600">Host</dt>
        <dd>{b.host}</dd>
        <dt className="text-neutral-600">Deployed by</dt>
        <dd>{b.deployMethod}</dd>
      </dl>
      <p className="mt-3 text-sm text-neutral-600">
        Live data:{" "}
        <a className="underline" href="/api/build-info">
          /api/build-info
        </a>
      </p>
    </section>
  );
}
