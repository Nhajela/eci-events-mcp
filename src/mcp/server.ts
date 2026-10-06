import { McpServer } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { instrumentServer } from "./analytics";
import { registerGuide } from "./guide";
import { registerInitialize } from "./initialize";
import { SERVER_INSTRUCTIONS } from "./instructions";
import type { ContextSection } from "./lib/context";
import { registerPrompts } from "./prompts";
import { proposeContextSection, registerProposeTools } from "./propose/register";
import { reviewProposal } from "./propose/reviewer";
import { readContextSection, registerReadTools } from "./tools/read";

const SECTIONS: ContextSection[] = [readContextSection, proposeContextSection];

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer(
    { name: "eci-events", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  instrumentServer(server, access); // before registrations so every tool is wrapped
  registerInitialize(server, access, now, SECTIONS);
  registerGuide(server, access);
  registerReadTools(server, access, now);
  registerProposeTools(server, access, now, reviewProposal);
  registerPrompts(server);
  return server;
}
