import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const albumId = searchParams.get('album_id');

    let query = supabaseAdmin.from('photos').select('*');

    if (albumId) {
      query = query.eq('album_id', albumId);
    }

    const { data, error } = await query.order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching photos:', error);
      return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    if (!album_id || !cloudinary_public_id || !cloudinary_url) {
      return NextResponse.json(
        { error: 'Album ID, Cloudinary public ID, and URL are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('photos')
      .insert({
        album_id,
        cloudinary_public_id,
        cloudinary_url,
        title,
        description,
        alt_text,
        order_index: order_index || 0,
        is_published: is_published !== undefined ? is_published : true,
        metadata,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating photo:', error);
      return NextResponse.json({ error: 'Failed to create photo' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/photos:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
