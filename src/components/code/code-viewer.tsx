"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CodeViewerProps {
  filePath: string;
  content: string;
}

export function CodeViewer({ filePath, content }: CodeViewerProps) {
  const [copied, setCopied] = useState(false);

  const lines = content.split("\n");
  const extension = filePath.split(".").pop() || "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">{filePath}</span>
        <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 gap-1.5">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          <span className="text-xs">{copied ? "Copied" : "Copy"}</span>
        </Button>
      </div>
      {/* Code content */}
      <div className="overflow-auto">
        <table className="w-full border-collapse font-mono text-sm">
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="select-none border-r border-border px-3 py-0 text-right text-xs text-muted-foreground">
                  {i + 1}
                </td>
                <td className="px-4 py-0 whitespace-pre">{line || " "}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
