import { NextResponse } from "next/server";
import { sql } from "@/lib/db/neon";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const models = await sql`
      SELECT id, name, description, level, plantuml_code, created_at, updated_at
      FROM ontology_models
      WHERE id = ${params.id}
    `;

    if (models.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({ model: models[0] });
  } catch (error) {
    console.error("Failed to fetch ontology model:", error);
    return NextResponse.json(
      { error: "Failed to fetch model" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, description, level, plantuml_code } = body;

    const result = await sql`
      UPDATE ontology_models
      SET 
        name = ${name},
        description = ${description || ""},
        level = ${level},
        plantuml_code = ${plantuml_code},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${params.id}
      RETURNING id, name, description, level, plantuml_code, created_at, updated_at
    `;

    if (result.length === 0) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 });
    }

    return NextResponse.json({ model: result[0] });
  } catch (error) {
    console.error("Failed to update ontology model:", error);
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await sql`
      DELETE FROM ontology_models
      WHERE id = ${params.id}
    `;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete ontology model:", error);
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    );
  }
}
