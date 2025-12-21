"use client";

import { Loader2, Plus } from "lucide-react";
import React, { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useComplianceOverview,
  useSaveModules,
} from "@/lib/compliance/queries";

// Module definitions (same as ModuleSelectionOnboarding)
const availableModules = [
  {
    id: "1",
    name: "Operation Information",
    description: "Basic operation details and food safety programs",
    icon: "📋",
  },
  {
    id: "2",
    name: "Product Traceability",
    description: "Track and trace systems for product movement",
    icon: "🔍",
  },
  {
    id: "3",
    name: "Mass Balance",
    description: "Product accountability and reconciliation",
    icon: "⚖️",
  },
  {
    id: "4",
    name: "Harvest Crew",
    description: "Harvest crew operations and hygiene",
    icon: "👥",
  },
  {
    id: "5",
    name: "Sanitation & Worker Hygiene",
    description: "Sanitation procedures and worker hygiene",
    icon: "🧼",
  },
  {
    id: "6",
    name: "Pest Management",
    description: "Integrated pest management programs",
    icon: "🐛",
  },
  {
    id: "7",
    name: "Food Defense",
    description: "Security measures and contamination prevention",
    icon: "🛡️",
  },
];

export default function AddModulesButton() {
  const [open, setOpen] = useState(false);
  const [selectedModules, setSelectedModules] = useState<Set<string>>(
    new Set(),
  );
  const { data: overview } = useComplianceOverview();
  const saveModulesMutation = useSaveModules();

  const enabledModuleIds = new Set(
    overview?.modules?.map((m) => m.module) || [],
  );
  const disabledModules = availableModules.filter(
    (m) => !enabledModuleIds.has(m.id),
  );

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

  const handleSubmit = async () => {
    if (selectedModules.size === 0) {
      toast.error("Please select at least one module to add");
      return;
    }

    try {
      // Combine existing and new modules
      const allModuleIds = [
        ...Array.from(enabledModuleIds),
        ...Array.from(selectedModules),
      ];
      await saveModulesMutation.mutateAsync(allModuleIds);
      toast.success(`Successfully added ${selectedModules.size} module(s)`);
      setOpen(false);
      setSelectedModules(new Set());
    } catch (error) {
      console.error("Error adding modules:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add modules",
      );
    }
  };

  // If all modules are enabled, don't show button
  if (disabledModules.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Modules
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add More Modules</DialogTitle>
          <DialogDescription>
            Select additional modules to enable for your compliance framework
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {disabledModules.map((module) => (
            <div
              key={module.id}
              className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
                selectedModules.has(module.id)
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              }`}
              onClick={() => toggleModule(module.id)}
            >
              <Checkbox
                checked={selectedModules.has(module.id)}
                onCheckedChange={() => toggleModule(module.id)}
                className="mt-1"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-2xl">{module.icon}</span>
                  <div>
                    <h4 className="font-semibold text-sm">
                      Module {module.id}
                    </h4>
                    <p className="font-medium text-sm">{module.name}</p>
                  </div>
                </div>
                <p className="text-muted-foreground text-sm">
                  {module.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <div className="flex w-full items-center justify-between">
            <Badge variant="secondary" className="text-sm">
              {selectedModules.size} module(s) selected
            </Badge>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  selectedModules.size === 0 || saveModulesMutation.isPending
                }
              >
                {saveModulesMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>Add {selectedModules.size} Module(s)</>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
