import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

export const sql = neon(process.env.DATABASE_URL);

// Initialize ontology_models table if it doesn't exist
export async function initOntologyTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS ontology_models (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
        plantuml_code TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
  } catch (error) {
    console.error("Failed to initialize ontology_models table:", error);
  }
}
