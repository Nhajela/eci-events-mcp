import { Analytics } from "@/components/analytics";
import {
  ChatIllustration,
  CommunityDisclaimer,
  HeroText,
  TrustFacts,
  UseCases,
} from "./landing-sections";
import { BeginnerGuide, TechyCard } from "./setup/guide";
import { SetupPaths } from "./setup/paths";

export default async function Home() {
  return (
    <>
      <CommunityDisclaimer />
      <main className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <Analytics page="landing" />
        <SetupPaths
          hero={<HeroText />}
          visual={<ChatIllustration />}
          beginner={<BeginnerGuide />}
          techy={<TechyCard />}
        />
        <UseCases />
        <TrustFacts />
      </main>
    </>
  );
}
