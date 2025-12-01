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
    const url = new URL(req.url);
    const pingAuthCode = url.searchParams.get('code');
    const pingErrorCode = url.searchParams.get('error');
    const soldTo = url.searchParams.get('soldTo') || url.searchParams.get('soldto');
    const salesOrg = url.searchParams.get('salesorg');

    const cookieStore = await cookies();

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

    try {
        let response;
        let isUsingMockData = false;
        
        try {           
            response = await request.post("loginAuthCode", {
                data: pingAuthCode,
                params: { 
                    soldto: soldTo, 
                    salesorg: salesOrg 
                }
            });
        } catch (apiError) {
            console.error("Real API call failed -> " + apiError);
            isUsingMockData = true;
        }

        console.log("loginAuthCode response -> ", response);

        if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
            const bearerToken = response.tokens.bearerToken;
            console.log("Environment:", process.env.NODE_ENV);
            const userProfile = response.userProfile;
            const defaultContext = userProfile.defaultContext?.[0];
            const soldToId = defaultContext?.soldToId;
                    
            // Set access token (backend handles expiry) - Make sure it's visible in DevTools
            cookieStore.set('access_token', bearerToken, {
                httpOnly: false, // Must be false to see in DevTools
                secure: false,   // Set to false for localhost testing
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days (fallback, backend controls actual expiry)
                path: '/',
            });
                    
            cookieStore.set('user_context', JSON.stringify({
                soldToId: soldToId,
                persona: response.persona,
                firstName: response.firstName
            }), {
                httpOnly: false, // Make visible in DevTools
                secure: false,   // Set to false for localhost testing
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7, // 7 days (fallback, backend controls actual expiry)
                path: '/',
            });
            
            const isDashboardFlag = JSON.parse(url.searchParams.get('isDashboardFlag') || 'false');
            let initialRedirectPath = url.searchParams.get('initial_url') || '';

            if (initialRedirectPath.startsWith('/Unauthorised')) {
                initialRedirectPath = '';
            }
            
            // Return success response instead of redirecting
            // Let frontend handle navigation after token is set
            return NextResponse.json({ 
                success: true, 
                message: 'Authentication successful',
                isUsingMockData: isUsingMockData,
                user: {
                    soldToId: soldToId,
                    persona: response.persona,
                    firstName: response.firstName
                },
                debug: {
                    cookiesSet: true,
                    tokenLength: bearerToken.length,
                    environment: process.env.NODE_ENV || 'development'
                }
            });
        }

        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', 'NoSoldTo');
        return NextResponse.redirect(redirectUrl);

    } catch (error) {
        console.error("Token exchange failed:", error);
        const errorMessage = exceptionHandler(error);
        const redirectUrl = new URL('/Unauthorised', url.origin);
        redirectUrl.searchParams.set('reason', 'Failed');
        redirectUrl.searchParams.set('message', encodeURIComponent(errorMessage));
        return NextResponse.redirect(redirectUrl);
    }
}