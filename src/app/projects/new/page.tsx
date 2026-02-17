"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { Loader2, ArrowRight } from "lucide-react";

const PROJECT_TYPES = [
  "Web App",
  "SaaS",
  "Mobile App",
  "API",
  "E-Commerce",
  "Landing Page",
  "Dashboard",
  "CLI Tool",
  "Other",
];

export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !description || !projectType) return;

    try {
      const project = await createProject.mutateAsync({
        name: name.toLowerCase().replace(/\s+/g, "-"),
        description,
        projectType: projectType.toLowerCase(),
      });
      router.push(`/projects/${project.id}`);
    } catch {
      // Error handled by mutation
    }
  }

  return (
    <div className="flex flex-col">
      <Header title="New Project" />
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Describe Your Idea</CardTitle>
            <CardDescription>
              Tell us what you want to build. The more detail you provide, the
              better the AI can plan and execute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="my-awesome-app"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Project Type</Label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Project Description</Label>
                <Textarea
                  id="description"
                  placeholder="I want to build a SaaS platform that helps small businesses track their inventory. It should have user authentication, a dashboard showing stock levels, and email alerts when items run low..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[120px]"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={
                  !name ||
                  !description ||
                  !projectType ||
                  createProject.isPending
                }
              >
                {createProject.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Create Project
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
