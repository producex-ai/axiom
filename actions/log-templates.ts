"use server";

import { auth } from "@clerk/nextjs/server";

import type { LogTemplate } from "@/db/queries/log-templates";
import { createLogTemplate, getLogTemplates } from "@/db/queries/log-templates";

export async function createLogTemplateAction(
  template: Omit<
    LogTemplate,
    "id" | "created_at" | "updated_at" | "org_id" | "created_by"
  >,
) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    throw new Error("Unauthorized");
  }

  const result = await createLogTemplate({
    ...template,
    org_id: orgId,
    created_by: userId,
  });

  return result;
}

export async function getLogTemplatesAction() {
  const { orgId } = await auth();
  if (!orgId) {
    throw new Error("Unauthorized");
  }

  const result = await getLogTemplates(orgId);
  return result;
}
