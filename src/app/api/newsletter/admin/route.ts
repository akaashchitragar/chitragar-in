import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Simple auth check - remove this if you want no auth
function checkAdminAuth(): boolean {
  // For now, just return true to allow access
  // You can add your own simple auth logic here if needed
  return true;
}

// GET - Fetch newsletter subscribers for admin
export async function GET(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const search = searchParams.get('search') || '';

    let query = supabase
      .from('newsletter_subscribers')
      .select(`
        *,
        newsletter_email_log (
          email_type,
          status,
          sent_at,
          delivered_at,
          opened_at
        )
      `)
      .order('subscribed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Filter by status
    if (status === 'active') {
      query = query.eq('is_active', true).is('unsubscribed_at', null);
    } else if (status === 'unsubscribed') {
      query = query.not('unsubscribed_at', 'is', null);
    } else if (status === 'all') {
      // No additional filter
    }

    // Search by email
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }

    const { data: subscribers, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscribers' },
        { status: 500 }
      );
    }

    // Get statistics directly from the table to avoid view issues
    const { data: allSubscribers } = await supabase
      .from('newsletter_subscribers')
      .select('is_active, unsubscribed_at, welcome_email_sent, subscribed_at');

    const stats = allSubscribers ? {
      total_subscribers: allSubscribers.length,
      active_subscribers: allSubscribers.filter(s => s.is_active && !s.unsubscribed_at).length,
      unsubscribed: allSubscribers.filter(s => s.unsubscribed_at).length,
      welcome_emails_sent: allSubscribers.filter(s => s.welcome_email_sent).length,
      new_this_month: allSubscribers.filter(s => {
        const subscribed = new Date(s.subscribed_at);
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return subscribed >= monthAgo;
      }).length,
      new_this_week: allSubscribers.filter(s => {
        const subscribed = new Date(s.subscribed_at);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return subscribed >= weekAgo;
      }).length
    } : {};

    return NextResponse.json({
      subscribers: subscribers || [],
      stats: stats || {},
      hasMore: subscribers?.length === limit
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update subscriber (add notes, tags, etc.)
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscriberId, notes, tags, isActive } = body;

    if (!subscriberId) {
      return NextResponse.json(
        { error: 'Subscriber ID is required' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (notes !== undefined) updateData.notes = notes;
    if (tags !== undefined) updateData.tags = tags;
    if (isActive !== undefined) {
      updateData.is_active = isActive;
      if (!isActive) {
        updateData.unsubscribed_at = new Date().toISOString();
      } else {
        updateData.unsubscribed_at = null;
      }
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update(updateData)
      .eq('id', subscriberId);

    if (error) {
      console.error('Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber updated successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove subscriber (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const subscriberId = searchParams.get('id');

    if (!subscriberId) {
      return NextResponse.json(
        { error: 'Subscriber ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('newsletter_subscribers')
      .update({ 
        deleted_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', subscriberId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete subscriber' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Subscriber deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
