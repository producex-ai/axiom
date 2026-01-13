"use client";

import { ChevronDown, ChevronRight, FileText, FolderOpen } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { DocumentsTable } from "@/components/documents/DocumentsTable";

interface Document {
  id: string;
  title: string;
  status: "draft" | "published" | "archived";
  framework_id: string;
  module_id: string;
  sub_module_id: string;
  current_version: number;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  content_key: string;
  published_at?: string | null;
  renewal?: "quarterly" | "semi_annually" | "annually" | "2_years" | null;
  doc_type?: string | null;
}

interface GroupedDocuments {
  [frameworkId: string]: {
    name: string;
    modules: {
      [moduleId: string]: {
        name: string;
        subModules: {
          [subModuleId: string]: {
            name: string;
            documents: Document[];
          };
        };
      };
    };
  };
}

function getFrameworkName(frameworkId: string): string {
  const names: Record<string, string> = {
    company_docs: "Company Documents",
    primus_gfs: "Primus GFS",
  };
  return names[frameworkId] || frameworkId;
}

function getModuleName(frameworkId: string, moduleId: string): string {
  if (frameworkId === "company_docs") {
    return "General Documents";
  }
  return `Module ${moduleId}`;
}

function getSubModuleName(
  frameworkId: string,
  moduleId: string,
  subModuleId: string,
): string {
  if (frameworkId === "company_docs") {
    return "All Documents";
  }
  return subModuleId;
}

function groupDocuments(documents: Document[]): GroupedDocuments {
  const grouped: GroupedDocuments = {};

  for (const doc of documents) {
    const { framework_id, module_id, sub_module_id } = doc;

    if (!grouped[framework_id]) {
      grouped[framework_id] = {
        name: getFrameworkName(framework_id),
        modules: {},
      };
    }

    if (!grouped[framework_id].modules[module_id]) {
      grouped[framework_id].modules[module_id] = {
        name: getModuleName(framework_id, module_id),
        subModules: {},
      };
    }

    if (!grouped[framework_id].modules[module_id].subModules[sub_module_id]) {
      grouped[framework_id].modules[module_id].subModules[sub_module_id] = {
        name: getSubModuleName(framework_id, module_id, sub_module_id),
        documents: [],
      };
    }

    grouped[framework_id].modules[module_id].subModules[
      sub_module_id
    ].documents.push(doc);
  }

  return grouped;
}

function SubModuleSection({
  subModuleName,
  documents,
  defaultOpen = false,
}: {
  subModuleName: string;
  documents: Document[];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-4 py-3 h-auto hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <div className="flex items-center gap-3">
            {isOpen ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            )}
            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="font-medium">{subModuleName}</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {documents.length} doc{documents.length !== 1 ? "s" : ""}
            </span>
          </div>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-4 pb-4">
        <DocumentsTable documents={documents} />
      </CollapsibleContent>
    </Collapsible>
  );
}

function ModuleSection({
  moduleName,
  subModules,
  defaultOpen = false,
}: {
  moduleName: string;
  subModules: GroupedDocuments[string]["modules"][string]["subModules"];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const totalDocs = Object.values(subModules).reduce(
    (sum, subModule) => sum + subModule.documents.length,
    0,
  );

  return (
    <Card className="overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between px-6 py-4 h-auto hover:bg-primary/5 hover:text-primary rounded-none transition-colors"
          >
            <div className="flex items-center gap-3">
              {isOpen ? (
                <ChevronDown className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              ) : (
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              )}
              <FolderOpen className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">{moduleName}</span>
              <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
                {totalDocs} document{totalDocs !== 1 ? "s" : ""}
              </span>
            </div>
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="border-t">
            {Object.entries(subModules)
              .sort(([codeA], [codeB]) =>
                codeA.localeCompare(codeB, undefined, { numeric: true }),
              )
              .map(([subModuleId, subModule]) => (
                <div
                  key={subModuleId}
                  className="border-b last:border-b-0 bg-background"
                >
                  <SubModuleSection
                    subModuleName={subModule.name}
                    documents={subModule.documents}
                    defaultOpen={true}
                  />
                </div>
              ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function FrameworkSection({
  frameworkName,
  modules,
  defaultOpen = false,
}: {
  frameworkName: string;
  modules: GroupedDocuments[string]["modules"];
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const totalDocs = Object.values(modules).reduce(
    (sum, module) =>
      sum +
      Object.values(module.subModules).reduce(
        (subSum, subModule) => subSum + subModule.documents.length,
        0,
      ),
    0,
  );

  return (
    <div className="space-y-3">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 mb-3">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <div className="flex items-center gap-3 flex-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {frameworkName}
            </h2>
            <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full">
              {totalDocs} total document{totalDocs !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <CollapsibleContent className="space-y-3">
          {Object.entries(modules)
            .sort(([idA], [idB]) =>
              idA.localeCompare(idB, undefined, { numeric: true }),
            )
            .map(([moduleId, module]) => (
              <ModuleSection
                key={moduleId}
                moduleName={module.name}
                subModules={module.subModules}
                defaultOpen={true}
              />
            ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export function GroupedDocumentsView({ documents }: { documents: Document[] }) {
  const grouped = groupDocuments(documents);

  return (
    <div className="space-y-8">
      {Object.entries(grouped)
        .sort(([idA], [idB]) => idA.localeCompare(idB))
        .map(([frameworkId, framework]) => (
          <FrameworkSection
            key={frameworkId}
            frameworkName={framework.name}
            modules={framework.modules}
            defaultOpen={true}
          />
        ))}
    </div>
  );
}
