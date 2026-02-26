/**
 * better-auth browser client.
 *
 * Import { authClient } (or the named helpers below) wherever you need to
 * sign in, sign out, or read the current session.
 *
 * Session data is available:
 *   - Reactively via useSession() (React hook)
 *   - One-shot via authClient.getSession()
 */

import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";

const backendURL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:3000" : "");

export const authClient = createAuthClient({
  baseURL: backendURL,
  plugins: [adminClient()],
});

// Named convenience re-exports so callers don't need to drill into authClient
export const { signIn, signOut, signUp, useSession, getSession } = authClient;
