import { NextResponse } from 'next/server';

export async function POST() {
  // For this simple implementation, logout is handled client-side
  // This endpoint exists for consistency but doesn't need to do anything
  return NextResponse.json({ 
    success: true, 
    message: 'Logout successful' 
  });
}
