"use client";

import { Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import ModuleDetailView from "@/components/compliance/ModuleDetailView";
import ModuleOverview from "@/components/compliance/ModuleOverview";

interface ModuleData {
  module: string;
  moduleName: string;
  enabled: boolean;
  totalSubModules: number;
  documentsCreated: number;
  documentsReady: number;
  subModules?: any[];
  submodules?: any[];
}

interface ComplianceContentProps {
  modules?: ModuleData[];
  frameworkName?: string;
  overviewData?: any;
}

export default function ComplianceContent({
  modules: modulesProp,
  frameworkName: frameworkNameProp,
  overviewData,
}: ComplianceContentProps) {
  const modules = modulesProp || overviewData?.modules || [];
  const frameworkName =
    frameworkNameProp || overviewData?.frameworkName || "Primus GFS";

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [moduleData, setModuleData] = useState<ModuleData | null>(null);
  const [loadingModule, setLoadingModule] = useState(false);

  // Single source of truth: derive selectedModule directly from URL
  const selectedModule = searchParams?.get("module") || null;

  // Update module data when overviewData changes (e.g., after cache invalidation)
  useEffect(() => {
    if (selectedModule && moduleData && modules.length > 0) {
      const updatedModule = modules.find(
        (m: ModuleData) => m.module === selectedModule,
      );
      if (updatedModule) {
        setModuleData({
          ...updatedModule,
          subModules: updatedModule.submodules || [],
        });
      }
    }
  }, [overviewData, modules]);

  // Load module details when URL parameter changes
  useEffect(() => {
    if (selectedModule && modules.length > 0) {
      loadModuleDetails(selectedModule);
    } else if (!selectedModule) {
      // Clear module data when returning to overview
      setModuleData(null);
      setLoadingModule(false);
    }
  }, [selectedModule, modules.length]);

  const loadModuleDetails = async (moduleNumber: string) => {
    setLoadingModule(true);

    const module = modules.find((m: ModuleData) => m.module === moduleNumber);
    if (module) {
      setModuleData({
        ...module,
        subModules: module.submodules || [],
      });
    }
    setLoadingModule(false);
  };

  const handleModuleClick = (moduleNumber: string) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("module", moduleNumber);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleBackToModules = () => {
    router.push(pathname || "/compliance");
  };

  // Show loading state while fetching module details
  if (selectedModule && !moduleData) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show module detail view
  if (selectedModule && moduleData && moduleData.subModules) {
    return (
      <ModuleDetailView
        moduleNumber={selectedModule}
        moduleData={moduleData as any}
        loading={loadingModule}
        onBack={handleBackToModules}
      />
    );
  }

  // Show module overview (default view)
  return (
    <ModuleOverview
      modules={modules}
      frameworkName={frameworkName}
      onModuleClick={handleModuleClick}
    />
  );
}
