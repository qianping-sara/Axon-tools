"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Network, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface OntologyModel {
  id: number;
  name: string;
  description: string;
  level: number;
  plantuml_code: string;
  created_at: string;
  updated_at: string;
}

const LEVEL_LABELS = {
  1: "Domain Architecture",
  2: "Domain Models",
  3: "Domain Details",
};

const LEVEL_COLORS = {
  1: "bg-primary/10 text-primary border-primary/20",
  2: "bg-accent/20 text-accent-foreground border-accent/30",
  3: "bg-muted text-muted-foreground border-border",
};

export default function OntologyPage() {
  const [models, setModels] = useState<OntologyModel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      console.log("[v0] Fetching ontology models...");
      const response = await fetch("/api/ontology");
      console.log("[v0] Response status:", response.status);
      const data = await response.json();
      console.log("[v0] Response data:", data);
      setModels(data.models || []);
    } catch (error) {
      console.error("[v0] Failed to fetch models:", error);
    } finally {
      setLoading(false);
    }
  };

  const modelsByLevel = models.reduce((acc, model) => {
    if (!acc[model.level]) acc[model.level] = [];
    acc[model.level].push(model);
    return acc;
  }, {} as Record<number, OntologyModel[]>);

  return (
    <div className="w-[80%] max-w-6xl mx-auto py-8">
      <div className="mb-8 flex items-end justify-between">
        <PageHeader
          title="Ontology Models"
          description="Business ontology modeling with hierarchical structure"
        />
        <Link href="/ontology/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Model
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : models.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Network className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Ontology Models</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Start building your business ontology by creating your first model
          </p>
          <Link href="/ontology/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create First Model
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {[1, 2, 3].map((level) => {
            const levelModels = modelsByLevel[level] || [];
            if (levelModels.length === 0) return null;

            return (
              <div key={level}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold mb-1">
                    Level {level}: {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {level === 1 && "High-level domain relationships and architecture"}
                    {level === 2 && "Domain-specific models and entities"}
                    {level === 3 && "Detailed domain implementations"}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {levelModels.map((model) => (
                    <Link key={model.id} href={`/ontology/${model.id}`}>
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <Network className="h-5 w-5 text-primary" />
                            <span className={`text-xs px-2 py-0.5 rounded border ${LEVEL_COLORS[level as keyof typeof LEVEL_COLORS]}`}>
                              L{level}
                            </span>
                          </div>
                          <CardTitle className="text-base">{model.name}</CardTitle>
                          {model.description && (
                            <CardDescription className="line-clamp-2">
                              {model.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-xs text-muted-foreground">
                            Updated {new Date(model.updated_at).toLocaleDateString()}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
