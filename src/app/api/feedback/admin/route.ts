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

// GET - Fetch pending feedback for admin review
export async function GET(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const query = supabase
      .from('feedback_submissions')
      .select('*')
      .eq('status', status)
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Get counts for different statuses
    const { data: statusCounts } = await supabase
      .from('feedback_submissions')
      .select('status')
      .is('deleted_at', null);

    const counts = statusCounts?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      feedback: data || [],
      counts,
      hasMore: data?.length === limit
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH - Update feedback status (approve/reject/archive)
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      feedbackId, 
      status, 
      adminNotes, 
      displayPublicly, 
      isFeatured, 
      displayOrder 
    } = body;

    if (!feedbackId || !status) {
      return NextResponse.json(
        { error: 'Feedback ID and status are required' },
        { status: 400 }
      );
    }

    // Get current feedback for logging
    const { data: currentFeedback } = await supabase
      .from('feedback_submissions')
      .select('status')
      .eq('id', feedbackId)
      .single();

    // Update feedback
    const updateData: Record<string, unknown> = {
      status,
      admin_notes: adminNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin', // You can get this from auth context
    };

    if (status === 'approved') {
      updateData.display_publicly = displayPublicly !== false;
      updateData.is_featured = isFeatured || false;
      if (displayOrder !== undefined) {
        updateData.display_order = displayOrder;
      }
    }

    const { error: updateError } = await supabase
      .from('feedback_submissions')
      .update(updateData)
      .eq('id', feedbackId);

    if (updateError) {
      console.error('Update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('feedback_admin_log')
      .insert({
        feedback_id: feedbackId,
        admin_username: 'admin',
        action: status,
        previous_status: currentFeedback?.status,
        new_status: status,
        notes: adminNotes
      });

    return NextResponse.json({
      success: true,
      message: `Feedback ${status} successfully`
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete feedback
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = checkAdminAuth();
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('id');

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('feedback_submissions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', feedbackId);

    if (error) {
      console.error('Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      );
    }

    // Log admin action
    await supabase
      .from('feedback_admin_log')
      .insert({
        feedback_id: parseInt(feedbackId),
        admin_username: 'admin',
        action: 'deleted',
        notes: 'Soft deleted by admin'
      });

    return NextResponse.json({
      success: true,
      message: 'Feedback deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
