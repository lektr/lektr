import * as jose from "jose";

export interface TokenPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
}

export interface TokenServiceConfig {
  secret: string;
  accessTokenExpiry: string;
}

const defaultConfig: TokenServiceConfig = {
  secret: process.env.JWT_SECRET || "lektr-dev-secret-change-in-production",
  accessTokenExpiry: "7d",
};

/**
 * TokenService handles all JWT operations.
 *
 * This service abstracts `jose` so the rest of the app doesn't need to know
 * the signing/verification mechanism. In the future, this can be extended to:
 * - Fetch JWKS from an external provider (e.g., Auth0, Clerk).
 * - Validate tokens signed by a managed identity service.
 */
export class TokenService {
  private readonly secret: Uint8Array;
  private readonly accessTokenExpiry: string;

  constructor(config: Partial<TokenServiceConfig> = {}) {
    const mergedConfig = { ...defaultConfig, ...config };
    this.secret = new TextEncoder().encode(mergedConfig.secret);
    this.accessTokenExpiry = mergedConfig.accessTokenExpiry;
  }

  /**
   * Signs an access token with the given payload.
   */
  async signAccessToken(payload: TokenPayload): Promise<string> {
    return new jose.SignJWT({ ...payload })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(this.accessTokenExpiry)
      .sign(this.secret);
  }

  /**
   * Verifies an access token and returns the payload.
   * Throws if the token is invalid or expired.
   */
  async verifyAccessToken(token: string): Promise<TokenPayload> {
    const { payload } = await jose.jwtVerify(token, this.secret);
    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: (payload.role as "user" | "admin") || "user",
    };
  }
}

// Singleton instance for convenience
export const tokenService = new TokenService();
