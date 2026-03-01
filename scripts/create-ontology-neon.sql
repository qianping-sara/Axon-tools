-- Create ontology_models table in Neon database
CREATE TABLE IF NOT EXISTS ontology_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  plantuml_code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_ontology_level ON ontology_models(level);
CREATE INDEX idx_ontology_created_at ON ontology_models(created_at DESC);
