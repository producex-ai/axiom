import { getOrgMembersAction } from "@/actions/auth/clerk";
import { JobCreateForm } from "../_components/JobCreateForm";

// Force dynamic rendering since we use searchParams
export const dynamic = "force-dynamic";

interface CreateJobPageProps {
  searchParams: Promise<{ template?: string }>;
}

export default async function CreateJobPage({ searchParams }: CreateJobPageProps) {
  const members = await getOrgMembersAction();
  const params = await searchParams;
  const templateId = params.template;

  return (
    <div className="container">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create Job</h1>
        <p className="text-muted-foreground mt-1">
          Create a new job from a template
        </p>
      </div>

      <JobCreateForm members={members} preselectedTemplateId={templateId} />
    </div>
  );
}
