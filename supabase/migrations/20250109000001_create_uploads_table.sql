-- Create uploads table for QR file uploads
CREATE TABLE IF NOT EXISTS uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    uploaded_by TEXT,
    processed BOOLEAN DEFAULT FALSE
);

-- Create index on session_id for better performance
CREATE INDEX IF NOT EXISTS idx_uploads_session_id ON uploads(session_id);

-- Create index on created_at for better performance
CREATE INDEX IF NOT EXISTS idx_uploads_created_at ON uploads(created_at);

-- Enable Row Level Security
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on uploads" ON uploads FOR ALL TO anon USING (true);

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('uploads', 'uploads', true) 
ON CONFLICT (id) DO NOTHING;