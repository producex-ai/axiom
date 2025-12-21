"use client";

import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  FileSearch,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSaveModules } from "@/lib/compliance/queries";

/**
 * Module definition from framework
 */
interface ModuleOption {
  id: string;
  number: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  bgGradient: string;
  submoduleCount: number;
  questionCount: number;
}

/**
 * Available modules for selection
 * Matches the static JSON structure from server/primus/spec/modules
 */
const availableModules: ModuleOption[] = [
  {
    id: "1",
    number: "01",
    title: "Food Safety Management System (FSMS)",
    description:
      "Management systems, document control, procedures, internal audits, product release, supplier control, traceability, and intentional contamination prevention",
    icon: FileText,
    gradient: "from-blue-500 to-cyan-500",
    bgGradient: "from-blue-500/10 to-cyan-500/10",
    submoduleCount: 8,
    questionCount: 42,
  },
  {
    id: "2",
    number: "02",
    title: "Farm - Good Agricultural Practices",
    description:
      "Farm operations, site management, ground history, adjacent land risks, chemical control, training, field worker hygiene, agricultural water, and harvest practices",
    icon: Package,
    gradient: "from-green-500 to-emerald-500",
    bgGradient: "from-green-500/10 to-emerald-500/10",
    submoduleCount: 11,
    questionCount: 94,
  },
  {
    id: "3",
    number: "03",
    title: "Indoor Agriculture",
    description:
      "Controlled environment agriculture (CEA), facility management, environmental controls, pest management, sanitation, operational practices, water systems, and harvest procedures",
    icon: BookOpen,
    gradient: "from-teal-500 to-cyan-500",
    bgGradient: "from-teal-500/10 to-cyan-500/10",
    submoduleCount: 14,
    questionCount: 139,
  },
  {
    id: "4",
    number: "04",
    title: "Harvest Crew",
    description:
      "Harvest crew operations, worker facilities, hygiene practices, equipment management, and harvest safety protocols",
    icon: ClipboardCheck,
    gradient: "from-amber-500 to-orange-500",
    bgGradient: "from-amber-500/10 to-orange-500/10",
    submoduleCount: 8,
    questionCount: 62,
  },
  {
    id: "5",
    number: "05",
    title: "Facility & Handling Operations",
    description:
      "Facility operations, product handling, processing, packaging, storage, pest control, chemical management, and sanitation programs",
    icon: Warehouse,
    gradient: "from-violet-500 to-purple-500",
    bgGradient: "from-violet-500/10 to-purple-500/10",
    submoduleCount: 18,
    questionCount: 206,
  },
  {
    id: "6",
    number: "06",
    title: "HACCP Requirements",
    description:
      "Hazard Analysis Critical Control Points (HACCP) system, food safety plans, critical control points, monitoring procedures, and verification activities",
    icon: ShieldCheck,
    gradient: "from-red-500 to-pink-500",
    bgGradient: "from-red-500/10 to-pink-500/10",
    submoduleCount: 3,
    questionCount: 16,
  },
  {
    id: "7",
    number: "07",
    title: "Environmental Monitoring Program",
    description:
      "Environmental monitoring procedures, sampling plans, testing protocols, and corrective actions for food safety environmental programs",
    icon: FileSearch,
    gradient: "from-indigo-500 to-blue-500",
    bgGradient: "from-indigo-500/10 to-blue-500/10",
    submoduleCount: 4,
    questionCount: 15,
  },
];

type ModuleSelectionOnboardingProps = {};

export default function ModuleSelectionOnboarding({}: ModuleSelectionOnboardingProps) {
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(),
  );
  const saveModulesMutation = useSaveModules();

  /**
   * Toggle module selection
   */
  const toggleModule = (moduleId: string) => {
    setSelectedModules((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  /**
   * Submit module selection
   */
  const handleSubmit = async () => {
    if (selectedModules.size === 0) {
      toast.error("Please select at least one module");
      return;
    }

    try {
      await saveModulesMutation.mutateAsync(Array.from(selectedModules));
      toast.success(`Successfully configured ${selectedModules.size} modules`);
      // Query will automatically refetch and UI will update
    } catch (error) {
      console.error("Error saving modules:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save modules",
      );
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
          <ShieldCheck className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-bold text-4xl tracking-tight">
          Welcome to Primus GFS Compliance
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Select the modules that apply to your operation. You can modify this
          selection later.
        </p>
      </div>

      {/* Selection Summary */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="font-medium text-muted-foreground text-sm">
                Modules Selected
              </div>
              <div className="font-bold text-3xl">
                {selectedModules.size} of {availableModules.length}
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={
                selectedModules.size === 0 || saveModulesMutation.isPending
              }
              className="min-w-[200px]"
            >
              {saveModulesMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Configuring...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {availableModules.map((module) => {
          const isSelected = selectedModules.has(module.id);
          const Icon = module.icon;

          return (
            <Card
              key={module.id}
              className={`group relative cursor-pointer overflow-hidden transition-all duration-300 ${
                isSelected
                  ? "scale-[1.02] border-2 border-primary shadow-lg"
                  : "border-2 border-transparent hover:border-primary/20 hover:shadow-md"
              }`}
              onClick={() => toggleModule(module.id)}
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${module.bgGradient} ${
                  isSelected
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-50"
                } transition-opacity duration-300`}
              />

              {/* Selection indicator */}
              <div className="absolute top-4 right-4 z-10">
                {isSelected ? (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary shadow-lg">
                    <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted-foreground/30 transition-colors group-hover:border-primary/50">
                    <Circle className="h-5 w-5 text-muted-foreground/30 group-hover:text-primary/50" />
                  </div>
                )}
              </div>

              <CardHeader className="relative pb-4">
                <div
                  className={`rounded-xl bg-gradient-to-br p-3 ${module.gradient} w-fit shadow-lg`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="font-mono text-muted-foreground text-sm">
                    Module {module.number}
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {module.title}
                  </CardTitle>
                </div>
                <CardDescription className="line-clamp-3 min-h-[4.5rem] text-sm">
                  {module.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative space-y-3 pt-0">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-muted-foreground">
                      {module.submoduleCount} Submodules
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-accent" />
                    <span className="text-muted-foreground">
                      {module.questionCount} Questions
                    </span>
                  </div>
                </div>

                {isSelected && (
                  <Badge
                    variant="default"
                    className="w-full justify-center bg-primary py-2"
                  >
                    Selected
                  </Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer help text */}
      <div className="mx-auto max-w-2xl text-center text-muted-foreground text-sm">
        <p>
          Don't worry if you're not sure which modules to select. You can always
          add or remove modules later from your compliance dashboard settings.
        </p>
      </div>
    </div>
  );
}
