import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Module } from "../types";

interface ModuleProgressProps {
  modules: Module[];
}

export function ModuleProgress({ modules }: ModuleProgressProps) {
  if (!modules || modules.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Module Completion Status</CardTitle>
        <CardDescription>
          Track progress across all compliance modules
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {modules.map((module) => {
            const progress =
              module.totalSubModules > 0
                ? Math.round(
                    (module.documentsReady / module.totalSubModules) * 100
                  )
                : 0;
            return (
              <div key={module.module} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      Module {module.module}: {module.moduleName}
                    </span>
                    <Badge variant={progress === 100 ? "default" : "secondary"}>
                      {module.documentsReady}/{module.totalSubModules}
                    </Badge>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {progress}%
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
