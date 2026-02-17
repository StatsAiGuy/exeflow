"use client";

import { Header } from "@/components/layout/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Plug } from "lucide-react";
import { BUILTIN_MCP_REGISTRY } from "@/lib/connections/mcp-registry";

export default function ConnectionsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Connections">
        <Button size="sm" className="ml-auto">
          <Plus className="mr-1 h-3 w-3" /> Add Connection
        </Button>
      </Header>
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {BUILTIN_MCP_REGISTRY.map((spec) => (
            <Card key={spec.name}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Plug className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{spec.name}</CardTitle>
                </div>
                <CardDescription className="text-sm">
                  {spec.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-1">
                  {spec.recommendedFor?.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-3">
                  <Button size="sm" variant="outline" className="w-full">
                    Configure
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
