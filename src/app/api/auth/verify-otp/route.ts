import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, otp } = await request.json();

    // Only allow akash@chitragar.in
    if (email !== 'akash@chitragar.in') {
      return NextResponse.json(
        { error: 'Unauthorized email address' },
        { status: 401 }
      );
    }

    // Find the most recent OTP for this email
    const { data: otpRecord, error: dbError } = await supabase
      .from('admin_otp')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (dbError || !otpRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 401 }
      );
    }

    // Verify OTP matches
    if (otpRecord.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 401 }
      );
    }

    // Clean up used OTP
    await supabase
      .from('admin_otp')
      .delete()
      .eq('id', otpRecord.id);

    return NextResponse.json({ 
      success: true, 
      message: 'OTP verified successfully' 
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
