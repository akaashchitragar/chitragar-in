import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
}

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 5; // Max 5 submissions per 15 minutes

  const current = rateLimitStore.get(ipHash);
  
  if (!current || now > current.resetTime) {
    rateLimitStore.set(ipHash, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  return true;
}

// POST - Submit new feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, feedbackType, moodEmoji, rating } = body;

    // Validation
    if (!message || message.length < 10 || message.length > 1000) {
      return NextResponse.json(
        { error: 'Message must be between 10 and 1000 characters' },
        { status: 400 }
      );
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    // NextRequest does not have .ip, so fallback to 127.0.0.1 if no forwarded header
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const ipHash = hashIP(ip);

    // Rate limiting
    if (!checkRateLimit(ipHash)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    // Generate session ID
    const sessionId = crypto.randomUUID();

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback_submissions')
      .insert({
        message: message.trim(),
        feedback_type: feedbackType || 'general',
        mood_emoji: moodEmoji,
        rating: rating ? parseInt(rating) : null,
        user_agent: userAgent,
        ip_hash: ipHash,
        session_id: sessionId,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to submit feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Feedback submitted successfully! It will be reviewed before being displayed.',
      id: data.id
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Fetch approved feedback for public display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type');
    const featured = searchParams.get('featured') === 'true';

    let query = supabase
      .from('feedback_submissions')
      .select('*')
      .eq('status', 'approved')
      .eq('display_publicly', true)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (type) {
      query = query.eq('feedback_type', type);
    }

    if (featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      feedback: data || [],
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
