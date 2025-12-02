// src/app/auth/callback/route.js (API Route Handler)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import request from "../../../lib/api/request";

/**
 * Simple exception handler for server-side errors
 * @param {Error} error - The error object
 * @returns {string} Error message
 */
function exceptionHandler(error) {
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
} 

export async function GET(req) {
    console.log('🔄 Ping callback received, redirecting to homepage with auth code');
    
    const url = new URL(req.url);
    const pingAuthCode = url.searchParams.get('code');
    const pingErrorCode = url.searchParams.get('error');
    const soldTo = url.searchParams.get('soldTo') || url.searchParams.get('soldto');
    const salesOrg = url.searchParams.get('salesorg');

    // Handle errors
    if (pingErrorCode) {
        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', pingErrorCode);
        return NextResponse.redirect(redirectUrl);
    }

    if (!pingAuthCode) {
        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', 'no_code');
        return NextResponse.redirect(redirectUrl);
    }

    // Simple redirect to homepage with auth code
    const homeUrl = new URL('/', url.origin);
    homeUrl.searchParams.set('code', pingAuthCode);
    if (soldTo) homeUrl.searchParams.set('soldto', soldTo);
    if (salesOrg) homeUrl.searchParams.set('salesorg', salesOrg);
    
    return NextResponse.redirect(homeUrl);

    /* 
    // Old server-side processing logic - now handled client-side
    try {
        console.log(`Attempting loginAuthCode with: ${JSON.stringify({
            code: pingAuthCode,
            soldTo: soldTo,
            salesOrg: salesOrg,
            timestamp: new Date().toISOString()
        })} [${requestId}]`);

        const response = await request.post("loginAuthCode", {
            data: pingAuthCode,
            params: { 
                soldto: soldTo, 
                salesorg: salesOrg 
            }
        });

        console.log("loginAuthCode response -> ", response);

        if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
            const bearerToken = response.tokens.bearerToken;
            console.log("Environment:", process.env.NODE_ENV);
            const userProfile = response.userProfile;
            const defaultContext = userProfile.defaultContext?.[0];
            const soldToId = defaultContext?.soldToId;
                    
            // Only set a minimal session cookie for backend validation (httpOnly = secure)
            cookieStore.set('session_id', `session_${Date.now()}`, {
                httpOnly: true,  // Cannot be accessed by frontend JavaScript
                secure: false,   // Set to false for localhost testing (use true in production)
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days
                path: '/',
            });
            
            // Return all auth data to frontend for Redux storage
            // This keeps sensitive data in memory only, not in cookies/localStorage
            return NextResponse.json({ 
                success: true, 
                message: 'Authentication successful',
                authData: {
                    accessToken: bearerToken,
                    user: {
                        soldToId: soldToId,
                        persona: response.persona,
                        firstName: response.firstName
                    },
                    loginResponse: response // Full loginAuthCode response for Redux store
                },
                debug: {
                    sessionSet: true,
                    environment: process.env.NODE_ENV || 'development'
                }
            });
        }

        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', 'NoSoldTo');
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error("Token exchange failed:", error);
        console.error("Error details:", {
            status: error?.response?.status,
            statusText: error?.response?.statusText,
            data: error?.response?.data,
            message: error?.message,
            code: error?.code
        });

        // Check if it's a 403 specifically
        if (error?.response?.status === 403) {
            console.error("403 Forbidden - Possible causes:");
            console.error("1. Auth code expired (codes typically expire in 5-10 minutes)");
            console.error("2. Auth code already used (codes are single-use)");
            console.error("3. Invalid auth code format");
            console.error("4. API authentication/authorization issue");
        }

        const errorMessage = exceptionHandler(error);
        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', 'Failed');
        redirectUrl.searchParams.set('message', encodeURIComponent(errorMessage));
        return NextResponse.redirect(redirectUrl);
    }
    */
}