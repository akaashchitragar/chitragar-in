import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    // Clean up OTPs older than 1 hour (optional cleanup)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { error } = await supabase
      .from('admin_otp')
      .delete()
      .lt('created_at', oneHourAgo);

    if (error) {
      console.error('Cleanup error:', error);
      return NextResponse.json(
        { error: 'Cleanup failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Old OTPs cleaned up' 
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
