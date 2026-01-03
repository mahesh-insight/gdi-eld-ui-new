// src/app/page.js
import { redirect } from 'next/navigation';
import HomePageClient from '../components/HomePageClient';

export default async function HomePage({ searchParams }) {
    const resolvedSearchParams = await searchParams;
    const pingAuthCode = resolvedSearchParams?.code || '';
    const pingErrorCode = resolvedSearchParams?.error || '';

    // If Ping has error, go to Unauthorised
    if (pingErrorCode === 'access_denied') {
        redirect('/Unauthorised?reason=access_denied');
    }

    // Note: UI properties must be fetched client-side because the endpoint
    // (https://ccrdev.insight.com) is internal and only accessible from VPN/corporate network
    // Vercel's servers cannot access internal domains
    
    // Return client component that will fetch UI properties and handle auth
    return (
        <HomePageClient 
            authCode={pingAuthCode}
            soldTo={resolvedSearchParams?.soldTo || resolvedSearchParams?.soldto || ''}
            salesOrg={resolvedSearchParams?.salesorg || ''}
        />
    );
}