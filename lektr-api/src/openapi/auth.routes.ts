import { createRoute } from "@hono/zod-openapi";
import {
  RegisterSchema,
  LoginSchema,
  AuthSuccessSchema,
  ErrorSchema,
  UserSchema,
  ChangePasswordSchema
} from "./schemas";
import { z } from "@hono/zod-openapi";

// ============================================
// Auth Routes
// ============================================

export const registerRoute = createRoute({
  method: "post",
  path: "/register",
  tags: ["Authentication"],
  summary: "Register a new user",
  description: "Create a new user account. The first user to register becomes an admin.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: RegisterSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: "User created successfully",
      content: {
        "application/json": {
          schema: AuthSuccessSchema,
        },
      },
    },
    400: {
      description: "Email already registered or validation error",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const loginRoute = createRoute({
  method: "post",
  path: "/login",
  tags: ["Authentication"],
  summary: "Login",
  description: "Authenticate with email and password. Sets an HTTP-only cookie.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: LoginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Login successful",
      content: {
        "application/json": {
          schema: AuthSuccessSchema,
        },
      },
    },
    401: {
      description: "Invalid credentials",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const logoutRoute = createRoute({
  method: "post",
  path: "/logout",
  tags: ["Authentication"],
  summary: "Logout",
  description: "Clear the authentication cookie.",
  responses: {
    200: {
      description: "Logged out successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
  },
});

export const meRoute = createRoute({
  method: "get",
  path: "/me",
  tags: ["Authentication"],
  summary: "Get current user",
  description: "Get the currently authenticated user from the session cookie.",
  responses: {
    200: {
      description: "Current user info",
      content: {
        "application/json": {
          schema: z.object({ user: UserSchema }),
        },
      },
    },
    401: {
      description: "Not authenticated",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});

export const changePasswordRoute = createRoute({
  method: "put",
  path: "/password",
  tags: ["Authentication"],
  summary: "Change password",
  description: "Change the authenticated user's password. Requires current password for verification.",
  request: {
    body: {
      content: {
        "application/json": {
          schema: ChangePasswordSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Password changed successfully",
      content: {
        "application/json": {
          schema: z.object({ success: z.boolean() }),
        },
      },
    },
    400: {
      description: "Validation error (e.g., password too short)",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
    401: {
      description: "Not authenticated or invalid current password",
      content: {
        "application/json": {
          schema: ErrorSchema,
        },
      },
    },
  },
});
