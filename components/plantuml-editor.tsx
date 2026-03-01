"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Eye, Code } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PlantUMLEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function PlantUMLEditor({ value, onChange }: PlantUMLEditorProps) {
  const [activeTab, setActiveTab] = useState<"code" | "preview">("code");

  const getPlantUMLImageUrl = (code: string) => {
    if (!code.trim()) return "";
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return `https://www.plantuml.com/plantuml/svg/${encoded}`;
  };

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "code" | "preview")} className="w-full">
      <TabsList className="grid w-full max-w-[400px] grid-cols-2">
        <TabsTrigger value="code" className="gap-2">
          <Code className="h-4 w-4" />
          Code
        </TabsTrigger>
        <TabsTrigger value="preview" className="gap-2">
          <Eye className="h-4 w-4" />
          Preview
        </TabsTrigger>
      </TabsList>

      <TabsContent value="code" className="mt-4">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="@startuml&#10;Alice -> Bob: Hello&#10;Bob -> Alice: Hi!&#10;@enduml"
          className="font-mono text-sm min-h-[400px] resize-y"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Enter your PlantUML code. Start with @startuml and end with @enduml
        </p>
      </TabsContent>

      <TabsContent value="preview" className="mt-4">
        {value.trim() ? (
          <div className="border border-border rounded-lg p-4 bg-card min-h-[400px] flex items-center justify-center overflow-auto">
            <img
              src={getPlantUMLImageUrl(value) || "/placeholder.svg"}
              alt="PlantUML Diagram"
              className="max-w-full h-auto"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.parentElement!.innerHTML = '<p class="text-sm text-destructive">Failed to render diagram. Check your PlantUML syntax.</p>';
              }}
            />
          </div>
        ) : (
          <div className="border border-dashed border-border rounded-lg p-12 text-center text-muted-foreground min-h-[400px] flex items-center justify-center">
            <p>Enter PlantUML code to see the preview</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
