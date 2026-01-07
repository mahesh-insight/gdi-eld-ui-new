// src/app/api/azure-invoice/month-detail/[month]/route.js
import { NextResponse } from "next/server";
import services from '@/lib/api/services';

export async function POST(request, { params }) {
  try {
    const { month } = params;
    const body = await request.json();
    const { soldToId } = body;

    // Get Authorization header
    const authHeader = request.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    
    if (!bearerToken) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    if (!soldToId || (Array.isArray(soldToId) && soldToId.length === 0)) {
      return NextResponse.json(
        { error: 'soldToId is required' },
        { status: 400 }
      );
    }

    // Get the full URL with query parameters
    const url = new URL(request.url);
    const searchParams = url.searchParams;
    
    // Extract all query parameters including filters
    const queryString = searchParams.toString();
    
    console.log('🔍 Month Detail API called:', {
      month,
      soldToId,
      queryString,
      hasToken: !!bearerToken
    });

    // Get service configuration
    const serviceConfig = services.getService('invoiceMonthDetail');
    const baseURL = serviceConfig.baseURL;
    
    // Format month as YYYY-MM if it's in YYYYMM format
    const moment = (await import('moment')).default;
    const formattedMonth = moment(month, 'YYYYMM').format('YYYY-MM');
    
    // Build the API URL with all query parameters (including filters)
    const apiUrl = `${baseURL}/azure-invoice/${formattedMonth}?${queryString}`;
    
    console.log('🌐 Proxying to:', apiUrl);

    // Call the external API
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken}`
      },
      body: JSON.stringify(Array.isArray(soldToId) ? soldToId : [soldToId])
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API call failed:', response.status, errorText);
      return NextResponse.json(
        { error: `API call failed: ${response.status}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('✅ Month detail data received:', {
      hasContent: !!data?.content,
      contentLength: data?.content?.length || 0
    });

    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Month Detail API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
