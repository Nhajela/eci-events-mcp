import { Analytics } from "@/components/analytics";
import { CommunityDisclaimer, Hero, TrackingNote, UseCases } from "./landing-sections";
import { BeginnerGuide, TechyCard } from "./setup/guide";
import { SetupPaths } from "./setup/paths";

export default async function Home() {
  return (
    <>
      <CommunityDisclaimer />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Analytics page="landing" />
        <Hero />

        <section id="setup" className="mt-12 scroll-mt-6">
          <SetupPaths techy={<TechyCard />} beginner={<BeginnerGuide />} />
        </section>

        <UseCases />

        <section className="mt-14 grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-5">
            <h2 className="font-display text-xl font-semibold">Why you can trust this</h2>
            <p className="mt-2 text-neutral-700">
              We never store your key. Your AI never sees it. It travels locked inside a token only
              this server can open, and only for the moment it's needed.
            </p>
            <a className="mt-3 inline-block font-medium text-teal-800 underline" href="/trust">
              How this works, in detail
            </a>
          </div>
          <div className="rounded-xl border border-neutral-200 p-5">
            <h2 className="font-display text-xl font-semibold">Where this runs</h2>
            <p className="mt-2 text-neutral-700">
              The code is public on GitHub, and the page shows exactly which version is live, so you
              or your AI can check it.
            </p>
            <a
              className="mt-3 inline-block font-medium text-teal-800 underline"
              href="/trust#where"
            >
              See the running version
            </a>
          </div>
        </section>

        <div className="max-w-3xl">
          <TrackingNote />
        </div>

        <p className="mt-8 text-neutral-700">
          Want to see exactly what your AI is told?{" "}
          <a className="font-medium text-teal-800 underline" href="/how-it-works">
            I don't know how this works
          </a>
        </p>
      </main>
    </>
  );
}
