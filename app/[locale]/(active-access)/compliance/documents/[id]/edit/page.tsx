import DocumentEditorClient from "./DocumentEditorClient";

interface DocumentEditorPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
  searchParams: Promise<{
    mode?: "view" | "edit";
  }>;
}

export default async function DocumentEditorPage({
  params,
  searchParams,
}: DocumentEditorPageProps) {
  const { id } = await params;
  const { mode } = await searchParams;

  return <DocumentEditorClient documentId={id} initialMode={mode || "view"} />;
}
