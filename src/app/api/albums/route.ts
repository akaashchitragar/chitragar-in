import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('albums')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching albums:', error);
      return NextResponse.json({ error: 'Failed to fetch albums' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in GET /api/albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, cover_image_url, cover_image_id, thumbnail_url, thumbnail_id, order_index, is_published } = body;

    if (!name) {
      return NextResponse.json({ error: 'Album name is required' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('albums')
      .insert({
        name,
        description,
        cover_image_url,
        cover_image_id,
        thumbnail_url,
        thumbnail_id,
        order_index: order_index || 0,
        is_published: is_published !== undefined ? is_published : true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating album:', error);
      return NextResponse.json({ error: 'Failed to create album' }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/albums:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
