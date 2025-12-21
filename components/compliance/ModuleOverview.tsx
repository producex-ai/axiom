"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Package,
  ShieldCheck,
} from "lucide-react";
import React from "react";
import AddModulesButton from "@/components/compliance/AddModulesButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

// Module color schemes
const moduleColors: Record<string, { gradient: string; bgGradient: string }> = {
  "1": {
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
  },
  "2": {
    gradient: "from-emerald-500 to-green-500",
    bgGradient: "from-emerald-500/10 to-green-500/10",
  },
  "3": {
    gradient: "from-sky-500 to-blue-500",
    bgGradient: "from-sky-500/10 to-blue-500/10",
  },
  "4": {
    gradient: "from-slate-500 to-slate-600",
    bgGradient: "from-slate-500/10 to-slate-600/10",
  },
  "5": {
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
  },
  "6": {
    gradient: "from-fuchsia-500 to-pink-500",
    bgGradient: "from-fuchsia-500/10 to-pink-500/10",
  },
  "7": {
    gradient: "from-indigo-500 to-blue-600",
    bgGradient: "from-indigo-500/10 to-blue-600/10",
  },
};

interface ModuleData {
  module: string;
  moduleName: string;
  enabled: boolean;
  totalSubModules: number;
  documentsCreated: number;
  documentsReady: number;
}

interface ModuleOverviewProps {
  modules: ModuleData[];
  frameworkName: string;
  onModuleClick: (moduleNumber: string) => void;
}

export default function ModuleOverview({
  modules,
  frameworkName,
  onModuleClick,
}: ModuleOverviewProps) {
  const enabledModules = modules?.filter((m) => m.enabled) || [];
  const totalDocuments = enabledModules.reduce(
    (sum, m) => sum + m.totalSubModules,
    0,
  );
  const totalCreated = enabledModules.reduce(
    (sum, m) => sum + m.documentsCreated,
    0,
  );
  const averageCompletion =
    totalDocuments > 0 ? Math.round((totalCreated / totalDocuments) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl tracking-tight">
            Primus GFS Compliance
          </h1>
          <p className="mt-2 text-muted-foreground">
            Select a module to view requirements, generate documents, and track
            compliance status
          </p>
        </div>
        <AddModulesButton />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Enabled Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{enabledModules.length}</div>
            <p className="mt-1 text-muted-foreground text-xs">
              {frameworkName}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Documents Created
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">
              {totalCreated}/{totalDocuments}
            </div>
            <p className="mt-1 text-muted-foreground text-xs">
              Across all modules
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">{averageCompletion}%</div>
            <p className="mt-1 text-muted-foreground text-xs">
              Overall progress
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {enabledModules.map((module) => {
          const Icon = moduleIcons[module.module] || FileText;
          const colors = moduleColors[module.module] || moduleColors["1"];
          const completion =
            module.totalSubModules > 0
              ? Math.round(
                  (module.documentsCreated / module.totalSubModules) * 100,
                )
              : 0;
          const status =
            completion === 100
              ? "active"
              : completion > 0
                ? "review"
                : "pending";

          return (
            <Card
              key={module.module}
              className="group relative overflow-hidden border-2 transition-all duration-300 hover:border-primary/20 hover:shadow-lg"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${colors.bgGradient} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
              />

              <CardHeader className="relative">
                <div className="flex items-start justify-between">
                  <div
                    className={`rounded-xl bg-gradient-to-br p-3 ${colors.gradient} shadow-lg`}
                  >
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <Badge
                    variant={
                      status === "active"
                        ? "default"
                        : status === "review"
                          ? "secondary"
                          : "outline"
                    }
                    className="capitalize"
                  >
                    {status === "active" ? (
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                    ) : (
                      <AlertCircle className="mr-1 h-3 w-3" />
                    )}
                    {status}
                  </Badge>
                </div>

                <div className="mt-4">
                  <div className="mb-1 font-mono text-muted-foreground text-sm">
                    Module {module.module.padStart(2, "0")}
                  </div>
                  <CardTitle className="text-xl">{module.moduleName}</CardTitle>
                </div>
                <CardDescription className="line-clamp-2 min-h-[2.5rem]">
                  {module.totalSubModules} sub-modules • {module.documentsReady}{" "}
                  ready for review
                </CardDescription>
              </CardHeader>

              <CardContent className="relative space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Documents</span>
                  <span className="font-semibold">
                    {module.documentsCreated}/{module.totalSubModules}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completion</span>
                    <span className="font-semibold">{completion}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full bg-gradient-to-r ${colors.gradient} transition-all duration-500`}
                      style={{ width: `${completion}%` }}
                    />
                  </div>
                </div>

                <Button
                  className="w-full transition-all group-hover:shadow-md"
                  variant="outline"
                  onClick={() => onModuleClick(module.module)}
                >
                  View Details
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
