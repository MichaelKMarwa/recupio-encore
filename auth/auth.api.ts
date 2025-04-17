// auth/auth.api.ts (updated)
import { api, APIError } from "encore.dev/api";
import { db } from "../shared/db";
import * as bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { secret } from "encore.dev/config";
import { authMiddleware, guestMiddleware } from "./auth.middleware";

const jwtSecret = secret("JWT_SECRET");

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: Date;
  updated_at: Date;
  password_hash: string;
}

interface LoginParams {
  email: string;
  password: string;
}

interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

interface GuestSessionResponse {
  session_id: string;
}

interface UpgradeParams {
  userId: string;
  paymentDetails: {
    featureId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
  };
}

// POST /auth/login
export const login = api(
  { method: "POST", path: "/auth/login" },
  async (params: LoginParams) => {
    const user = await db.queryRow<User>`
      SELECT * FROM users WHERE email = ${params.email}
    `;
    
    if (!user || !(await bcrypt.compare(params.password, user.password_hash))) {
      throw APIError.invalidArgument("Invalid credentials");
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, jwtSecret(), {
      expiresIn: "24h",
    });

    const { password_hash, ...safeUser } = user;
    return { token, user: safeUser };
  }
);

// POST /auth/register
export const register = api(
  { method: "POST", path: "/auth/register", auth: false },
  async (params: RegisterParams) => {
    const existingUser = await db.queryRow<User>`
      SELECT id FROM users WHERE email = ${params.email}
    `;
    if (existingUser) throw APIError.alreadyExists("Email already registered");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.password, salt);

    const userId = uuidv4();
    await db.exec`
      INSERT INTO users (id, name, email, password_hash, role)
      VALUES (${userId}, ${params.name}, ${params.email}, ${passwordHash}, 'standard')
    `;

    const token = jwt.sign({ userId, role: "standard" }, jwtSecret(), {
      expiresIn: "24h",
    });

    return {
      token,
      user: { id: userId, name: params.name, email: params.email, role: "standard" },
    };
  }
);

// POST /auth/guest-session
export const createGuestSession = api(
  { method: "POST", path: "/auth/guest-session", auth: false },
  async (): Promise<GuestSessionResponse> => {
    const sessionId = uuidv4();
    await db.exec`
      INSERT INTO guest_sessions (id, session_id, expires_at)
      VALUES (${uuidv4()}, ${sessionId}, NOW() + INTERVAL '24 hours')
    `;
    return { session_id: sessionId };
  }
);

// POST /auth/logout
export const logout = api(
  { method: "POST", path: "/auth/logout" },
  async () => ({ success: true })
);

// PUT /users/upgrade
export const upgradeUser = api(
  { method: "PUT", path: "/users/upgrade", auth: true },
  async (params: UpgradeParams) => {
    await db.exec`
      UPDATE users
      SET role = 'premium', updated_at = NOW()
      WHERE id = ${params.userId}
    `;

    const paymentId = uuidv4();
    await db.exec`
      INSERT INTO payments (id, user_id, amount, currency, payment_method, payment_status, feature_id)
      VALUES (
        ${paymentId},
        ${params.userId},
        ${params.paymentDetails.amount},
        ${params.paymentDetails.currency},
        ${params.paymentDetails.paymentMethod},
        'completed',
        ${params.paymentDetails.featureId}
      )
    `;

    const updatedUser = await db.queryRow<User>`
      SELECT * FROM users WHERE id = ${params.userId}
    `;
    
    if (!updatedUser) throw APIError.notFound("User not found");
    const { password_hash, ...safeUser } = updatedUser;
    return safeUser;
  }
);

// GET /users/preferences
export const getPreferences = api(
  { method: "GET", path: "/users/preferences", auth: true },
  async (params: { auth: { userId: string } }) => {
    const prefs = await db.queryRow`
      SELECT preferences FROM user_preferences WHERE user_id = ${params.auth.userId}
    `;
    return prefs?.preferences || {};
  }
);

// PUT /users/preferences
export const updatePreferences = api(
  { method: "PUT", path: "/users/preferences", auth: true },
  async (params: { auth: { userId: string }, body: { preferences: Record<string, any> } }) => {
    await db.exec`
      INSERT INTO user_preferences (user_id, preferences)
      VALUES (${params.auth.userId}, ${params.body.preferences})
      ON CONFLICT (user_id) DO UPDATE
      SET preferences = ${params.body.preferences}
    `;
    return { success: true };
  }
);