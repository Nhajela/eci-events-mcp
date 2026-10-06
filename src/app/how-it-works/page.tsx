import { Analytics } from "@/components/analytics";
import { Tabs } from "@/components/tabs";
import { getCatalog } from "@/mcp/catalog";
import { Curious, NewToThis, Technical } from "./layers";

export const revalidate = 3600;

export default async function HowItWorks() {
  const { tools, prompts } = await getCatalog();
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Analytics page="how_it_works" />
      <a className="text-sm text-teal-800 underline" href="/">
        ← Connect guide
      </a>
      <h1 className="mt-4 font-display text-4xl font-bold">I don't know how this works</h1>
      <p className="mt-3 text-lg text-neutral-700">
        Here's everything this connector tells your AI and every action it can take, explained three
        ways. Pick your depth.
      </p>
      <div className="mt-8">
        <Tabs
          tabs={[
            { id: "new", label: "New to this", content: <NewToThis /> },
            { id: "curious", label: "Curious", content: <Curious tools={tools} /> },
            {
              id: "technical",
              label: "Technical",
              content: <Technical tools={tools} prompts={prompts} />,
            },
          ]}
        />
      </div>
    </main>
  );
}
