"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plug, Trash2, Settings2, Globe, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionCardProps {
  name: string;
  description?: string;
  type: string;
  transport?: string;
  status: "active" | "inactive" | "error";
  tags?: string[];
  onConfigure?: () => void;
  onRemove?: () => void;
}

export function ConnectionCard({
  name,
  description,
  type,
  transport,
  status,
  tags,
  onConfigure,
  onRemove,
}: ConnectionCardProps) {
  return (
    <Card
      className={cn(
        status === "active" && "border-green-500/30",
        status === "error" && "border-red-500/30",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">{name}</CardTitle>
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={
                status === "active"
                  ? "default"
                  : status === "error"
                    ? "destructive"
                    : "secondary"
              }
              className="text-xs"
            >
              {status}
            </Badge>
            {transport === "http" ? (
              <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </div>
        </div>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          {onConfigure && (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 gap-1"
              onClick={onConfigure}
            >
              <Settings2 className="h-3 w-3" /> Configure
            </Button>
          )}
          {onRemove && (
            <Button size="sm" variant="ghost" onClick={onRemove}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
