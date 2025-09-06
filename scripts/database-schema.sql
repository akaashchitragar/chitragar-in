-- Create albums table
CREATE TABLE IF NOT EXISTS albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  cover_image_id VARCHAR(255),
  thumbnail_url TEXT,
  thumbnail_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  imagekit_file_id VARCHAR(255) NOT NULL,
  imagekit_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_albums_published ON albums(is_published, order_index);
CREATE INDEX IF NOT EXISTS idx_albums_order ON albums(order_index);
CREATE INDEX IF NOT EXISTS idx_photos_album ON photos(album_id, is_published, order_index);
CREATE INDEX IF NOT EXISTS idx_photos_order ON photos(order_index);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_albums_updated_at 
    BEFORE UPDATE ON albums 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_photos_updated_at 
    BEFORE UPDATE ON photos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access
CREATE POLICY "Albums are viewable by everyone" ON albums
    FOR SELECT USING (is_published = true);

CREATE POLICY "Photos are viewable by everyone" ON photos
    FOR SELECT USING (is_published = true);

-- Create policies for authenticated users (admin) - full access
CREATE POLICY "Albums are manageable by authenticated users" ON albums
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Photos are manageable by authenticated users" ON photos
    FOR ALL USING (auth.role() = 'authenticated');

-- Insert some sample data (optional)
INSERT INTO albums (name, description, order_index) VALUES 
('Nature Photography', 'Beautiful landscapes and wildlife shots', 1),
('Portrait Sessions', 'Professional portrait photography', 2),
('Street Photography', 'Candid moments from urban life', 3)
ON CONFLICT DO NOTHING;
