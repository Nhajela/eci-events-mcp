import { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { Access } from "@/lib/types";
import { SERVER_INSTRUCTIONS } from "./instructions";

export function buildServer(access: Access, now: Date = new Date()): McpServer {
  const server = new McpServer(
    { name: "eci-events", version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  // Placeholder gateway; Task 9 replaces this registration with registerInitialize().
  server.registerTool(
    "edgeos_initialize",
    { description: "Call first. Loads what this attendee can do.", inputSchema: z.object({}) },
    async () => ({
      content: [
        {
          type: "text" as const,
          text: `Connected to ${access.popup.name} at ${now.toISOString()}`,
        },
      ],
    }),
  );
  return server;
}
