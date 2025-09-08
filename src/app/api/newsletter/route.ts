import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { getEmailTemplate, EmailTemplates } from '@/lib/email-templates';
import crypto from 'crypto';

// Initialize clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const resend = new Resend(process.env.RESEND_API_KEY!);

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function hashIP(ip: string): string {
  return crypto.createHash('sha256').update(ip + process.env.IP_SALT || 'default-salt').digest('hex');
}

function checkRateLimit(ipHash: string): boolean {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxRequests = 3; // Max 3 subscription attempts per 15 minutes

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

// POST - Subscribe to newsletter
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Get client info
    const userAgent = request.headers.get('user-agent') || '';
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : '127.0.0.1';
    const ipHash = hashIP(ip);
    const referrer = request.headers.get('referer') || '';

    // Rate limiting
    if (!checkRateLimit(ipHash)) {
      return NextResponse.json(
        { error: 'Too many subscription attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const { data: existingSubscriber } = await supabase
      .from('newsletter_subscribers')
      .select('id, is_active, unsubscribed_at')
      .eq('email', normalizedEmail)
      .single();

    if (existingSubscriber) {
      if (existingSubscriber.is_active && !existingSubscriber.unsubscribed_at) {
        return NextResponse.json(
          { error: 'This email is already subscribed to our newsletter' },
          { status: 409 }
        );
      } else {
        // Generate new unsubscribe token for reactivation
        const newUnsubscribeToken = crypto.randomBytes(32).toString('hex');
        
        // Reactivate subscription
        const { error: updateError } = await supabase
          .from('newsletter_subscribers')
          .update({
            is_active: true,
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString(),
            ip_hash: ipHash,
            user_agent: userAgent,
            referrer: referrer,
            unsubscribe_token: newUnsubscribeToken
          })
          .eq('id', existingSubscriber.id);

        if (updateError) {
          console.error('Database error:', updateError);
          return NextResponse.json(
            { error: 'Failed to reactivate subscription' },
            { status: 500 }
          );
        }

        // Send welcome email for reactivated subscription
        await sendWelcomeEmail(normalizedEmail, existingSubscriber.id);

        return NextResponse.json({
          success: true,
          message: 'Welcome back! Your subscription has been reactivated.',
          reactivated: true
        });
      }
    }

    // Generate unsubscribe token manually
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');

    // Insert new subscriber
    const { data: newSubscriber, error: insertError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: normalizedEmail,
        ip_hash: ipHash,
        user_agent: userAgent,
        referrer: referrer,
        unsubscribe_token: unsubscribeToken
      })
      .select('id, unsubscribe_token')
      .single();

    if (insertError) {
      console.error('Database error:', insertError);
      return NextResponse.json(
        { error: 'Failed to subscribe to newsletter' },
        { status: 500 }
      );
    }

    // Send welcome email
    await sendWelcomeEmail(normalizedEmail, newSubscriber.id);

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed! Check your email for a welcome message.',
      subscriberId: newSubscriber.id
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - Get newsletter statistics (public)
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('newsletter_stats')
      .select('*')
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch newsletter statistics' },
        { status: 500 }
      );
    }

    // Return only public stats
    return NextResponse.json({
      totalSubscribers: data.active_subscribers,
      newThisMonth: data.new_this_month
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Function to send welcome email
async function sendWelcomeEmail(email: string, subscriberId: number) {
  try {
    // Generate unsubscribe token (you can implement this based on your needs)
    const unsubscribeToken = crypto.randomBytes(32).toString('hex');
    
    // Get the email template
    const emailHtml = getEmailTemplate(EmailTemplates.NEWSLETTER_WELCOME, {
      unsubscribeToken
    });

    const { data, error } = await resend.emails.send({
      from: 'Akash Chitragar <hello@chitragar.in>',
      to: [email],
      subject: '🎉 Welcome to my photography newsletter!',
      html: emailHtml,
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    // Log successful email send
    await supabase
      .from('newsletter_email_log')
      .insert({
        subscriber_id: subscriberId,
        email_type: 'welcome',
        subject: 'Welcome to my photography newsletter! 📸',
        status: 'sent',
        external_id: data?.id
      });

    // Update subscriber record
    await supabase
      .from('newsletter_subscribers')
      .update({
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString()
      })
      .eq('id', subscriberId);

    console.log('Welcome email sent successfully:', data?.id);

  } catch (error) {
    console.error('Failed to send welcome email:', error);
    
    // Log failed email send
    await supabase
      .from('newsletter_email_log')
      .insert({
        subscriber_id: subscriberId,
        email_type: 'welcome',
        subject: 'Welcome to my photography newsletter! 📸',
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
  }
}
