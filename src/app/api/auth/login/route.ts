import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Hardcoded admin credentials
    const adminEmail = 'akash@chitragar.in';
    const adminPassword = 'mini@1916';

    // Simple credential check
    if (email === adminEmail && password === adminPassword) {
      return NextResponse.json({ 
        success: true, 
        message: 'Login successful' 
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
