// Test API endpoint
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Test endpoint working',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      CCR_API_BASE_URL: process.env.CCR_API_BASE_URL || 'NOT SET'
    }
  });
}