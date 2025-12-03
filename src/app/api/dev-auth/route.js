// Development-only API route to set authentication cookies
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST() {
  console.log('🔧 [DEV-AUTH] API endpoint called!');
  
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Development only' }, { status: 403 });
  }

  const cookieStore = cookies();
  
  const testSoldToId = 'Insight|SAP|0011082409|2400';
  // Use the actual bearer token from our authentication system
  const testBearerToken = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiI2NjlkOGM0Yy1lMWNmLTRiMTUtYmFlZC00OGYyMWM3ZmVjZWIiLCJyb2xlcyI6W3siYXV0aG9yaXR5IjoiUk9MRV9HbG9iYWxSZWFkIn0seyJhdXRob3JpdHkiOiJST0xFX0RhdGFTdGF0dXMifSx7ImF1dGhvcml0eSI6IlJPTEVfR2xvYmFsQWRtaW5pc3RyYXRvciJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9Vc2VyQWRtaW5pc3RyYXRvciJ9LHsiYXV0aG9yaXR5IjoiUk9MRV9Vc2VyQ2lhbUxpbmsifV0sInVzZXJuYW1lIjoibWFoZXNoLmtvdGFwYWxpQGluc2lnaHQuY29tIiwibGFzdG5hbWUiOiJrb3RhcGFsaSIsImZpcnN0bmFtZSI6Im1haGVzaCIsImVtYWlsIjoibWFoZXNoLmtvdGFwYWxpQGluc2lnaHQuY29tIiwicmVnaW9uQ29kZSI6Ik5BIiwiY291bnRyeUNvZGUiOiJJTiIsImlzSW5zaWdodEVtcGxveWVlIjp0cnVlLCJpc0FwaUtleUF1dGhlbnRpY2F0ZWQiOmZhbHNlLCJ1c2VyaWQiOiI2NjlkOGM0Yy1lMWNmLTRiMTUtYmFlZC00OGYyMWM3ZmVjZWIiLCJpYXQiOjE3NjQ3NDI5NDIsImV4cCI6MTc2NDgyOTM0Mn0.QWxkF8xvqkfaeqmdu9H6cGZ9cOyHgpfYib57BsOAA2XtrDHzwd1H75BrH-NhPqPUqr8Fk72RKTS2s85FGXGwOw';
  
  const userContextData = {
    soldToId: testSoldToId,
    persona: 'Customer',
    firstName: 'Test User',
    isAuthenticated: true
  };

  console.log('🔧 [DEV-AUTH] Setting cookies:', { testBearerToken, userContextData });

  // Set cookies server-side with more persistent settings
  cookieStore.set('access_token', testBearerToken, {
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'lax', // More permissive for local development
    httpOnly: false, // Allow client-side access
    secure: false // Allow HTTP in development
  });
  
  cookieStore.set('user_context', JSON.stringify(userContextData), {
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'lax', // More permissive for local development
    httpOnly: false, // Allow client-side access
    secure: false // Allow HTTP in development
  });
  
  // Also set a simpler persist cookie for Redux
  cookieStore.set('persist:ccr-auth', JSON.stringify({
    isAuthenticated: true,
    accessToken: testBearerToken,
    user: userContextData
  }), {
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
    sameSite: 'lax',
    httpOnly: false,
    secure: false
  });

  console.log('✅ [DEV-AUTH] Authentication cookies set server-side');

  // Verify cookies were set
  const verifyToken = cookieStore.get('access_token');
  const verifyUser = cookieStore.get('user_context');
  console.log('🔍 [DEV-AUTH] Verification - Token exists:', !!verifyToken);
  console.log('🔍 [DEV-AUTH] Verification - User exists:', !!verifyUser);

  return NextResponse.json({ 
    success: true, 
    message: 'Development authentication cookies set',
    soldToId: testSoldToId,
    bearerToken: testBearerToken,
    userContext: userContextData
  });
}