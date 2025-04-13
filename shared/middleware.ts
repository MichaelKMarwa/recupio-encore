// shared/middleware.ts

import { middleware, APIError, MiddlewareRequest } from "encore.dev/api";
type MiddlewareNext = (req: MiddlewareRequest) => Promise<any>;
import * as jwt from "jsonwebtoken";
import { mainDB } from "./db";
import { jwtSecret } from "../auth/secrets";

export interface AuthData {
  userId: string;
  role: string;
}

// Authentication middleware for protected routes
export const authMiddleware = middleware(
  { target: { auth: true } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next: MiddlewareNext): Promise<any> => {
    const authHeader = req.rawRequest?.headers?.authorization;
    if (!authHeader) {
      throw APIError.unauthenticated("Missing authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    try {
      const payload = jwt.verify(token, jwtSecret()) as AuthData;
      
      // Verify user exists and is active
      const user = await mainDB.queryRow`
        SELECT id, role FROM users 
        WHERE id = ${payload.userId}
      `;
      
      if (!user) {
        throw APIError.unauthenticated("User not found");
      }

      req.auth = { userId: user.id, role: user.role };
    } catch (err) {
      throw APIError.unauthenticated("Invalid authentication token");
    }

    return next(req);
  }
);

// Guest session middleware for guest-accessible routes
export const guestMiddleware = middleware(
  { target: { tags: ["guest"] } },
  async (req: MiddlewareRequest & { guestId?: string }, next: MiddlewareNext): Promise<any> => {
    const sessionId = req.rawRequest?.headers?.["x-guest-session"];
    if (!sessionId) {
      throw APIError.unauthenticated("Missing guest session header");
    }

    const session = await mainDB.queryRow`
      SELECT session_id FROM guest_sessions 
      WHERE session_id = ${sessionId} 
      AND expires_at > NOW()
    `;

    if (!session) {
      throw APIError.unauthenticated("Invalid or expired guest session");
    }

    req.guestId = session.session_id;
    return next(req);
  }
);

// Premium feature check middleware
export const premiumMiddleware = middleware(
  { target: { tags: ["premium"] } },
  async (req: MiddlewareRequest & { auth?: AuthData }, next: MiddlewareNext): Promise<any> => {
    if (!req.auth?.userId) {
      throw APIError.unauthenticated("Authentication required for premium features");
    }

    const user = await mainDB.queryRow`
      SELECT is_premium FROM users WHERE id = ${req.auth.userId}
    `;

    if (!user?.is_premium) {
      throw APIError.permissionDenied("This feature requires a premium subscription");
    }

    return next(req);
  }
);

// Error handling middleware
export const errorMiddleware = middleware(
  { target: {} }, // Applied to all endpoints
  async (req: MiddlewareRequest, next: MiddlewareNext): Promise<any> => {
    try {
      return await next(req);
    } catch (error: unknown) {
      // Log the full error details including stack trace and request context
      console.error('Error details:', {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        request: {
          path: req.rawRequest?.url,
          method: req.rawRequest?.method,
          headers: req.rawRequest?.headers,
          // Omit request body to avoid sensitive data exposure
          bodyPresent: req.rawRequest !== undefined
        }
      });

      // Handle database-specific errors
      if (error instanceof Error) {
        if (error.message.includes('connection') || error.message.includes('database')) {
          console.error('Database connection error:', error);
          throw APIError.internal(
            'A database error occurred',
            new Error(`Database error. Request ID: ${req.rawRequest?.headers['x-request-id'] || 'unknown'}`)
          );
        }
        
        if (error.message.includes('duplicate key') || error.message.includes('unique constraint')) {
          throw APIError.invalidArgument(
            'This record already exists',
            new Error(`Duplicate record. Request ID: ${req.rawRequest?.headers['x-request-id'] || 'unknown'}`)
          );
        }
      }

      if (error instanceof APIError) {
        // For known API errors, preserve the error but add more context
        const enhancedError = new APIError(
          error.code,
          `${error.message} (Request ID: ${req.rawRequest?.headers['x-request-id'] || 'unknown'})`
        );
        throw enhancedError;
      }

      // For unknown errors, return a generic message but log the full error
      throw APIError.internal(
        'An unexpected error occurred',
        new Error(`Internal error occurred. Request ID: ${req.rawRequest?.headers['x-request-id'] || 'unknown'}`)
      );
    }
  }
);

// Request validation middleware
export const validationMiddleware = middleware(
  { target: {} }, // Applied to all endpoints
  async (req, next) => {
    // Let Encore's built-in validation handle most cases
    try {
      return await next(req);
    } catch (error) {      if (error instanceof APIError && error.code === "invalid_argument") {
        // Enhance validation error messages
        const apiError = error as APIError;
        throw APIError.invalidArgument(
          apiError.message,
          new Error(apiError.message)
        );
      }
      throw error;
    }
  }
);
