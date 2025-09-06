import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('photos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching photo:', error);
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/photos/[id]:', error);
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
    const {
      album_id,
      cloudinary_public_id,
      cloudinary_url,
      title,
      description,
      alt_text,
      order_index,
      is_published,
      metadata
    } = body;

    const { data, error } = await supabaseAdmin
      .from('photos')
      .update({
        album_id,
        cloudinary_public_id,
        cloudinary_url,
        title,
        description,
        alt_text,
        order_index,
        is_published,
        metadata,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating photo:', error);
      return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in PUT /api/photos/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('photos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting photo:', error);
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/photos/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
