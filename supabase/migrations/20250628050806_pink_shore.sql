/*
  # Create documents table for SPARK system

  1. New Tables
    - `documents`
      - `id` (text, primary key)
      - `type` (jsonb) - Document type information
      - `template_version` (text)
      - `tags` (text array)
      - `fields` (jsonb) - Extracted field data
      - `ocr_raw_text` (text)
      - `image_url` (text)
      - `created_by` (text)
      - `location` (text)
      - `status` (text)
      - `confidence` (real)
      - `timestamp` (timestamptz)
      - `document_data` (text) - Base64 encoded document
      - `extracted_images` (jsonb)
      - `processing_metadata` (jsonb)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `documents` table
    - Add policies for authenticated users
*/

CREATE TABLE IF NOT EXISTS documents (
  id text PRIMARY KEY,
  type jsonb NOT NULL,
  template_version text NOT NULL DEFAULT 'v1.0',
  tags text[] DEFAULT '{}',
  fields jsonb NOT NULL DEFAULT '{}',
  ocr_raw_text text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  created_by text NOT NULL,
  location text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'finalized', 'rejected')),
  confidence real NOT NULL DEFAULT 0,
  timestamp timestamptz NOT NULL DEFAULT now(),
  document_data text DEFAULT '',
  extracted_images jsonb DEFAULT '[]',
  processing_metadata jsonb DEFAULT '{}',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (created_by = auth.jwt() ->> 'sub');

CREATE POLICY "Users can insert own documents"
  ON documents
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.jwt() ->> 'sub');

CREATE POLICY "Users can update own documents"
  ON documents
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.jwt() ->> 'sub');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents(created_by);
CREATE INDEX IF NOT EXISTS idx_documents_timestamp ON documents(timestamp);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_type ON documents USING GIN(type);
CREATE INDEX IF NOT EXISTS idx_documents_fields ON documents USING GIN(fields);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();