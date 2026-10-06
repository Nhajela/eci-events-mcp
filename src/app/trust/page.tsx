import { Analytics } from "@/components/analytics";
import { BuildBox } from "@/components/build-box";
import { Tabs } from "@/components/tabs";
import { Analogy, Plain, Technical, Verify } from "./content";

export default async function Trust() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="trust" />
      <a className="text-sm text-teal-800 underline" href="/">
        ← Connect guide
      </a>
      <h1 className="mt-4 font-display text-4xl font-bold">How is this safe?</h1>
      <p className="mt-3 text-lg text-neutral-700">
        Your EdgeOS key lets an AI act as you on the Edge City calendar. Here's exactly what happens
        to it, at whatever depth you like.
      </p>
      <div className="mt-8">
        <Tabs
          tabs={[
            { id: "plain", label: "In plain words", content: <Plain /> },
            { id: "analogy", label: "Analogy", content: <Analogy /> },
            { id: "technical", label: "Technical", content: <Technical /> },
            { id: "verify", label: "Verify it yourself", content: <Verify /> },
          ]}
        />
      </div>
      <div id="where" className="mt-12">
        <BuildBox />
      </div>
    </main>
  );
}
