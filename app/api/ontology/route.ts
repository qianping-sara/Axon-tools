import { NextResponse } from "next/server";
import { sql, initOntologyTable } from "@/lib/db/neon";

// Initialize table on first request
let tableInitialized = false;

export async function GET() {
  try {
    if (!tableInitialized) {
      await initOntologyTable();
      tableInitialized = true;
    }

    const models = await sql`
      SELECT id, name, description, level, plantuml_code, created_at, updated_at
      FROM ontology_models
      ORDER BY level ASC, created_at DESC
    `;

    return NextResponse.json({ models });
  } catch (error) {
    console.error("Failed to fetch ontology models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!tableInitialized) {
      await initOntologyTable();
      tableInitialized = true;
    }

    const body = await request.json();
    const { name, description, level, plantuml_code } = body;

    if (!name || !level || !plantuml_code) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await sql`
      INSERT INTO ontology_models (name, description, level, plantuml_code)
      VALUES (${name}, ${description || ""}, ${level}, ${plantuml_code})
      RETURNING id, name, description, level, plantuml_code, created_at, updated_at
    `;

    return NextResponse.json({ model: result[0] });
  } catch (error) {
    console.error("Failed to create ontology model:", error);
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    );
  }
}
