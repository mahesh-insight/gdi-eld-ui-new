"use client";

import { useEffect } from 'react';
import { useSelector } from 'react-redux';

export default function CookieSync() {
    const authState = useSelector(state => state.auth);
    
    useEffect(() => {
        console.log('🔄 CookieSync: Starting authentication check...');
        
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
            console.log('✅ Valid authentication data found, setting cookies...');
            
            const maxAge = 7 * 24 * 60 * 60;
            
            document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'user_context=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'soldToId=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            document.cookie = `access_token=${accessToken}; path=/; max-age=${maxAge}; SameSite=Strict`;
            document.cookie = `user_context=${encodeURIComponent(JSON.stringify(loginResponse))}; path=/; max-age=${maxAge}; SameSite=Strict`;
            document.cookie = `soldToId=${soldToId}; path=/; max-age=${maxAge}; SameSite=Strict`;
            
            console.log('✅ CookieSync: Authentication cookies set successfully:', {
                accessTokenLength: accessToken.length,
                accessTokenPrefix: accessToken.substring(0, 20) + '...',
                soldToId: soldToId
            });
        } else {
            console.log('⚠️ CookieSync: Cannot set cookies - invalid authentication data:', {
                hasValidToken: isValidToken,
                hasValidSoldToId: isValidSoldToId,
                hasLoginResponse: !!loginResponse
            });
        }
    }, [authState?.isAuthenticated]);
    
    return null;
}