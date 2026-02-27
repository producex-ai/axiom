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
        role: ["org:operator", "org:manager", "org:director", "org:org_admin"],
      });

    const members: OrgMember[] = membershipList
      .map((membership) => {
        if (!membership.publicUserData) {
          return null;
        }
        const userData = membership.publicUserData;
        return {
          id: userData.userId,
          email: userData.identifier,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          imageUrl: userData.imageUrl,
          role: membership.role,
        };
      })
      .filter((member): member is OrgMember => member !== null);

    return members;
  } catch (error) {
    console.error("Error fetching organization members:", error);
    return [];
  }
}
