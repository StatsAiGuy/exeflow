"use client";

import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Plus,
  Plug,
  Search,
  ExternalLink,
  CheckCircle2,
  Globe,
  Terminal,
} from "lucide-react";
import { BUILTIN_MCP_REGISTRY } from "@/lib/connections/mcp-registry";

export default function ConnectionsPage() {
  const [search, setSearch] = useState("");
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());

  const filtered = BUILTIN_MCP_REGISTRY.filter(
    (spec) =>
      spec.name.toLowerCase().includes(search.toLowerCase()) ||
      spec.description.toLowerCase().includes(search.toLowerCase()) ||
      spec.recommendedFor?.some((tag: string) =>
        tag.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <div className="flex flex-col">
      <Header title="Connections">
        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search connections..."
              className="h-8 w-64 pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </Header>
      <div className="space-y-6 p-6">
        {/* Installed count */}
        {installedIds.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            {installedIds.size} connection{installedIds.size !== 1 ? "s" : ""}{" "}
            installed globally
          </div>
        )}

        {/* Connection grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((spec) => {
            const isInstalled = installedIds.has(spec.name);
            const isHttp = spec.mcpConfig?.transport === "http";

            return (
              <Card
                key={spec.name}
                className={isInstalled ? "border-green-500/30" : ""}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Plug className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-base">{spec.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1">
                      {isInstalled && (
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-500"
                        >
                          Installed
                        </Badge>
                      )}
                      {isHttp ? (
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <CardDescription className="text-sm">
                    {spec.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {spec.recommendedFor?.map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Credentials needed */}
                  {spec.credentialSpec?.fields &&
                    spec.credentialSpec.fields.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Requires:{" "}
                        {spec.credentialSpec.fields
                          .map(
                            (f: { label: string }) => f.label,
                          )
                          .join(", ")}
                      </p>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    {isInstalled ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                      >
                        Configure
                      </Button>
                    ) : (
                      <Button size="sm" className="flex-1">
                        <Plus className="mr-1 h-3 w-3" /> Install
                      </Button>
                    )}
                    {spec.credentialSpec?.fields?.some(
                      (f: { helpUrl?: string }) => f.helpUrl,
                    ) && (
                      <Button size="sm" variant="ghost">
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-12">
              <Search className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No connections match your search.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
