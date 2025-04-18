// auth/auth.middleware.ts
import { middleware, APIError, MiddlewareRequest } from "encore.dev/api";
import * as jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { db } from "../shared/db";

const jwtSecret = secret("JWT_SECRET");

interface AuthData {
  userId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Export a simple interface for the auth data
export interface AuthDataPayload {
  userId: string;
  role: string;
}

// Not extending MiddlewareRequest to avoid type conflicts
export interface RequestWithAuth {
  auth?: AuthDataPayload;
  rawRequest?: {
    headers: {
      authorization?: string;
      "x-guest-session"?: string;
      [key: string]: string | string[] | undefined;
    };
  };
}

// Add a utility function to verify user existence
async function verifyUser(userId: string): Promise<{id: string, role: string} | null> {
  if (!userId) return null;
  
  const user = await db.queryRow<{id: string, role: string}>`
    SELECT id, role FROM users 
    WHERE id = ${userId}
  `;
  
  return user || null;
}

// Store active tokens (simulating a token store)
// In a production environment, you would use Redis or another distributed cache
const activeTokens = new Map<string, { userId: string, exp: number }>();

export const authMiddleware = middleware(
  { target: { auth: true } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next) => {
    if (!req.rawRequest?.headers?.authorization) {
      throw APIError.unauthenticated("Missing authorization header");
    }

    const token = req.rawRequest.headers.authorization.replace("Bearer ", "");
    
    try {
      // Validate the JWT token
      const payload = jwt.verify(token, jwtSecret()) as AuthData;
      
      // Verify the user exists in the database
      const user = await verifyUser(payload.userId);
      if (!user) {
        throw APIError.unauthenticated("User not found or inactive");
      }
      
      // Check if the token is in our active tokens store
      const tokenKey = `${payload.userId}:${token.substr(-8)}`; // Use last 8 chars as identifier
      if (!activeTokens.has(tokenKey) && payload.exp) {
        // If not found, add it to our active tokens
        activeTokens.set(tokenKey, { 
          userId: payload.userId,
          exp: payload.exp * 1000 // Convert to milliseconds
        });
      }
      
      // Add the user info to the request
      req.auth = { 
        userId: user.id, 
        role: user.role,
        iat: payload.iat,
        exp: payload.exp
      };
      
      // Update user's last activity
      await db.exec`
        UPDATE users 
        SET last_activity = NOW() 
        WHERE id = ${user.id}
      `.catch(err => console.error("Failed to update last_activity:", err));
    } catch (err) {
      throw APIError.unauthenticated("Invalid or expired authentication token");
    }

    return next(req);
  }
);

export const guestMiddleware = middleware(
  { target: { tags: ["guest-accessible"] } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next) => {
    const sessionId = req.rawRequest?.headers?.["x-guest-session"];
    if (!sessionId) {
      throw APIError.unauthenticated("Missing guest session header");
    }

    // Query the guest session with more information
    const session = await db.queryRow`
      SELECT id, session_id, expires_at
      FROM guest_sessions 
      WHERE session_id = ${sessionId} 
      AND expires_at > NOW()
    `;

    if (!session) {
      throw APIError.unauthenticated("Invalid or expired guest session");
    }

    // Re-enable the last_accessed_at update now that our migration has been applied
    await db.exec`
      UPDATE guest_sessions
      SET last_accessed_at = NOW()
      WHERE session_id = ${sessionId}
    `.catch(err => console.error("Failed to update last_accessed_at:", err));

    // Add guest info to the request
    req.auth = { userId: session.id, role: "guest" };
    
    return next(req);
  }
);

// Export function to invalidate token
export async function invalidateToken(token: string): Promise<boolean> {
  try {
    const payload = jwt.verify(token, jwtSecret()) as AuthData;
    const tokenKey = `${payload.userId}:${token.substr(-8)}`;
    
    if (activeTokens.has(tokenKey)) {
      activeTokens.delete(tokenKey);
      return true;
    }
    return false;
  } catch (err) {
    return false;
  }
}