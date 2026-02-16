import { OpenAPIHono } from "@hono/zod-openapi";
import { getCapabilitiesRoute } from "./capabilities.routes";

export const capabilitiesOpenAPI = new OpenAPIHono();

// GET / - Returns instance capabilities (no auth required)
capabilitiesOpenAPI.openapi(getCapabilitiesRoute, async (c) => {
  return c.json(
    {
      cloud: false,
      billing: false,
      teams: false,
      sso: false,
    },
    200
  );
});
