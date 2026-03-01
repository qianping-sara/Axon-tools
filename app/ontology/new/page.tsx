"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { PlantUMLEditor } from "@/components/plantuml-editor";

export default function NewOntologyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("1");
  const [plantumlCode, setPlantumlCode] = useState("@startuml\n\n@enduml");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim() || !plantumlCode.trim()) {
      alert("Please enter a name and PlantUML code");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/ontology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          level: Number.parseInt(level),
          plantuml_code: plantumlCode,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/ontology/${data.model.id}`);
      } else {
        alert("Failed to create model");
      }
    } catch (error) {
      console.error("Failed to save model:", error);
      alert("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-[80%] max-w-6xl mx-auto py-8">
      <div className="mb-8">
        <Link
          href="/ontology"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Ontology
        </Link>
        <div className="flex items-end justify-between">
          <PageHeader
            title="New Ontology Model"
            description="Create a new business ontology model with PlantUML"
          />
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Model
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="name">Model Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Company Research Domain"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="level">Hierarchy Level *</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Level 1: Domain Architecture</SelectItem>
                <SelectItem value="2">Level 2: Domain Models</SelectItem>
                <SelectItem value="3">Level 3: Domain Details</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this ontology model..."
            className="resize-none"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>PlantUML Code *</Label>
          <PlantUMLEditor value={plantumlCode} onChange={setPlantumlCode} />
        </div>
      </div>
    </div>
  );
}
