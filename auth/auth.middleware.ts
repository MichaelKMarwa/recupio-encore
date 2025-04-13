// auth/auth.middleware.ts
import { middleware, APIError, MiddlewareRequest } from "encore.dev/api";
import * as jwt from "jsonwebtoken";
import { secret } from "encore.dev/config";
import { db } from "./db";

const jwtSecret = secret("JWT_SECRET");

interface AuthData {
  userId: string;
  role: string;
}

export const authMiddleware = middleware(
  { target: { auth: true } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next) => {
    if (!req.rawRequest?.headers?.authorization) {
      throw APIError.unauthenticated("Missing authorization header");
    }

    const token = req.rawRequest.headers.authorization.replace("Bearer ", "");
    try {
      const payload = jwt.verify(token, jwtSecret()) as AuthData;
      req.auth = payload;
    } catch (err) {
      throw APIError.unauthenticated("Invalid authentication token");
    }

    return next(req);
  }
);

export const guestMiddleware = middleware(
  { target: { auth: false } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next) => {
    const sessionId = req.rawRequest?.headers?.["x-guest-session"];
    if (!sessionId) {
      throw APIError.unauthenticated("Missing guest session header");
    }

    const session = await db.queryRow`
      SELECT * FROM guest_sessions 
      WHERE session_id = ${sessionId} 
      AND expires_at > NOW()
    `;

    if (!session) {
      throw APIError.unauthenticated("Invalid or expired guest session");
    }

    req.auth = { userId: session.user_id, role: "guest" };
    return next(req);
  }
);