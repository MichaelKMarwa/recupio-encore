// payments/payment-methods.api.ts
import { api, APIError } from "encore.dev/api";
import { mainDB } from "../shared/db";
import { v4 as uuidv4 } from "uuid";

interface PaymentMethod {
  id: string;
  type: string;
  last_four: string;
  expiry_month?: number;
  expiry_year?: number;
  is_default: boolean;
}

// GET /api/payments/methods
export const getPaymentMethods = api(
  { method: "GET", path: "/api/payments/methods", auth: true },
  async (params: { auth: { userId: string } }) => {
    const methods: PaymentMethod[] = [];
    for await (const method of mainDB.query<PaymentMethod>`
      SELECT id, type, last_four, expiry_month, expiry_year, is_default
      FROM payment_methods
      WHERE user_id = ${params.auth.userId}
      ORDER BY is_default DESC, created_at DESC
    `) {
      methods.push(method);
    }

    return { methods };
  }
);

// POST /api/payments/methods
export const addPaymentMethod = api(
  { method: "POST", path: "/api/payments/methods", auth: true },
  async (params: { 
    auth: { userId: string }; 
    type: string;
    token: string;
    lastFour: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault?: boolean;
  }) => {
    // If this is marked as default, unset any existing default
    if (params.isDefault) {
      await mainDB.exec`
        UPDATE payment_methods 
        SET is_default = false, updated_at = NOW()
        WHERE user_id = ${params.auth.userId}
        AND is_default = true
      `;
    }

    // TODO: Validate token with payment provider
    const providerId = `test_${uuidv4()}`; // Replace with actual provider token validation

    const id = uuidv4();
    await mainDB.exec`
      INSERT INTO payment_methods (
        id, user_id, type, provider_id, last_four,
        expiry_month, expiry_year, is_default
      ) VALUES (
        ${id},
        ${params.auth.userId},
        ${params.type},
        ${providerId},
        ${params.lastFour},
        ${params.expiryMonth || null},
        ${params.expiryYear || null},
        ${params.isDefault || false}
      )
    `;

    return { 
      success: true,
      paymentMethodId: id
    };
  }
);

// DELETE /api/payments/methods/:id
export const removePaymentMethod = api(
  { method: "DELETE", path: "/api/payments/methods/:id", auth: true },
  async (params: { auth: { userId: string }; id: string }) => {
    const method = await mainDB.queryRow`
      SELECT * FROM payment_methods
      WHERE id = ${params.id}
      AND user_id = ${params.auth.userId}
    `;

    if (!method) {
      throw APIError.notFound("Payment method not found");
    }

    // Don't allow removal if it's the only payment method and user has active subscription
    const hasSubscription = await mainDB.queryRow`
      SELECT 1 FROM subscriptions
      WHERE user_id = ${params.auth.userId}
      AND status = 'active'
    `;
    const methodCount = await mainDB.queryRow<{ count: number }>`
      SELECT COUNT(*) as count FROM payment_methods
      WHERE user_id = ${params.auth.userId}
    `;

    if (hasSubscription && methodCount?.count === 1) {
      throw APIError.invalidArgument(
        "Cannot remove last payment method with active subscription"
      );
    }

    await mainDB.exec`
      DELETE FROM payment_methods
      WHERE id = ${params.id}
      AND user_id = ${params.auth.userId}
    `;

    return { success: true };
  }
);
