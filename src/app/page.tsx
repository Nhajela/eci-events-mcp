import { Analytics } from "@/components/analytics";
import { HeroChat } from "./hero-chat";
import { CommunityDisclaimer } from "./landing-sections";

// Show, don't tell: the hero is the whole page; "See how" opens the tutorial.
export default async function Home() {
  return (
    <>
      <CommunityDisclaimer />
      <main>
        <Analytics page="landing" />
        <section className="relative isolate flex min-h-svh flex-col items-center overflow-hidden bg-[#e9c79a] px-4 pt-14 pb-16 text-center sm:px-6 sm:pt-20">
          <picture className="absolute inset-0 -z-10">
            <source media="(max-width: 639px)" srcSet="/landing/beach-tall.webp" />
            <img
              src="/landing/beach-wide.webp"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
            />
          </picture>
          <h1 className="max-w-5xl font-display text-[clamp(2.6rem,8vw,6.5rem)] font-extrabold uppercase leading-[0.92] tracking-tight text-teal-950 [font-stretch:80%]">
            Let your AI agents handle your Edge City events
          </h1>
          <div className="mt-8 w-full sm:mt-10">
            <HeroChat />
          </div>
          <a
            href="/setup"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-teal-950 px-10 py-4 text-lg font-semibold text-white shadow-lg hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-950"
          >
            See how
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
        </section>
      </main>
    </>
  );
}
