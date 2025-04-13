// payments/subscription.api.ts
import { api, APIError } from "encore.dev/api";
import { mainDB } from "../shared/db";
import { v4 as uuidv4 } from "uuid";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

// POST /api/premium/subscribe
export const subscribe = api(
  { method: "POST", path: "/api/premium/subscribe", auth: true },
  async (params: { 
    auth: { userId: string }; 
    planId: string;
    paymentMethodId: string;
  }) => {
    // Verify payment method belongs to user
    const paymentMethod = await mainDB.queryRow`
      SELECT * FROM payment_methods 
      WHERE id = ${params.paymentMethodId}
      AND user_id = ${params.auth.userId}
    `;

    if (!paymentMethod) {
      throw APIError.notFound("Payment method not found");
    }

    const subscriptionId = uuidv4();
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month subscription period

    // Create subscription
    await mainDB.exec`
      INSERT INTO subscriptions (
        id, user_id, plan_id, status,
        current_period_start, current_period_end
      ) VALUES (
        ${subscriptionId}, ${params.auth.userId}, ${params.planId},
        'active', ${now}, ${periodEnd}
      )
    `;

    // Update user to premium
    await mainDB.exec`
      UPDATE users 
      SET is_premium = true, updated_at = NOW()
      WHERE id = ${params.auth.userId}
    `;

    return { 
      success: true, 
      subscriptionId,
      currentPeriodEnd: periodEnd 
    };
  }
);

// PUT /api/premium/cancel
export const cancelSubscription = api(
  { method: "PUT", path: "/api/premium/cancel", auth: true },
  async (params: { auth: { userId: string } }) => {
    const subscription = await mainDB.queryRow`
      SELECT * FROM subscriptions
      WHERE user_id = ${params.auth.userId}
      AND status = 'active'
    `;

    if (!subscription) {
      throw APIError.notFound("No active subscription found");
    }

    await mainDB.exec`
      UPDATE subscriptions
      SET status = 'canceled',
          cancel_at_period_end = true,
          updated_at = NOW()
      WHERE id = ${subscription.id}
    `;

    return { success: true };
  }
);

// GET /api/premium/subscription
export const getSubscription = api(
  { method: "GET", path: "/api/premium/subscription", auth: true },
  async (params: { auth: { userId: string } }) => {
    const subscription = await mainDB.queryRow`
      SELECT s.*, array_agg(upf.feature_id) as active_features
      FROM subscriptions s
      LEFT JOIN user_premium_features upf ON s.user_id = upf.user_id
      WHERE s.user_id = ${params.auth.userId}
      AND s.status = 'active'
      GROUP BY s.id
    `;

    if (!subscription) {
      return { hasSubscription: false };
    }

    return {
      hasSubscription: true,
      subscription: {
        id: subscription.id,
        planId: subscription.plan_id,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        activeFeatures: subscription.active_features || []
      }
    };
  }
);
