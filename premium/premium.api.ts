// services/premium/api.ts
import { api, APIError } from "encore.dev/api";
import { db } from "./db";

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number | null;
  isActive: boolean;
}

// GET /premium-features - List active features
export const listFeatures = api(
  { method: "GET", path: "/premium-features" },
  async () => {
    const features: PremiumFeature[] = [];
    for await (const feature of db.query<PremiumFeature>`
      SELECT * FROM premium_features WHERE is_active = true
    `) {
      features.push(feature);
    }
    return features;
  }
);

// GET /premium-features/{id} - Get feature details
export const getFeature = api(
  { method: "GET", path: "/premium-features/:id" },
  async (params: { id: string }) => {
    const feature = await db.queryRow<PremiumFeature>`
      SELECT * FROM premium_features WHERE id = ${params.id}
    `;
    if (!feature) throw APIError.notFound("Feature not found");
    return feature;
  }
);