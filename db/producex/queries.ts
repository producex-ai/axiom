import type { Organization } from "../../lib/types/producex";
import { query } from "./postgres";

export const checkProductActive = async (
  orgId: string,
  productKey: string = "VISIO",
): Promise<boolean> => {
  try {
    const result = await query(
      `
      SELECT 1
      FROM organization_products
      WHERE org_id = $1
      AND product_key = $2
      AND status IN ('ACTIVE', 'TRIAL')
      LIMIT 1
      `,
      [orgId, productKey],
    );

    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error("Error checking organization product:", error);
    return false;
  }
};

export const getOrgsDistributors = async (
  orgId: string,
): Promise<Organization[]> => {
  try {
    const result = await query<Organization>(
      `
      SELECT
        o.*
      FROM org_relationships r
      JOIN organizations o
        ON (
          (r.source_org_id = $1 AND o.id = r.target_org_id)
          OR
          (r.target_org_id = $1 AND o.id = r.source_org_id)
        )
      WHERE
        r.status = 'ACTIVE'
        AND o.type = $2
      `,
      [orgId, "DISTRIBUTOR"],
    );

    return result.rows;
  } catch (error) {
    console.error("Error fetching related organizations :", error);
    return [];
  }
};

export const getOrgDetails = async (
  orgId: string,
): Promise<Organization | null> => {
  try {
    const result = await query<Organization>(
      `
      SELECT *
      FROM organizations
      WHERE id = $1
      LIMIT 1
      `,
      [orgId],
    );

    return result.rows[0];
  } catch (error) {
    console.error("Error fetching organization details :", error);
    return null;
  }
};
