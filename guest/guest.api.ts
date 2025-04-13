// services/guest/api.ts (new service)
import { api, APIError } from "encore.dev/api";
import { db } from "./db";

// GET /guest-sessions/{id} - Validate guest session
export const validateSession = api(
  { method: "GET", path: "/guest-sessions/:id" },
  async (params: { id: string }) => {
    const session = await db.queryRow`
      SELECT * FROM guest_sessions WHERE session_id = ${params.id} 
      AND expires_at > NOW()
    `;
    if (!session) throw APIError.notFound("Invalid session");
    return session;
  }
);