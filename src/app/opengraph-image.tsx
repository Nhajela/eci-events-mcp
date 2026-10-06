// Social preview card (Open Graph). Drawn in code so it stays crisp and
// truthful: the value proposition plus a short example chat, no stock art.

import { ImageResponse } from "next/og";

export const alt =
  "Edge City India - Events MCP (Community Built): use your own Claude or ChatGPT to find, RSVP to and host Edge City India events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TEAL = "#0f766e";
const INK = "#0b1f1d";
const MUTED = "#4b5f5c";

function Bubble({ you, children }: { you?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{ display: "flex", justifyContent: you ? "flex-end" : "flex-start", width: "100%" }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          maxWidth: 440,
          padding: "14px 18px",
          borderRadius: 22,
          fontSize: 22,
          lineHeight: 1.35,
          background: you ? TEAL : "#ffffff",
          color: you ? "#ffffff" : INK,
          boxShadow: you ? "none" : "0 2px 8px rgba(11,31,29,0.10)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#f6faf9",
        color: INK,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: "16px 56px",
          background: "#fde68a",
          color: "#451a03",
          fontSize: 22,
        }}
      >
        Community built · not an official Edge City app · your EdgeOS key is never stored
      </div>
      <div style={{ display: "flex", flex: 1, padding: "44px 56px", gap: 48 }}>
        <div
          style={{ display: "flex", flexDirection: "column", flex: 1.15, justifyContent: "center" }}
        >
          <div style={{ fontSize: 24, color: TEAL, letterSpacing: 2, textTransform: "uppercase" }}>
            Edge City India · Mandrem, Goa
          </div>
          <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.08, marginTop: 18 }}>
            Use your own Claude or ChatGPT for Edge City events
          </div>
          <div style={{ fontSize: 26, color: MUTED, marginTop: 22, lineHeight: 1.35 }}>
            Find what's on, RSVP, plan your week and host events, in plain words.
          </div>
          <div
            style={{ display: "flex", marginTop: 30, fontSize: 24, color: TEAL, fontWeight: 700 }}
          >
            Events MCP · 11 Oct – 1 Nov 2026
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
            gap: 14,
            padding: 22,
            borderRadius: 28,
            background: "#e7efed",
          }}
        >
          <Bubble you>What's on tonight?</Bubble>
          <Bubble>
            <div style={{ display: "flex", fontWeight: 700 }}>3 events tonight (IST)</div>
            <div style={{ display: "flex" }}>6:30 PM · Sunset Breathwork</div>
            <div style={{ display: "flex" }}>7:30 PM · Builders' dinner talk</div>
            <div style={{ display: "flex" }}>Want me to RSVP?</div>
          </Bubble>
          <Bubble you>Yes, the breathwork.</Bubble>
          <Bubble>RSVP to Sunset Breathwork, 6:30 PM IST. Confirm?</Bubble>
        </div>
      </div>
    </div>,
    size,
  );
}
