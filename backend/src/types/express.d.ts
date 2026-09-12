/**
 * Extend Express Request with custom properties added by auth middleware.
 */
declare namespace Express {
  interface Request {
    user?: {
      id: string;
      email: string;
      role: string;
    };
    effectiveUserId?: string;
    /** True when the caller authenticated with the MCP shared secret, not a user session. */
    mcpAuth?: boolean;
  }
}
