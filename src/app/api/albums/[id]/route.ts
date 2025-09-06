import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('albums')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching album:', error);
      return NextResponse.json({ error: 'Album not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/albums/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, cover_image_url, cover_image_id, thumbnail_url, thumbnail_id, order_index, is_published } = body;

    const { data, error } = await supabaseAdmin
      .from('albums')
      .update({
        name,
        description,
        cover_image_url,
        cover_image_id,
        thumbnail_url,
        thumbnail_id,
        order_index,
        is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating album:', error);
      return NextResponse.json({ error: 'Failed to update album' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/albums/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // First, delete all photos in this album
    const { error: photosError } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('album_id', id);

    if (photosError) {
      console.error('Error deleting photos:', photosError);
      return NextResponse.json({ error: 'Failed to delete album photos' }, { status: 500 });
    }

    // Then delete the album
    const { error } = await supabaseAdmin
      .from('albums')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting album:', error);
      return NextResponse.json({ error: 'Failed to delete album' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Album deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/albums/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
