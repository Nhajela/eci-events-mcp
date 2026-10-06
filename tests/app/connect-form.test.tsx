import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ConnectedPanel } from "@/app/connect/connect-form";

describe("connect success panel", () => {
  it("announces politely and waits for the attendee to press Continue", () => {
    const html = renderToStaticMarkup(
      <ConnectedPanel
        state={{
          status: "ok",
          redirectTo: "https://app.example.org/cb?code=c",
          scopes: ["events:read"],
          popupName: "Edge City India",
        }}
        clientName="Test App"
        keyPage="https://portal.edgecity.live/portal/agentic-access"
      />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toMatch(/<a[^>]*autofocus=""[^>]*>Continue to Test App<\/a>/i);
    expect(html).not.toContain("Taking you back");
  });
});
