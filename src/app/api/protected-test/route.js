// Protected API endpoint for testing Bearer token auth
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(req) {
  const authHeader = req.headers.get('authorization');
  const cookieStore = await cookies();
  const accessToken = cookieStore?.get('access_token')?.value;
  
  // Check if Bearer token is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { 
        error: 'Missing or invalid Authorization header',
        expected: 'Bearer <token>',
        received: authHeader || 'none'
      }, 
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // For testing, accept any non-empty token
  if (!token) {
    return NextResponse.json(
      { error: 'Empty token' }, 
      { status: 401 }
    );
  }

  // Success response
  return NextResponse.json({
    message: 'Successfully authenticated API call',
    tokenReceived: token.substring(0, 20) + '...',
    timestamp: new Date().toISOString(),
    headers: {
      authorization: authHeader,
      userAgent: req.headers.get('user-agent')
    }
  });
}