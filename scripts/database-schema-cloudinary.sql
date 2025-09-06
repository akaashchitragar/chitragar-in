-- Drop existing tables if they exist
DROP TABLE IF EXISTS photos CASCADE;
DROP TABLE IF EXISTS albums CASCADE;

-- Create albums table with Cloudinary fields
CREATE TABLE albums (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  cover_public_id VARCHAR(255),
  thumbnail_url TEXT,
  thumbnail_public_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true
);

-- Create photos table with Cloudinary fields
CREATE TABLE photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  album_id UUID NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
  cloudinary_public_id VARCHAR(255) NOT NULL,
  cloudinary_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  alt_text VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  is_cover BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}'
);

-- Create indexes for better performance
CREATE INDEX idx_albums_published ON albums(is_published);
CREATE INDEX idx_albums_order ON albums(order_index);
CREATE INDEX idx_photos_album_id ON photos(album_id);
CREATE INDEX idx_photos_published ON photos(is_published);
CREATE INDEX idx_photos_order ON photos(order_index);

-- Enable Row Level Security (RLS)
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Policies for public access (read-only for published content)
CREATE POLICY "Public albums are viewable by everyone" ON albums
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public photos are viewable by everyone" ON photos
  FOR SELECT USING (is_published = true);

-- Policies for admin access (full CRUD)
-- Note: In production, you should implement proper authentication
-- For now, we'll allow service role to bypass RLS for admin operations

-- Allow service role to manage albums
CREATE POLICY "Service role can manage albums" ON albums
  FOR ALL USING (auth.role() = 'service_role');

-- Allow service role to manage photos  
CREATE POLICY "Service role can manage photos" ON photos
  FOR ALL USING (auth.role() = 'service_role');

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

-- Insert sample data (optional)
INSERT INTO albums (name, description, is_published, order_index) VALUES
  ('Sample Album', 'This is a sample album to test the photo gallery', true, 1);

-- Note: After creating this schema, you'll need to:
-- 1. Set up Cloudinary account and get your credentials
-- 2. Add the credentials to your .env.local file:
--    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
--    CLOUDINARY_API_KEY=your-api-key
--    CLOUDINARY_API_SECRET=your-api-secret
-- 3. Create an upload preset in Cloudinary dashboard (optional but recommended)
