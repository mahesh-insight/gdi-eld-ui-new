"use client";

import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { isJwtExpired } from '@/lib/auth-utils';
import { clearAuth } from '@/store/authSlice';

export default function CookieSync() {
    const dispatch = useDispatch();
    const authState = useSelector(state => state.auth);
    
    useEffect(() => {
        // Check if account switch is in progress (multiple checks for redundancy)
        const skipSync = localStorage.getItem('skipCookieSync') === 'true';
        const switchTimestamp = sessionStorage.getItem('accountSwitchInProgress');
        const recentSwitch = switchTimestamp && (Date.now() - parseInt(switchTimestamp)) < 5000;
        
        if (skipSync || recentSwitch) {
            console.log('⏭️ CookieSync: Skipping - account just switched, cookies already set', {
                skipSync,
                recentSwitch,
                timeSinceSwitch: switchTimestamp ? Date.now() - parseInt(switchTimestamp) : null
            });
            localStorage.removeItem('skipCookieSync');
            if (!recentSwitch) {
                sessionStorage.removeItem('accountSwitchInProgress');
            }
            return;
        }
        
        console.log('🔄 CookieSync: AUTONOMOUS cookie sync - preserving existing auth');
        
        // Only sync TO cookies if we have valid auth, never clear auth
        const hasValidAuth = authState?.isAuthenticated && authState?.accessToken && authState?.loginResponse;
        
        if (!hasValidAuth) {
            console.log('⚠️ CookieSync: No valid auth state to sync - doing nothing');
            return;
        }
        
        let accessToken = null;
        let soldToId = null;
        let loginResponse = null;
        
        try {
            const persistData = localStorage.getItem('persist:ccr-auth');
            if (persistData) {
                const parsed = JSON.parse(persistData);
                console.log('🔍 Available persist keys:', Object.keys(parsed));
                
                if (parsed.loginResponse) {
                    let loginResponseStr = parsed.loginResponse;
                    if (typeof loginResponseStr === 'string' && loginResponseStr.startsWith('"')) {
                        loginResponseStr = JSON.parse(loginResponseStr);
                    }
                    loginResponse = typeof loginResponseStr === 'string' ? 
                        JSON.parse(loginResponseStr) : loginResponseStr;
                    
                    console.log('✅ LoginResponse extracted from persist storage');
                    
                    if (loginResponse?.tokens?.bearerToken) {
                        accessToken = loginResponse.tokens.bearerToken;
                        console.log('✅ BearerToken found in loginResponse');
                    }
                    
                    soldToId = loginResponse?.userProfile?.defaultContext?.[0]?.soldToId;
                    if (!soldToId) {
                        soldToId = loginResponse?.soldToId;
                    }
                    console.log('🔍 SoldToId from loginResponse:', soldToId);
                }
                
                if (!accessToken && parsed.accessToken) {
                    let tokenValue = parsed.accessToken;
                    if (typeof tokenValue === 'string' && tokenValue.startsWith('"')) {
                        tokenValue = JSON.parse(tokenValue);
                    }
                    if (typeof tokenValue === 'string' && tokenValue.length > 100) {
                        accessToken = tokenValue;
                        console.log('✅ AccessToken found in persist storage');
                    }
                }
                
                if (!soldToId && parsed.soldTo) {
                    let soldToValue = parsed.soldTo;
                    if (typeof soldToValue === 'string' && soldToValue.startsWith('"')) {
                        soldToValue = JSON.parse(soldToValue);
                    }
                    if (typeof soldToValue === 'string') {
                        soldToId = soldToValue;
                        console.log('✅ SoldToId found in persist storage');
                    }
                }
            }
        } catch (e) {
            console.error('❌ Error extracting from localStorage persist:', e);
        }
        
        const isValidToken = accessToken && typeof accessToken === 'string' && accessToken.length > 100;
        const isValidSoldToId = soldToId && typeof soldToId === 'string' && soldToId.length > 0;
        
        console.log('🔍 Validation results:', {
            hasAccessToken: !!accessToken,
            isValidToken,
            tokenLength: accessToken?.length || 0,
            hasSoldToId: !!soldToId,
            isValidSoldToId,
            soldToIdType: typeof soldToId,
            soldToIdValue: soldToId
        });
        
        if (isValidToken && isValidSoldToId && loginResponse) {
            // Guard: don't sync an expired JWT — clear auth instead
            if (isJwtExpired(accessToken)) {
                console.warn('⚠️ CookieSync: JWT is expired — clearing auth state instead of syncing cookies');
                // Clear cookies
                ['access_token', 'user_context', 'soldToId'].forEach(name => {
                    document.cookie = `${name}=; path=/; max-age=0; SameSite=Strict`;
                    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
                });
                // Clear persisted Redux auth so it doesn't resurrect
                localStorage.removeItem('persist:ccr-auth');
                localStorage.removeItem('persist:ccr-dashboard');
                localStorage.removeItem('persist:ccr-azure-invoice');
                // Clear Redux in-memory state → triggers ProtectedRoute redirect to login
                dispatch(clearAuth());
                return;
            }

            console.log('✅ Valid authentication data found, setting cookies...');
            
            const maxAge = 7 * 24 * 60 * 60;
            
            // Clear existing cookies first
            document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'user_context=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'soldToId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Set new cookies
            document.cookie = `access_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Strict`;
            
            // CRITICAL: Set user_context cookie with the complete loginResponse as JSON string
            const userContextValue = encodeURIComponent(JSON.stringify(loginResponse));
            document.cookie = `user_context=${userContextValue}; path=/; max-age=${maxAge}; SameSite=Strict`;
            
            // ✅ CRITICAL: Set soldToId cookie for SSR pages to work properly
            document.cookie = `soldToId=${soldToId}; path=/; max-age=${maxAge}; SameSite=Strict`;
            
            console.log('✅ CookieSync: Auth cookies synced successfully', {
                access_token: !!accessToken,
                user_context: !!loginResponse,
                soldToId: !!soldToId
            });
        }
    }, [authState?.isAuthenticated]);
    
    return null;
}