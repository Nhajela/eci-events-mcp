import type { McpServer } from "@modelcontextprotocol/server";

// Exported so /how-it-works shows the exact text each prompt sends.
export const PROMPTS = [
  {
    name: "whats_on_today",
    title: "What's on today",
    description: "Today's events at Edge City India, in IST.",
    text: "Call edgeos_initialize, then list today's events with edgeos_list_events. Group them by morning, afternoon and evening, mark featured ones and any I've RSVPed to, and ask if I want to RSVP to anything.",
  },
  {
    name: "plan_my_week",
    title: "Plan my week",
    description: "Build a week plan from the calendar and your RSVPs.",
    text: "Call edgeos_initialize. Show my RSVPs for the next 7 days (edgeos_list_events with mine: true), then ask what I'm interested in and suggest events that fit around them without clashes. RSVP only through edgeos_propose and edgeos_confirm, one at a time, after I say yes.",
  },
  {
    name: "host_an_event",
    title: "Host an event",
    description: "Plan and create an event, checked before it goes live.",
    text: "Call edgeos_initialize and edgeos_guide with topic hosting. Ask me, one question at a time, for the title, what happens, when (IST), where (show me free venues with edgeos_venue_availability), and capacity. Then use edgeos_propose with action create_event, show me the summary and warnings, and confirm only after I say yes.",
  },
] as const;

export function registerPrompts(server: McpServer): void {
  for (const p of PROMPTS) {
    server.registerPrompt(p.name, { title: p.title, description: p.description }, async () => ({
      messages: [{ role: "user" as const, content: { type: "text" as const, text: p.text } }],
    }));
  }
}
