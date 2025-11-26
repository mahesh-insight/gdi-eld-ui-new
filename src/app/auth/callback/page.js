// src/app/auth/callback/page.js
"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PingCallbackPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        const error = searchParams.get('error');
        if (error === 'access_denied') {
            router.replace('/Unauthorised?reason=access_denied');
            return;
        }

        router.replace('/dashboard');
    }, [router, searchParams]);

    return (
        <div
            style={{
                padding: '100px',
                textAlign: 'center',
                fontSize: '1.2em',
            }}
        >
            Authenticating... Please wait for redirect.
        </div>
    );
}
