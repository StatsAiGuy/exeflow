"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { FolderKanban } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { Project } from "@/types/project";

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
    >
      <Link href={`/projects/${project.id}`}>
        <Card className="cursor-pointer transition-shadow hover:shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{project.name}</CardTitle>
              </div>
              <StatusBadge status={project.status} />
            </div>
            <CardDescription className="line-clamp-2 text-sm">
              {project.description}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {project.projectType}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(project.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
