import { describe, expect, it } from "vitest";
import { buildReference, filterSpec, type OpenApi, parsePolicy } from "../../scripts/lib/spec";
import policy from "../../spec/route-policy.json";

const SPEC: OpenApi = {
  openapi: "3.1.0",
  info: { title: "edgeos", version: "0.1.0" },
  paths: {
    "/api/v1/events/portal/events": {
      get: {
        summary: "List Portal Events",
        parameters: [
          {
            name: "popup_id",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Popup",
          },
          {
            name: "event_status",
            in: "query",
            schema: { $ref: "#/components/schemas/EventStatus" },
          },
        ],
        responses: {
          "200": {
            content: { "application/json": { schema: { $ref: "#/components/schemas/ListModel" } } },
          },
        },
      },
      post: {
        summary: "Create Portal Event",
        requestBody: {
          content: { "application/json": { schema: { $ref: "#/components/schemas/EventCreate" } } },
        },
      },
    },
    "/api/v1/event-messages/portal/events/{event_id}": { get: { summary: "List Event Messages" } },
    "/api/v1/humans/me": { get: { summary: "Me" } },
  },
  components: {
    schemas: {
      EventStatus: { type: "string", enum: ["draft", "published"] },
      ListModel: { type: "object", properties: { results: { type: "array" } } },
      EventCreate: {
        type: "object",
        required: ["title"],
        properties: {
          title: { type: "string", description: "Event title" },
          visibility: { $ref: "#/components/schemas/EventVisibility" },
          venue_id: { anyOf: [{ type: "string" }, { type: "null" }] },
        },
      },
      EventVisibility: { type: "string", enum: ["public", "private", "unlisted"] },
      Unused: { type: "object" },
    },
  },
};

describe("filterSpec", () => {
  it("keeps only key-reachable routes and the schemas they reference", () => {
    const f = filterSpec(SPEC, policy);
    expect(Object.keys(f.paths)).toEqual(["/api/v1/events/portal/events"]);
    expect(Object.keys(f.paths["/api/v1/events/portal/events"])).toEqual(["get", "post"]);
    expect(Object.keys(f.components.schemas).sort()).toEqual([
      "EventCreate",
      "EventStatus",
      "EventVisibility",
      "ListModel",
    ]);
  });
});

describe("buildReference", () => {
  it("documents params, body fields, scopes and enums", () => {
    const ref = buildReference(filterSpec(SPEC, policy), policy);
    const list = ref.routes["GET /events/portal/events"];
    expect(list.scopes).toEqual(["events:read"]);
    expect(list.query.find((q) => q.name === "event_status")).toMatchObject({
      type: "EventStatus",
      enum: ["draft", "published"],
    });
    const create = ref.routes["POST /events/portal/events"];
    expect(create.scopes).toEqual(["events:write"]);
    expect(create.body.find((b) => b.name === "title")).toMatchObject({
      required: true,
      type: "string",
      description: "Event title",
    });
    expect(create.body.find((b) => b.name === "venue_id")?.type).toBe("string | null");
    expect(ref.enums.EventVisibility).toEqual(["public", "private", "unlisted"]);
  });
});

describe("parsePolicy", () => {
  it("reads EdgeOS's _PAT_ROUTE_POLICIES tuples", () => {
    const py = `
_PAT_ROUTE_POLICIES: dict[str, tuple] = {
    "GET": (
        ("/api/v1/events/portal/events", False, ("events:read",)),
        ("/api/v1/popups/portal/list", True, ("events:read",)),
    ),
    "POST": (
        (
            "/api/v1/event-participants/portal/cancel-registration/",
            False,
            ("rsvp:write",),
        ),
    ),
}

def _required_scopes_for_pat(method, path):
    pass
`;
    expect(parsePolicy(py)).toEqual([
      {
        method: "GET",
        path: "/api/v1/events/portal/events",
        exact: false,
        scopes: ["events:read"],
      },
      { method: "GET", path: "/api/v1/popups/portal/list", exact: true, scopes: ["events:read"] },
      {
        method: "POST",
        path: "/api/v1/event-participants/portal/cancel-registration/",
        exact: false,
        scopes: ["rsvp:write"],
      },
    ]);
  });
});
