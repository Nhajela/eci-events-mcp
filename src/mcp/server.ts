import { McpServer } from "@modelcontextprotocol/server";
import type { Access } from "@/lib/types";
import { registerGuide } from "./guide";
import { registerInitialize } from "./initialize";
import { SERVER_INSTRUCTIONS } from "./instructions";
import type { ContextSection } from "./lib/context";
import { proposeContextSection, registerProposeTools } from "./propose/register";
import { readContextSection, registerReadTools } from "./tools/read";

const SECTIONS: ContextSection[] = [readContextSection, proposeContextSection];

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer(
    { name: "eci-events", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerInitialize(server, access, now, SECTIONS);
  registerGuide(server, access);
  registerReadTools(server, access, now);
  registerProposeTools(server, access, now);
  return server;
}
