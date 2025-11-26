// src/app/auth/callback/route.js (API Route Handler)

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import request from "../../../library/api/request";
import exceptionHandler from "../../../library/api/exceptionHandler"; 

export async function GET(req) {
    const url = new URL(req.url);
    const pingAuthCode = url.searchParams.get('code');
    const pingErrorCode = url.searchParams.get('error');
    const soldTo = url.searchParams.get('soldTo') || url.searchParams.get('soldto');
    const salesOrg = url.searchParams.get('salesorg');

    const cookieStore = cookies();

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
        const response = await request.post("loginAuthCode", {
            data: pingAuthCode,
            params: { 
                soldto: soldTo, 
                salesorg: salesOrg 
            }
        });

        if (response?.userProfile?.defaultContext?.[0] && response?.tokens?.bearerToken) {
            const bearerToken = response.tokens.bearerToken;
            const userProfile = response.userProfile;
            const defaultContext = userProfile.defaultContext?.[0];
            const soldToId = defaultContext?.soldToId;
            
            cookieStore.set('access_token', bearerToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
            
            cookieStore.set('user_context', JSON.stringify({
                soldToId: soldToId,
                persona: response.persona,
                firstName: response.firstName
            }), {
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 7,
                path: '/',
            });
            
            const isDashboardFlag = JSON.parse(url.searchParams.get('isDashboardFlag') || 'false');
            let initialRedirectPath = url.searchParams.get('initial_url') || '';

            if (initialRedirectPath.startsWith('/Unauthorised')) {
                initialRedirectPath = '';
            }

            let destination = '/Dashboard';
            if (initialRedirectPath) {
                destination = initialRedirectPath;
            } else if (!isDashboardFlag) {
                destination = '/Invoices';
            }
            
            return NextResponse.redirect(new URL(destination, url.origin));
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