// src/app/page.js
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUiProperties } from '../lib/server-config';

export default async function HomePage({ searchParams }) {
    const cookieStore = await cookies();
    const accessToken = cookieStore?.get('access_token')?.value;

    const resolvedSearchParams = await searchParams;
    const pingAuthCode = resolvedSearchParams?.code || '';
    const pingErrorCode = resolvedSearchParams?.error || '';

    // If Ping has error, go to Unauthorised
    if (pingErrorCode === 'access_denied') {
        redirect('/Unauthorised?reason=access_denied');
    }

    // If already have an access token, go straight to Dashboard
    if (accessToken) {
        redirect('/dashboard');
    }

    // If we got a code from Ping (successful auth), treat that as a successful login and send user to Dashboard.
    if (pingAuthCode && !pingErrorCode) {
        redirect('/dashboard');
    }

    // No token and no auth code → start auth flow
    const uiProps = await getUiProperties();

    if (!uiProps || !uiProps.CCR_AUTHENTICATION_URL) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
                Error: Authentication API call failed or CCR_AUTHENTICATION_URL is missing from API response.
            </div>
        );
    }

    const AUTH_URL = uiProps?.CCR_AUTHENTICATION_URL;
    // const CLIENT_ID = process.env.NEXT_PUBLIC_CLIENT_ID;
    const CLIENT_ID = 'process.env.NEXT_PUBLIC_CLIENT_ID';
    const REDIRECT_URI_BASE = process.env.API_BASE_URL;
    const REDIRECT_URI = encodeURIComponent(`${REDIRECT_URI_BASE}/auth/callback`);

    if (!REDIRECT_URI_BASE) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
                Error: Missing required environment variables (NEXT_PUBLIC_CLIENT_ID or NEXT_PUBLIC_REDIRECT_URI_BASE).
            </div>
        );
    }
    const pingUrl = `${AUTH_URL}`;
    redirect(pingUrl);
}