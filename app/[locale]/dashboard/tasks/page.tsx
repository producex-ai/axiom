import { AlertCircle, Calendar, ClipboardList, User } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function TasksPage() {
  const tasks = [
    {
      id: 1,
      title: "Review FSMS Document",
      module: "Module 1",
      priority: "high",
      dueDate: "2024-03-20",
      assignedTo: "John Doe",
      status: "pending",
    },
    {
      id: 2,
      title: "Update Pest Control Log",
      module: "Module 5",
      priority: "medium",
      dueDate: "2024-03-22",
      assignedTo: "Jane Smith",
      status: "in-progress",
    },
    {
      id: 3,
      title: "HACCP Plan Annual Review",
      module: "Module 6",
      priority: "high",
      dueDate: "2024-03-25",
      assignedTo: "John Doe",
      status: "pending",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">Tasks</h1>
        <p className="mt-2 text-muted-foreground">
          Manage compliance tasks and document reviews
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              High Priority
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl text-orange-500">2</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              In Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl text-blue-500">1</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Task List</CardTitle>
          <CardDescription>
            Active compliance and documentation tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between rounded-lg border p-4 transition-colors hover:bg-accent/50"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">{task.title}</p>
                      <p className="text-muted-foreground text-sm">
                        {task.module}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pl-8 text-muted-foreground text-sm">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{task.dueDate}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      <span>{task.assignedTo}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      task.priority === "high" ? "destructive" : "secondary"
                    }
                    className="capitalize"
                  >
                    {task.priority === "high" && (
                      <AlertCircle className="mr-1 h-3 w-3" />
                    )}
                    {task.priority}
                  </Badge>
                  <Badge
                    variant={
                      task.status === "in-progress" ? "default" : "outline"
                    }
                  >
                    {task.status}
                  </Badge>
                  <Button variant="outline" size="sm">
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
