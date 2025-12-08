// src/app/api/cache-status/route.js
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    message: 'Cache test endpoint',
    timestamp: new Date().toISOString(),
    instructions: {
      clientTest: 'Open browser console and run: window.debugCache()',
      forceReprocess: 'Run: window.forceReprocessCache()',
      clearCache: 'Run: window.clearAzureInvoiceCache()'
    }
  });
}