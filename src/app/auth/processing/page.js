// src/app/auth/processing/page.js
"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { initializeAuth } from '../../../store/authSlice';

export default function AuthProcessingPage() {
    console.log('🚀 AuthProcessingPage component rendering');
    
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const [message, setMessage] = useState('Processing authentication...');
    const hasProcessedRef = useRef(false);

    console.log('🔍 Component state - message:', message);
    console.log('🔍 Redux auth state:', { isAuthenticated, user });

    // Early return if already authenticated - don't even start processing
    if (isAuthenticated && user) {
        console.log('🚫 BLOCKING: Processing page accessed but user already authenticated');
        console.log('🔄 Immediate redirect to dashboard');
        router.replace('/dashboard');
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'center', 
                alignItems: 'center', 
                minHeight: '100vh',
                fontSize: '1.2em'
            }}>
                <p>Already authenticated!</p>
                <p>Redirecting to dashboard...</p>
            </div>
        );
    }

    useEffect(() => {
        console.log('🔍 Processing page mounted with params:', { 
            searchParams: Object.fromEntries(searchParams.entries()),
            pathname: window.location.pathname,
            isAuthenticated,
            user: !!user 
        });

        const processAuth = async () => {
            // Check if user is already authenticated from Redux persistence
            if (isAuthenticated && user) {
                console.log('✅ User already authenticated from Redux store, redirecting to dashboard');
                console.log('⚠️ Processing page should not have been accessed for authenticated user');
                console.log('This suggests a navigation issue - check what triggered this route');
                setMessage('Already authenticated! Redirecting...');
                // Immediate redirect without delay
                router.replace('/dashboard');
                return;
            }

            if (hasProcessedRef.current) {
                console.log('⚠️ Auth already processed by this component, skipping duplicate call');
                return;
            }
            
            // Also check sessionStorage to prevent processing across page reloads/redirects
            const code = searchParams.get('code');
            const hasProcessedKey = `processed_${code}`;
            if (sessionStorage.getItem(hasProcessedKey)) {
                console.log('⚠️ Auth code already processed in session, skipping');
                router.replace('/Unauthorised?reason=duplicate_processing');
                return;
            }
            
            hasProcessedRef.current = true;
            sessionStorage.setItem(hasProcessedKey, 'true');
            try {
                console.log('=== AUTH PROCESSING STARTED ===');
                
                const error = searchParams.get('error');
                if (error === 'access_denied') {
                    router.replace('/Unauthorised?reason=access_denied');
                    return;
                }

                console.log('🔍 Processing page check:', { 
                    hasCode: !!code, 
                    fullURL: window.location.href,
                    searchParamsSize: searchParams.toString().length
                });
                
                if (!code) {
                    console.error('❌ No auth code - processing page accessed incorrectly');
                    console.error('Current URL:', window.location.href);
                    console.error('Referrer:', document.referrer);
                    router.replace('/Unauthorised?reason=no_code');
                    return;
                }

                setMessage('Processing authentication...');
                console.log('🚀 Calling auth API at /api/auth/login');
                
                // Get additional params from URL
                const soldTo = searchParams.get('soldto') || searchParams.get('soldTo');
                const salesOrg = searchParams.get('salesorg');
                
                console.log('📤 API request payload:', { code, soldTo, salesOrg });
                
                // Call the new auth API endpoint
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        code: code,
                        soldTo: soldTo,
                        salesOrg: salesOrg
                    })
                });
                console.log('Response status:', response.status);
                
                const data = await response.json();
                console.log('=== SERVER RESPONSE ===', data);

                if (data.success && data.authData) {
                    console.log('✅ Auth successful, dispatching to Redux');
                    
                    const authPayload = {
                        isAuthenticated: true,
                        user: data.authData.user,
                        loginResponse: data.authData.loginResponse,
                        accessToken: data.authData.accessToken
                    };
                    
                    console.log('Redux payload:', authPayload);
                    dispatch(initializeAuth(authPayload));
                    console.log('✅ Redux dispatch completed');
                    
                    setMessage('Authentication complete! Redirecting...');
                    
                    setTimeout(() => {
                        console.log('🚀 Redirecting to dashboard');
                        router.replace('/dashboard');
                    }, 1000);
                } else {
                    console.error('❌ Auth failed - API returned success=false:', data);
                    console.error('Error details:', data.error);
                    router.replace(`/Unauthorised?reason=auth_failed&error=${encodeURIComponent(data.error || 'Unknown error')}`);
                }
                } catch (error) {
                console.error('❌ Auth processing error:', error);
                console.error('Error details:', error.message);
                setMessage('Authentication failed. Redirecting...');
                setTimeout(() => {
                    router.replace(`/Unauthorised?reason=processing_error&error=${encodeURIComponent(error.message)}`);
                }, 1000);
                }
        };

        processAuth();
    }, [searchParams, router, dispatch]);    return (
        <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh',
            fontFamily: 'Arial, sans-serif'
        }}>
            <div style={{ textAlign: 'center' }}>
                <h2>{message}</h2>
                <p>Please wait while we complete your authentication...</p>
            </div>
        </div>
    );
}