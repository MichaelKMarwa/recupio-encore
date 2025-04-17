// premium/premium.api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "../shared/db";

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: string;
  is_active: boolean;
}

// GET /api/premium/features
export const listPremiumFeatures = api(
  { method: "GET", path: "/api/premium/features", expose: true },
  async () => {
    const features: PremiumFeature[] = [];
    for await (const feature of db.query<PremiumFeature>`
      SELECT * FROM premium_features
      WHERE is_active = true
      ORDER BY name ASC
    `) {
      features.push(feature);
    }

    return { features };
  }
);

// POST /api/premium/activate
export const activateFeature = api(
  { method: "POST", path: "/api/premium/activate", auth: true },
  async (params: { auth: { userId: string }; featureId: string }) => {
    // Verify user is premium
    const user = await db.queryRow`
      SELECT is_premium FROM users
      WHERE id = ${params.auth.userId}
    `;

    if (!user?.is_premium) {
      throw APIError.permissionDenied("Premium subscription required");
    }

    // Verify feature exists and is active
    const feature = await db.queryRow`
      SELECT * FROM premium_features
      WHERE id = ${params.featureId}
      AND is_active = true
    `;

    if (!feature) {
      throw APIError.notFound("Premium feature not found");
    }

    // Activate feature for user
    await db.exec`
      INSERT INTO user_premium_features (user_id, feature_id)
      VALUES (${params.auth.userId}, ${params.featureId})
      ON CONFLICT (user_id, feature_id) DO NOTHING
    `;

    return { success: true };
  }
);

// GET /api/premium/features/active
export const getActiveFeatures = api(
  { method: "GET", path: "/api/premium/features/active", auth: true },
  async (params: { auth: { userId: string } }) => {
    const features: (PremiumFeature & { activated_at: Date })[] = [];
    for await (const feature of db.query<PremiumFeature & { activated_at: Date }>`
      SELECT pf.*, upf.activated_at
      FROM premium_features pf
      JOIN user_premium_features upf ON pf.id = upf.feature_id
      WHERE upf.user_id = ${params.auth.userId}
      AND pf.is_active = true
      ORDER BY upf.activated_at DESC
    `) {
      features.push(feature);
    }

    return { features };
  }
);

// POST /api/premium/deactivate
export const deactivateFeature = api(
  { method: "POST", path: "/api/premium/deactivate", auth: true },
  async (params: { auth: { userId: string }; featureId: string }) => {
    await db.exec`
      DELETE FROM user_premium_features
      WHERE user_id = ${params.auth.userId}
      AND feature_id = ${params.featureId}
    `;

    return { success: true };
  }
);
