/**
 * Capabilities API Integration Tests
 *
 * Tests HTTP behavior of the capabilities endpoint:
 * - Public access (no auth required)
 * - Response shape and default values for self-hosted instances
 */
import { describe, test, expect, beforeEach } from "vitest";
import { Hono } from "hono";

describe("Capabilities API", () => {
  let app: Hono;

  beforeEach(async () => {
    const { capabilitiesOpenAPI } = await import(
      "../../src/openapi/capabilities.handlers"
    );
    app = new Hono();
    app.route("/capabilities", capabilitiesOpenAPI);
  });

  describe("GET /capabilities", () => {
    test("should return capabilities without auth", async () => {
      const res = await app.request("/capabilities");

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toEqual({
        cloud: false,
        billing: false,
        teams: false,
        sso: false,
      });
    });

    test("should return all expected capability keys", async () => {
      const res = await app.request("/capabilities");
      const body = await res.json();

      expect(body).toHaveProperty("cloud");
      expect(body).toHaveProperty("billing");
      expect(body).toHaveProperty("teams");
      expect(body).toHaveProperty("sso");
    });

    test("should return JSON content type", async () => {
      const res = await app.request("/capabilities");

      expect(res.headers.get("content-type")).toContain("application/json");
    });
  });
});
