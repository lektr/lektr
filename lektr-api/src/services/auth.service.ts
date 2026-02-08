import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users } from "../db/schema";
import { tokenService, type TokenPayload } from "./token.service";

export interface AuthUser {
  id: string;
  email: string;
  role: "user" | "admin";
}

export interface SignUpResult {
  user: AuthUser;
  token: string;
}

export interface SignInResult {
  user: AuthUser;
  token: string;
}

/**
 * AuthService handles high-level authentication logic.
 *
 * This service is the main entry point for auth operations. It uses:
 * - `TokenService` for JWT signing/verification.
 * - `bcrypt` for password hashing.
 * - `db` for user persistence.
 *
 * Future extensions:
 * - Add `signInWithProvider(provider, code)` for OAuth flows.
 * - Replace internal logic with external SDK if using a managed provider.
 * - Implement account linking.
 */
export class AuthService {
  private readonly SALT_ROUNDS = 10;

  /**
   * Registers a new user with email and password.
   * The first registered user automatically becomes an admin.
   */
  async signUp(email: string, password: string): Promise<SignUpResult> {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      throw new AuthError("Email already registered", "EMAIL_EXISTS");
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Check if this is the first user (make them admin)
    const [existingUsers] = await db.select({ count: users.id }).from(users);
    const isFirstUser = !existingUsers;

    // Create user
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        passwordHash,
        role: isFirstUser ? "admin" : "user",
      })
      .returning({ id: users.id, email: users.email, role: users.role });

    // Generate token
    const token = await tokenService.signAccessToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as "user" | "admin",
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role as "user" | "admin",
      },
      token,
    };
  }

  /**
   * Authenticates a user with email and password.
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthError("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const token = await tokenService.signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role as "user" | "admin",
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role as "user" | "admin",
      },
      token,
    };
  }

  /**
   * Changes a user's password after verifying the current password.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AuthError("User not found", "INVALID_CREDENTIALS");
    }

    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new AuthError("Current password is incorrect", "INVALID_CREDENTIALS");
    }

    const newPasswordHash = await bcrypt.hash(newPassword, this.SALT_ROUNDS);
    await db
      .update(users)
      .set({ passwordHash: newPasswordHash })
      .where(eq(users.id, userId));
  }

  /**
   * Changes a user's email after verifying the current password.
   */
  async changeEmail(userId: string, newEmail: string, password: string): Promise<{ email: string }> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new AuthError("User not found", "INVALID_CREDENTIALS");
    }

    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      throw new AuthError("Password is incorrect", "INVALID_CREDENTIALS");
    }

    // Check if new email is already taken
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, newEmail))
      .limit(1);

    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      throw new AuthError("Email already registered", "EMAIL_EXISTS");
    }

    // Update email
    await db
      .update(users)
      .set({ email: newEmail })
      .where(eq(users.id, userId));

    return { email: newEmail };
  }

  /**
   * Validates a session token and returns the user context.
   */
  async validateSession(token: string): Promise<TokenPayload> {
    try {
      return await tokenService.verifyAccessToken(token);
    } catch {
      throw new AuthError("Invalid or expired token", "INVALID_TOKEN");
    }
  }
}

/**
 * Custom error class for auth-related errors.
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "EMAIL_EXISTS"
      | "INVALID_CREDENTIALS"
      | "INVALID_TOKEN"
  ) {
    super(message);
    this.name = "AuthError";
  }
}

// Singleton instance for convenience
export const authService = new AuthService();
