import { NextResponse } from 'next/server';

export async function POST(req) {
    console.log("=== MOCK LOGIN AUTH CODE ENDPOINT ===");
    
    try {
        const body = await req.text();
        const url = new URL(req.url);
        const soldto = url.searchParams.get('soldto') || '';
        const salesorg = url.searchParams.get('salesorg') || '';
        
        // Mock successful response
        const mockResponse = {
            userProfile: {
                defaultContext: [{
                    soldToId: soldto || "MOCK12345",
                    salesorg: salesorg || "US01"
                }]
            },
            tokens: {
                bearerToken: "real-endpoint-bearer-" + Date.now()
            },
            persona: "Customer",
            firstName: "Real API User"
        };
        
        console.log("Returning mock response from real endpoint:", mockResponse);
        
        return NextResponse.json(mockResponse);
        
    } catch (error) {
        console.error("Mock endpoint error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}