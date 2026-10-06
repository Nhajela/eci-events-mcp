// Optional second opinion on hosting and venue proposals. Sends the proposal
// (event content only, never keys or participants) and the hosting guideline
// to a Gemini model on Vertex AI. Off unless REVIEWER_MODEL is set.
// The request URL carries the API key: never log it or put it in any error.

import { GUIDES } from "@/generated/guides";
import type { ActionName } from "./actions";
import type { Reviewer, ReviewResult } from "./register";

const OFF: ReviewResult = { status: "off", notes: [] };
const FAILED: ReviewResult = { status: "failed", notes: [] };

export const RUBRIC = `You review a proposed change to a community event calendar for Edge City India (a 3-week residential village in Goa) before an AI assistant asks the attendee to confirm it.
Judge it only against the guidelines below. Return JSON {"notes": string[]} with at most 4 short, specific, actionable notes the assistant should raise with the attendee. Return {"notes": []} if it's fine. Don't restate the proposal. Don't invent facts.`;

export const reviewProposal: Reviewer = async (action: ActionName, params, summary) => {
  const model = process.env.REVIEWER_MODEL;
  if (!model) return OFF;
  const project = process.env.GOOGLE_CLOUD_PROJECT;
  const key = process.env.GEMINI_API_KEY;
  if (!project || !key) return FAILED;
  const guide = action.endsWith("venue") ? GUIDES.venues : GUIDES.hosting;
  const url = `https://aiplatform.googleapis.com/v1/projects/${project}/locations/global/publishers/google/models/${model}:generateContent?key=${key}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: AbortSignal.timeout(8000),
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${RUBRIC}\n\n# Guidelines\n${guide}\n\n# Proposal\nAction: ${action}\nSummary: ${summary}\nFields: ${JSON.stringify(params)}`,
              },
            ],
          },
        ],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
    });
    if (!res.ok) return FAILED;
    const j = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = j.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return FAILED;
    const notes = (JSON.parse(text) as { notes?: unknown }).notes;
    return Array.isArray(notes)
      ? { status: "ok", notes: notes.filter((n): n is string => typeof n === "string").slice(0, 4) }
      : FAILED;
  } catch {
    return FAILED;
  }
};
