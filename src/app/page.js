// src/app/page.js
import { redirect } from 'next/navigation';
import { getUiProperties } from '../lib/server-config';
import HomePageClient from '../components/HomePageClient';

export default async function HomePage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const pingAuthCode = resolvedSearchParams?.code || '';
    const pingErrorCode = resolvedSearchParams?.error || '';

    // If Ping has error, go to Unauthorised
    if (pingErrorCode === 'access_denied') {
        redirect('/Unauthorised?reason=access_denied');
    }

    // Note: We no longer check for access_token cookie here since we use Redux for auth state
    // The client-side will handle auth state and redirects via Redux Persist

    // Note: Auth code processing moved to client-side to check Redux authentication state

    // No auth code → either start auth flow or let client-side Redux handle authenticated users
    const uiProps = await getUiProperties();

    if (!uiProps || !uiProps.CCR_AUTHENTICATION_URL) {
        return (
            <div style={{ padding: '50px', textAlign: 'center', color: 'red' }}>
                Error: Authentication API call failed or CCR_AUTHENTICATION_URL is missing from API response.
            </div>
        );
    }

    const AUTH_URL = uiProps?.CCR_AUTHENTICATION_URL;
    const CLIENT_ID = 'process.env.NEXT_PUBLIC_CLIENT_ID';

    // Return client component that handles auth state and redirects
    return (
        <HomePageClient 
            AUTH_URL={AUTH_URL}
            CLIENT_ID={CLIENT_ID}
            authCode={pingAuthCode}
            soldTo={resolvedSearchParams?.soldTo || resolvedSearchParams?.soldto || ''}
            salesOrg={resolvedSearchParams?.salesorg || ''}
        />
    );
}