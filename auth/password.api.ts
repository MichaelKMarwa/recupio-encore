// auth/password.api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "./db";
import * as bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import { secret } from "encore.dev/config";

// POST /auth/forgot-password
export const forgotPassword = api(
  { method: "POST", path: "/auth/forgot-password" },
  async (params: { email: string }) => {
    const user = await db.queryRow`
      SELECT id FROM users WHERE email = ${params.email}
    `;
    
    if (!user) {
      // Don't reveal whether email exists
      return { success: true };
    }

    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 hour expiry

    await db.exec`
      INSERT INTO password_reset_tokens (id, user_id, token, expires_at)
      VALUES (${uuidv4()}, ${user.id}, ${token}, ${expiresAt})
    `;

    // TODO: Send password reset email using notification service
    // For now, just return success

    return { success: true };
  }
);

// POST /auth/reset-password
export const resetPassword = api(
  { method: "POST", path: "/auth/reset-password" },
  async (params: { token: string; newPassword: string }) => {
    const resetToken = await db.queryRow`
      SELECT user_id, token 
      FROM password_reset_tokens 
      WHERE token = ${params.token}
      AND expires_at > NOW()
      AND used_at IS NULL
    `;

    if (!resetToken) {
      throw APIError.invalidArgument("Invalid or expired reset token");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(params.newPassword, salt);

    // Update password and mark token as used
    await Promise.all([
      db.exec`
        UPDATE users 
        SET password_hash = ${passwordHash}, 
            updated_at = NOW() 
        WHERE id = ${resetToken.user_id}
      `,
      db.exec`
        UPDATE password_reset_tokens 
        SET used_at = NOW() 
        WHERE token = ${params.token}
      `
    ]);

    return { success: true };
  }
);
