import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { TemplateBuilderForm } from "../_components/TemplateBuilderForm";
import { getEnabledModules } from "@/lib/primus/db-helper";

export default async function CreateJobTemplatePage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/login");
  }

  // Fetch enabled modules for the organization
  const enabledModules = await getEnabledModules(orgId, "primus_gfs");

  return (
    <div className="container py-8 w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Job Template</h1>
        <p className="text-muted-foreground mt-1">
          Define a reusable template with creation and action fields
        </p>
      </div>

      <TemplateBuilderForm enabledModules={enabledModules} />
    </div>
  );
}
