"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Edit2, Trash2, Loader2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/page-header";
import { PlantUMLEditor } from "@/components/plantuml-editor";

interface OntologyModel {
  id: number;
  name: string;
  description: string;
  level: number;
  plantuml_code: string;
  created_at: string;
  updated_at: string;
}

export default function OntologyModelPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [model, setModel] = useState<OntologyModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("1");
  const [plantumlCode, setPlantumlCode] = useState("");

  useEffect(() => {
    fetchModel();
  }, [params.id]);

  const fetchModel = async () => {
    try {
      const response = await fetch(`/api/ontology/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setModel(data.model);
        setName(data.model.name);
        setDescription(data.model.description);
        setLevel(data.model.level.toString());
        setPlantumlCode(data.model.plantuml_code);
      } else {
        router.push("/ontology");
      }
    } catch (error) {
      console.error("Failed to fetch model:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !plantumlCode.trim()) {
      alert("Please enter a name and PlantUML code");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/ontology/${params.id}`, {
        method: "PUT",
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
        setModel(data.model);
        setEditing(false);
      } else {
        alert("Failed to update model");
      }
    } catch (error) {
      console.error("Failed to save model:", error);
      alert("Failed to save model");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this model?")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/ontology/${params.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        router.push("/ontology");
      } else {
        alert("Failed to delete model");
      }
    } catch (error) {
      console.error("Failed to delete model:", error);
      alert("Failed to delete model");
    } finally {
      setDeleting(false);
    }
  };

  const getPlantUMLImageUrl = (code: string) => {
    if (!code.trim()) return "";
    const encoded = btoa(unescape(encodeURIComponent(code)));
    return `https://www.plantuml.com/plantuml/svg/${encoded}`;
  };

  if (loading) {
    return (
      <div className="w-[80%] max-w-6xl mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!model) {
    return null;
  }

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
            title={editing ? "Edit Model" : model.name}
            description={editing ? "Update your ontology model" : model.description}
          />
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button variant="outline" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={handleDelete} disabled={deleting} className="gap-2 text-destructive hover:text-destructive bg-transparent">
                  {deleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
                <Button onClick={() => setEditing(true)} className="gap-2">
                  <Edit2 className="h-4 w-4" />
                  Edit
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {editing ? (
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
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Level:</span>
              <span className="ml-2 font-medium">
                {model.level} - {model.level === 1 ? "Domain Architecture" : model.level === 2 ? "Domain Models" : "Domain Details"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Updated:</span>
              <span className="ml-2 font-medium">
                {new Date(model.updated_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="border border-border rounded-lg p-6 bg-card">
            <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Diagram Preview
            </h3>
            <div className="flex items-center justify-center bg-background rounded p-4">
              <img
                src={getPlantUMLImageUrl(model.plantuml_code) || "/placeholder.svg"}
                alt={model.name}
                className="max-w-full h-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
