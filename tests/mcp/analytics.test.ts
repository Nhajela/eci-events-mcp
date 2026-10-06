import { describe, expect, it } from "vitest";
import { analyticsBeforeSend } from "@/mcp/analytics";

describe("analytics privacy", () => {
  it("drops parameters and responses, keeps input keys", () => {
    const out = analyticsBeforeSend({
      properties: {
        $mcp_tool_name: "edgeos_get_event",
        $mcp_parameters: { event_id: "e1" },
        $mcp_response: "Sunset Breathwork",
        $mcp_input_keys: ["event_id"],
      },
    });
    expect(out?.properties).toEqual({
      $mcp_tool_name: "edgeos_get_event",
      $mcp_input_keys: ["event_id"],
      $process_person_profile: false,
    });
  });

  it("scrubs keys from any remaining string", () => {
    const out = analyticsBeforeSend({
      properties: { $exception_message: "bad eos_live_AbCdEfGhIjKlMnOpQrStUvWx" },
    });
    expect(JSON.stringify(out)).not.toContain("AbCdEfGh");
  });
});
