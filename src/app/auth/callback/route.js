// src/app/auth/callback/route.js (API Route Handler)

import { NextResponse } from 'next/server';

export async function GET(req) {
    const url = new URL(req.url);
    const pingAuthCode = url.searchParams.get('code');
    const pingErrorCode = url.searchParams.get('error');
    const soldTo = url.searchParams.get('soldTo') || url.searchParams.get('soldto');
    const salesOrg = url.searchParams.get('salesorg');

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

    const homeUrl = new URL('/', url.origin);
    homeUrl.searchParams.set('code', pingAuthCode);
    if (soldTo) homeUrl.searchParams.set('soldto', soldTo);
    if (salesOrg) homeUrl.searchParams.set('salesorg', salesOrg);
    
    return NextResponse.redirect(homeUrl);
}