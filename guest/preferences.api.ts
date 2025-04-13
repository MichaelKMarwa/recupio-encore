// guest/preferences.api.ts
import { api, APIError } from "encore.dev/api/mod.js";
import { db } from "./db";

interface GuestPreferences {
  zipCode: string;
  theme?: 'light' | 'dark';
}

// POST /api/auth/guest/preferences
export const updateGuestPreferences = api(
  { method: "POST", path: "/auth/guest/preferences" },
  async (params: { sessionId: string; preferences: GuestPreferences }) => {
    const session = await db.queryRow`
      SELECT session_id FROM guest_sessions 
      WHERE session_id = ${params.sessionId} 
      AND expires_at > NOW()
    `;

    if (!session) {
      throw APIError.notFound("Invalid or expired guest session");
    }

    await db.exec`
      INSERT INTO guest_preferences (id, session_id, zip_code)
      VALUES (${params.sessionId}, ${params.preferences.zipCode})
      ON CONFLICT (session_id) 
      DO UPDATE SET zip_code = ${params.preferences.zipCode}
    `;

    return { success: true };
  }
);

// GET /api/auth/guest/preferences
export const getGuestPreferences = api(
  { method: "GET", path: "/auth/guest/preferences" },
  async (params: { sessionId: string }) => {
    const prefs = await db.queryRow`
      SELECT gp.zip_code, gs.created_at
      FROM guest_sessions gs
      LEFT JOIN guest_preferences gp ON gs.session_id = gp.session_id
      WHERE gs.session_id = ${params.sessionId}
      AND gs.expires_at > NOW()
    `;

    if (!prefs) {
      throw APIError.notFound("Invalid or expired guest session");
    }

    return {
      sessionId: params.sessionId,
      preferences: {
        zipCode: prefs.zip_code
      },
      createdAt: prefs.created_at
    };
  }
);
