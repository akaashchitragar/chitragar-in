import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // Only allow akash@chitragar.in
    if (email !== 'akash@chitragar.in') {
      return NextResponse.json(
        { error: 'Unauthorized email address' },
        { status: 401 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Supabase
    const { error: dbError } = await supabase
      .from('admin_otp')
      .insert({ email, otp });

    if (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Failed to generate OTP' },
        { status: 500 }
      );
    }

    // Send OTP via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Admin <admin@chitragar.in>',
      to: [email],
      subject: 'Admin Login OTP',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Admin Login OTP</h2>
          <p>Your OTP for admin login is:</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p>Use this OTP to complete your login.</p>
          <p style="color: #666; font-size: 14px;">This is an automated message for admin authentication.</p>
        </div>
      `,
    });

    if (emailError) {
      console.error('Email error:', emailError);
      return NextResponse.json(
        { error: 'Failed to send OTP email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'OTP sent to your email' 
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
