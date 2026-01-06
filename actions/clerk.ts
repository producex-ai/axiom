"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";

export type OrgMember = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  role: string;
};

export async function getOrgMembersAction(): Promise<OrgMember[]> {
  const { orgId } = await auth();

  if (!orgId) {
    throw new Error("Unauthorized - No organization");
  }

  try {
    const client = await clerkClient();
    const { data: membershipList } =
      await client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
        role: ["org:operator", "org:manager", "org:director"],
      });

    const members: OrgMember[] = membershipList.map((membership) => ({
      id: membership.publicUserData.userId,
      email: membership.publicUserData.identifier,
      firstName: membership.publicUserData.firstName || null,
      lastName: membership.publicUserData.lastName || null,
      imageUrl: membership.publicUserData.imageUrl,
      role: membership.role,
    }));

    return members;
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return [];
  }
}
