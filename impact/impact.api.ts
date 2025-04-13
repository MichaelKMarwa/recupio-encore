import { api } from "encore.dev/api";
import { mainDB } from "../shared/db";


interface GetUserImpactParams {
  userId: string;
}


export const getUserImpact = api(
  { method: "GET", path: "/api/impact/user/:userId", expose: true },
  async (params: GetUserImpactParams) => {
    const result = await mainDB.queryRow<{
      carbon_offset: number;
      trees_equivalent: number;
      landfill_reduction: number;
    }>`
      SELECT SUM(carbon_offset) AS carbon_offset, 
             SUM(trees_equivalent) AS trees_equivalent, 
             SUM(landfill_reduction) AS landfill_reduction
      FROM impact_metrics
      WHERE user_id = ${params.userId}
    `;
    return result || { carbon_offset: 0, trees_equivalent: 0, landfill_reduction: 0 };
  }
);

export const getCommunityImpact = api(
  { method: "GET", path: "/api/impact/community", expose: true },
  async () => {
    const result = await mainDB.queryRow<{
      carbon_offset: number;
      trees_equivalent: number;
      landfill_reduction: number;
    }>`
      SELECT SUM(carbon_offset) AS carbon_offset, 
             SUM(trees_equivalent) AS trees_equivalent, 
             SUM(landfill_reduction) AS landfill_reduction
      FROM impact_metrics
    `;
    return result || { carbon_offset: 0, trees_equivalent: 0, landfill_reduction: 0 };
  }
);