import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
}

// POST - Add reaction to feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedbackId, reactionType } = body;

    if (!feedbackId || !reactionType) {
      return NextResponse.json(
        { error: 'Feedback ID and reaction type are required' },
        { status: 400 }
      );
    }

    const validReactions = ['like', 'love', 'insightful', 'helpful', 'funny'];
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      );
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const ipHash = hashIP(ip);

    // Check if feedback exists and is approved
    const { data: feedback, error: feedbackError } = await supabase
      .from('feedback_submissions')
      .select('id, status, display_publicly')
      .eq('id', feedbackId)
      .eq('status', 'approved')
      .eq('display_publicly', true)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found or not available for reactions' },
        { status: 404 }
      );
    }

    // Check if user already reacted with this type
    const { data: existingReaction } = await supabase
      .from('feedback_reactions')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('ip_hash', ipHash)
      .eq('reaction_type', reactionType)
      .single();

    if (existingReaction) {
      // Remove existing reaction (toggle off)
      const { error: deleteError } = await supabase
        .from('feedback_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        return NextResponse.json(
          { error: 'Failed to remove reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'removed',
        message: 'Reaction removed'
      });
    } else {
      // Add new reaction
      const { error: insertError } = await supabase
        .from('feedback_reactions')
        .insert({
          feedback_id: feedbackId,
          reaction_type: reactionType,
          ip_hash: ipHash
        });

      if (insertError) {
        return NextResponse.json(
          { error: 'Failed to add reaction' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: 'added',
        message: 'Reaction added'
      });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get reaction counts for feedback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const feedbackId = searchParams.get('feedbackId');

    if (!feedbackId) {
      return NextResponse.json(
        { error: 'Feedback ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('feedback_reactions')
      .select('reaction_type')
      .eq('feedback_id', feedbackId);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch reactions' },
        { status: 500 }
      );
    }

    // Count reactions by type
    const counts = data?.reduce((acc, reaction) => {
      acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({ reactions: counts });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
