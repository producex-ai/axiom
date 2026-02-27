import { getOrgMembersAction } from "@/actions/auth/clerk";
import { getJobTemplates } from "@/actions/jobs/job-template-actions";
import { JobBulkUploadForm } from "../_components/JobBulkUploadForm";

export default async function BulkCreateJobPage() {
  const [members, templatesResult] = await Promise.all([
    getOrgMembersAction(),
    getJobTemplates(),
  ]);

  const templates = templatesResult.success ? templatesResult.data : [];

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Bulk Create Jobs</h1>
        <p className="text-muted-foreground mt-2">
          Upload a document (Excel, PDF, Word) to create multiple jobs at once from a template.
        </p>
      </div>

      <JobBulkUploadForm templates={templates || []} members={members} />
    </div>
  );
}
