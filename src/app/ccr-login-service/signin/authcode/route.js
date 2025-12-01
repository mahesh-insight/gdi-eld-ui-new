import { NextResponse } from 'next/server';

export async function POST(req) {
    console.log("=== SIGNIN AUTHCODE ENDPOINT (PORT 80) ===");
    
    try {
        const body = await req.text();
        const url = new URL(req.url);
        const soldto = url.searchParams.get('soldto') || '';
        const salesorg = url.searchParams.get('salesorg') || '';
        
        console.log("Received POST data (auth code):", body);
        console.log("URL params:", { soldto, salesorg });
        
        // Mock successful response matching expected structure
        const mockResponse = {
            userProfile: {
                defaultContext: [{
                    soldToId: soldto || "MOCK12345",
                    salesorg: salesorg || "US01"
                }]
            },
            tokens: {
                bearerToken: "port80-bearer-token-" + Date.now()
            },
            persona: "Customer",
            firstName: "Port 80 User"
        };
        
        console.log("Returning response from signin/authcode endpoint:", mockResponse);
        
        return NextResponse.json(mockResponse);
        
    } catch (error) {
        console.error("Signin authcode endpoint error:", error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}