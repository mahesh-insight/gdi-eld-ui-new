// src/components/AuthContextInitializer.js
"use client";

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Cookies from 'js-cookie'; // Client-side library to read non-HTTP-only cookies
// Import Redux actions from both slices
import { 
  setIsLoggedInState,
  setUserState,
  setSelectedAccountState,
  setLoginResponseState,
  clearUserState
} from "@/lib/store/slices/userSlice";
import { 
  setAuthenticated, 
  setUser, 
  setLoginResponse,
  setAccessToken,
  setContextData,
  setSoldTo,
  setSalesOrg,
  clearAuth
} from "@/store/authSlice";


export default function AuthContextInitializer({ children }) {
    const dispatch = useDispatch();
    const authState = useSelector((state) => state?.auth || {});

    useEffect(() => {
        console.log('🔧 AuthContextInitializer: AUTONOMOUS auth check - will NOT modify existing auth');
        
        // Get current auth state from Redux
        const currentAuth = authState || {};
        const hasValidAuth = currentAuth.isAuthenticated && currentAuth.accessToken && currentAuth.loginResponse;
        
        if (hasValidAuth) {
            console.log('✅ AuthContextInitializer: Valid auth already exists in Redux - preserving it');
            return; // DO NOT MODIFY EXISTING VALID AUTH
        }
        
        // Only try to restore auth from cookies if Redux is completely empty
        console.log('🔍 AuthContextInitializer: No Redux auth found, checking cookies for restoration...');
        
        // Check for auth cookies
        const userContextString = Cookies.get('user_context');
        const accessToken = Cookies.get('access_token');
        
        console.log('🔧 AuthContextInitializer: Found cookies', {
            timestamp: new Date().toISOString(),
            hasUserContext: !!userContextString,
            hasAccessToken: !!accessToken,
            userContextLength: userContextString?.length || 0,
            accessTokenLength: accessToken?.length || 0
        });

        if (userContextString && accessToken) {
            try {
                const loginResponseData = JSON.parse(userContextString);
                console.log('📦 AuthContextInitializer: Restoring auth from cookies:', {
                    username: loginResponseData.username,
                    firstName: loginResponseData.firstName,
                    hasUserProfile: !!loginResponseData.userProfile
                });

                // Set access token first
                dispatch(setAccessToken(accessToken));
                
                // Store COMPLETE login response exactly as received from backend
                dispatch(setAuthenticated(true));
                dispatch(setLoginResponse(loginResponseData));
                
                // Extract user data from loginResponse
                const defaultContext = loginResponseData.userProfile?.defaultContext?.[0];
                const userData = {
                    id: loginResponseData.id,
                    username: loginResponseData.username,
                    email: loginResponseData.email,
                    firstName: loginResponseData.firstName,
                    lastName: loginResponseData.lastName,
                    persona: loginResponseData.persona,
                    soldToId: defaultContext?.soldToId,
                    soldToName: defaultContext?.soldToName,
                    permissions: loginResponseData.permissions,
                    isInsightEmployee: loginResponseData.isInsightEmployee,
                    isInsightAdmin: loginResponseData.isInsightAdmin
                };
                dispatch(setUser(userData));
                dispatch(setContextData(defaultContext || {}));
                dispatch(setSoldTo(defaultContext?.soldTo));
                dispatch(setSalesOrg(loginResponseData.salesOrgId));
                
                // Legacy userSlice for backward compatibility
                dispatch(setIsLoggedInState(true));
                dispatch(setUserState([loginResponseData]));
                dispatch(setSelectedAccountState([{
                    soldToID: defaultContext?.soldToId,
                    soldTo: defaultContext?.soldTo
                }]));
                dispatch(setLoginResponseState([loginResponseData]));
                
                console.log('✅ AuthContextInitializer: Successfully initialized complete auth state from cookies');

            } catch (e) {
                console.error("❌ Failed to parse user context cookie:", e);
                dispatch(setAuthenticated(false));
                dispatch(setIsLoggedInState(false));
            }
        } else {
            console.log('⚠️ AuthContextInitializer: No auth cookies found, checking current Redux state...');
            
            // Check if we already have authentication in Redux before clearing it
            const currentAuthState = authState || {};
            const hasReduxAuth = currentAuthState.isAuthenticated && currentAuthState.accessToken;
            
            if (hasReduxAuth) {
                console.log('✅ AuthContextInitializer: Found valid Redux auth state, preserving authentication');
                // Don't clear authentication if we already have it in Redux
                return;
            }
            
            console.log('⚠️ AuthContextInitializer: No valid auth found anywhere, setting unauthenticated state');
            dispatch(setAuthenticated(false));
            dispatch(setIsLoggedInState(false));
        }
    }, [dispatch]);

    return <>{children}</>;
}