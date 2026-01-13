import type { UUID } from "crypto";

export type Organization = {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  image_url: string;
  type: "DISTRIBUTOR" | "SUPPLIER" | "CUSTOMER";
  metadata: { [key: string]: any };
  onboarding_complete: boolean;
};
