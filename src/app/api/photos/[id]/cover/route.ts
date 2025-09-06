import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { is_cover } = body;

    // First, get the photo to find its album_id
    const { data: photo, error: photoError } = await supabaseAdmin
      .from('photos')
      .select('album_id')
      .eq('id', id)
      .single();

    if (photoError || !photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // If setting as cover, remove cover status from other photos in the same album
    if (is_cover) {
      await supabaseAdmin
        .from('photos')
        .update({ is_cover: false })
        .eq('album_id', photo.album_id);
    }

    // Update the current photo's cover status
    const { data, error } = await supabaseAdmin
      .from('photos')
      .update({ 
        is_cover,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating photo cover status:', error);
      return NextResponse.json({ error: 'Failed to update photo cover status' }, { status: 500 });
    }

    // If this photo is now the cover, update the album's cover image info
    if (is_cover) {
      const { data: updatedPhoto } = await supabaseAdmin
        .from('photos')
        .select('cloudinary_public_id, cloudinary_url')
        .eq('id', id)
        .single();

      if (updatedPhoto) {
        await supabaseAdmin
          .from('albums')
          .update({
            cover_image_url: updatedPhoto.cloudinary_url,
            cover_public_id: updatedPhoto.cloudinary_public_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', photo.album_id);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/photos/[id]/cover:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
