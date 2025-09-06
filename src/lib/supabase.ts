import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// For server-side operations that need elevated permissions
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Database types
export interface Album {
  id: string
  name: string
  description?: string
  cover_image_url?: string
  cover_public_id?: string
  thumbnail_url?: string
  thumbnail_public_id?: string
  created_at: string
  updated_at: string
  order_index: number
  is_published: boolean
}

export interface Photo {
  id: string
  album_id: string
  cloudinary_public_id: string
  cloudinary_url: string
  title?: string
  description?: string
  alt_text?: string
  created_at: string
  updated_at: string
  order_index: number
  is_published: boolean
  is_cover: boolean
  metadata?: {
    width?: number
    height?: number
    size?: number
    format?: string
  }
}

// Database operations
export const albumsApi = {
  async getAll() {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('is_published', true)
      .order('order_index', { ascending: true })
    
    if (error) throw error
    return data as Album[]
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from('albums')
      .select('*')
      .eq('id', id)
      .eq('is_published', true)
      .single()
    
    if (error) throw error
    return data as Album
  },

  async create(album: Omit<Album, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('albums')
      .insert(album)
      .select()
      .single()
    
    if (error) throw error
    return data as Album
  },

  async update(id: string, updates: Partial<Album>) {
    const { data, error } = await supabase
      .from('albums')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Album
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('albums')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}

export const photosApi = {
  async getByAlbumId(albumId: string) {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .eq('album_id', albumId)
      .eq('is_published', true)
      .order('order_index', { ascending: true })
    
    if (error) throw error
    return data as Photo[]
  },

  async create(photo: Omit<Photo, 'id' | 'created_at' | 'updated_at'>) {
    const { data, error } = await supabase
      .from('photos')
      .insert(photo)
      .select()
      .single()
    
    if (error) throw error
    return data as Photo
  },

  async update(id: string, updates: Partial<Photo>) {
    const { data, error } = await supabase
      .from('photos')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    
    if (error) throw error
    return data as Photo
  },

  async delete(id: string) {
    const { error } = await supabase
      .from('photos')
      .delete()
      .eq('id', id)
    
    if (error) throw error
  }
}
