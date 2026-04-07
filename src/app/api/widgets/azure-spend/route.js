import { NextResponse } from 'next/server';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Configure this to specific domains in production
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Handle GET request (for iframe embeds with query params)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const soldToId = searchParams.get('soldToId');
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || 
                  searchParams.get('token'); // Fallback to query param if needed

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Access token is required' },
        { status: 401, headers: corsHeaders }
      );
    }

    if (!soldToId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'soldToId is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Make the API call with the token
    const response = await fetch(
      'https://api-ccrdev.insight.com/ccr-dashboard-service/microsoft/azurespend',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify([soldToId]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'API request failed', details: errorText },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

// Handle POST request (for programmatic API calls)
export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Access token is required in Authorization header' },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const soldToId = body.soldToId || (Array.isArray(body) ? body[0] : null);

    if (!soldToId) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'soldToId is required in request body' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Make the API call with the token
    const response = await fetch(
      'https://api-ccrdev.insight.com/ccr-dashboard-service/microsoft/azurespend',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify([soldToId]),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'API request failed', details: errorText },
        { status: response.status, headers: corsHeaders }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { headers: corsHeaders });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
