"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Clock,
  FileSearch,
  FileStack,
  FileText,
  FolderOpen,
  Loader2,
  Package,
  ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import SubModuleCard from "@/components/compliance/SubModuleCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Module icon mapping
const moduleIcons: Record<string, any> = {
  "1": FileText,
  "2": Package,
  "3": BookOpen,
  "4": ClipboardCheck,
  "5": ShieldCheck,
  "6": FileSearch,
  "7": AlertTriangle,
};

// Module color schemes - clean, minimal palette
const moduleColors: Record<
  string,
  { gradient: string; bg: string; text: string; ring: string }
> = {
  "1": {
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-200/50 dark:ring-blue-800/50",
  },
  "2": {
    gradient: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-200/50 dark:ring-emerald-800/50",
  },
  "3": {
    gradient: "from-sky-500 to-sky-600",
    bg: "bg-sky-50 dark:bg-sky-950/30",
    text: "text-sky-700 dark:text-sky-300",
    ring: "ring-sky-200/50 dark:ring-sky-800/50",
  },
  "4": {
    gradient: "from-slate-600 to-slate-700",
    bg: "bg-slate-50 dark:bg-slate-950/30",
    text: "text-slate-700 dark:text-slate-300",
    ring: "ring-slate-200/50 dark:ring-slate-800/50",
  },
  "5": {
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50 dark:bg-violet-950/30",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-200/50 dark:ring-violet-800/50",
  },
  "6": {
    gradient: "from-fuchsia-500 to-fuchsia-600",
    bg: "bg-fuchsia-50 dark:bg-fuchsia-950/30",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    ring: "ring-fuchsia-200/50 dark:ring-fuchsia-800/50",
  },
  "7": {
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50 dark:bg-indigo-950/30",
    text: "text-indigo-700 dark:text-indigo-300",
    ring: "ring-indigo-200/50 dark:ring-indigo-800/50",
  },
};

interface SubModule {
  code: string;
  name: string;
  alias?: string;
  specFile?: string;
  questionsCount?: number;
  totalPoints?: number;
  hasSubSubModules?: boolean;
  document?: {
    id: string;
    status: "draft" | "ready" | "archived";
    title: string;
    contentKey: string;
    version: number;
  };
  subSubModules?: SubModule[];
}

interface ModuleDetailViewProps {
  moduleNumber: string;
  moduleData: {
    module: string;
    moduleName: string;
    totalSubModules: number;
    documentsCreated: number;
    subModules: SubModule[];
  };
  loading: boolean;
  onBack: () => void;
}

export default function ModuleDetailView({
  moduleNumber,
  moduleData,
  loading,
  onBack,
}: ModuleDetailViewProps) {
  const Icon = moduleIcons[moduleNumber] || FileText;
  const colors = moduleColors[moduleNumber] || moduleColors["1"];
  const completion =
    moduleData.totalSubModules > 0
      ? Math.round(
          (moduleData.documentsCreated / moduleData.totalSubModules) * 100,
        )
      : 0;

  // Sort submodules: items without documents first, then items with documents (published last)
  const sortedSubModules = moduleData.subModules;

  // Callback to refresh data when document is generated
  const handleDocumentGenerated = () => {
    // This could trigger a refetch of the module data
    // For now, we'll just log it - parent component should handle the refresh
    console.log("Document generated, refreshing data...");
    // In a real implementation, you'd call a refetch function passed from parent
  };

  return (
    <div className="fade-in -mx-6 -my-6 animate-in space-y-8 rounded-lg bg-slate-100/50 px-6 py-6 duration-500 dark:bg-slate-950/50">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 gap-2 text-muted-foreground hover:text-foreground"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </Button>

      {/* Module Section - Bordered Container */}
      <div className="overflow-hidden rounded-lg border border-border/40 bg-card dark:bg-slate-900/40">
        {/* Module Header */}
        <div className="border-border/40 border-b bg-gradient-to-r from-slate-50/50 to-slate-50/30 p-6 dark:from-slate-800/30 dark:to-slate-800/20">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex flex-1 items-start gap-4">
              <div
                className={`rounded-xl bg-gradient-to-br p-3 ${colors.gradient} shadow-lg ${colors.ring} shrink-0 ring-4`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-medium text-muted-foreground text-xs uppercase tracking-wider">
                    Module {moduleNumber}
                  </span>
                </div>
                <h1 className="font-bold text-3xl tracking-tight">
                  {moduleData.moduleName}
                </h1>
              </div>
            </div>

            {/* Documents Completed Badge - Right side */}
            <Badge
              variant="outline"
              className="shrink-0 gap-2 px-3 py-2 font-mono text-sm"
            >
              <FileStack className="h-4 w-4" />
              {moduleData.documentsCreated} / {moduleData.totalSubModules}
            </Badge>
          </div>

          {/* Stats Bar */}
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{moduleData.totalSubModules} sub-modules</span>
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-3">
              <span className="font-medium text-sm">
                {completion}% complete
              </span>
              <div className="h-1.5 w-32 overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-700`}
                  style={{ width: `${completion}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sub-Modules List */}
        <div className="p-6">
          {loading ? (
            <div className="flex min-h-[300px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {sortedSubModules.map((subModule: SubModule) => (
                <SubModuleSection
                  key={subModule.code}
                  subModule={subModule}
                  moduleNumber={moduleNumber}
                  moduleName={moduleData.moduleName}
                  colors={colors}
                  onRefresh={handleDocumentGenerated}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Component for handling sub-modules (with optional nested children)
function SubModuleSection({
  subModule,
  moduleNumber,
  moduleName,
  colors,
  onRefresh,
}: {
  subModule: SubModule;
  moduleNumber: string;
  moduleName: string;
  colors: { gradient: string; bg: string; text: string; ring: string };
  onRefresh?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true); // Open by default for better UX
  const hasChildren =
    subModule.hasSubSubModules &&
    subModule.subSubModules &&
    subModule.subSubModules.length > 0;

  // Keep nested submodules in original order
  const sortedChildren = hasChildren ? subModule.subSubModules || [] : [];

  if (hasChildren) {
    const completedDocs =
      sortedChildren?.filter((child) => child.document)?.length || 0;
    const totalDocs = sortedChildren?.length || 0;

    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
        <div className="group overflow-hidden rounded-lg border border-border/40 bg-card transition-all duration-200 hover:border-border hover:shadow-sm">
          <CollapsibleTrigger className="w-full">
            <div className="flex items-center justify-between p-4 transition-colors hover:bg-accent/50">
              <div className="flex items-center gap-3">
                <div
                  className={`rounded-lg bg-gradient-to-br p-2 ${colors.gradient}`}
                >
                  <FolderOpen className="h-4 w-4 text-white" />
                </div>

                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono font-semibold text-sm ${colors.text}`}
                    >
                      {subModule.code}
                    </span>
                    <span className="font-medium text-foreground text-sm">
                      {subModule.name}
                    </span>
                  </div>
                  <p className="mt-0.5 text-muted-foreground text-xs">
                    {completedDocs} of {totalDocs} documents completed
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="font-medium text-xs">
                  {totalDocs} items
                </Badge>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="border-border/40 border-t bg-accent/20 p-4">
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                {sortedChildren?.map((child) => (
                  <SubModuleCard
                    key={child.code}
                    subModule={child}
                    moduleNumber={moduleNumber}
                    moduleName={moduleName}
                    colors={colors}
                    isNested
                    onDocumentGenerated={onRefresh}
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  }

  return (
    <SubModuleCard
      subModule={subModule}
      moduleNumber={moduleNumber}
      moduleName={moduleName}
      colors={colors}
      onDocumentGenerated={onRefresh}
    />
  );
}
