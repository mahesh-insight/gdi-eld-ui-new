// src/components/AuthContextInitializer.js
"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
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

    useEffect(() => {
        console.log('🔧 AuthContextInitializer: Initializing auth state - prioritizing Redux persist over cookies');
        
        // PRIORITY 1: Check Redux persist storage first (doesn't expire)
        // This ensures login response persists even after cookie expiration
        let hasValidPersistedAuth = false;
        try {
            const persistedAuthRaw = typeof window !== 'undefined' ? localStorage.getItem('persist:ccr-auth') : null;
            if (persistedAuthRaw) {
                const persistedAuth = JSON.parse(persistedAuthRaw);
                
                // Parse all persisted fields
                const parseField = (field) => {
                    if (!field) return null;
                    try {
                        return typeof field === 'string' ? JSON.parse(field) : field;
                    } catch {
                        return field;
                    }
                };

                const persistedToken = parseField(persistedAuth.accessToken);
                const persistedLoginResponse = parseField(persistedAuth.loginResponse);
                const persistedIsAuth = parseField(persistedAuth.isAuthenticated);
                const persistedUser = parseField(persistedAuth.user);
                const persistedContext = parseField(persistedAuth.contextData);
                const persistedSoldTo = parseField(persistedAuth.soldTo);
                const persistedSalesOrg = parseField(persistedAuth.salesOrg);

                console.log('🔍 Persisted auth data check:', {
                    hasToken: !!persistedToken,
                    hasLoginResponse: !!persistedLoginResponse,
                    isAuth: persistedIsAuth,
                    hasUser: !!persistedUser,
                    loginResponseKeys: persistedLoginResponse ? Object.keys(persistedLoginResponse).length : 0
                });

                // Validate that we have complete authentication data
                if (persistedIsAuth && persistedToken && persistedLoginResponse && 
                    Object.keys(persistedLoginResponse).length > 5) {
                    
                    hasValidPersistedAuth = true;
                    console.log('✅ AuthContextInitializer: Valid persisted auth found - verifying user object completeness');
                    
                    // Even with valid persist data, ensure user object has critical fields
                    // This prevents header display issues after cache expiry
                    const soldToId = persistedSoldTo || persistedLoginResponse?.soldToId || persistedLoginResponse?.soldTo;
                    if (persistedUser && (!persistedUser.soldToId || !persistedUser.firstName)) {
                        console.log('🔧 AuthContextInitializer: Updating user object with missing fields');
                        dispatch(setUser({
                            ...persistedUser,
                            soldToId: soldToId || persistedUser.soldToId,
                            firstName: persistedUser.firstName || persistedLoginResponse?.firstName,
                            lastName: persistedUser.lastName || persistedLoginResponse?.lastName || "",
                            username: persistedUser.username || persistedLoginResponse?.username,
                            persona: persistedUser.persona || persistedLoginResponse?.persona
                        }));
                    }
                    
                    console.log('✅ AuthContextInitializer: Relying on Redux persist rehydration (with user object verification)');
                    return; // Let Redux persist handle the state
                }
            }
        } catch (e) {
            console.warn('⚠️ Error checking persisted auth:', e);
        }

        // PRIORITY 2: Fall back to cookies only if persist storage doesn't have valid data
        if (!hasValidPersistedAuth) {
            console.log('⏭️ AuthContextInitializer: No valid persist data, checking cookies...');
        
            // This runs once client-side after the page loads
            const userContextString = Cookies.get('user_context');
            const accessToken = Cookies.get('access_token');
        
        console.log('🔧 AuthContextInitializer: Found cookies', {
            hasUserContext: !!userContextString,
            hasAccessToken: !!accessToken
        });

        if (userContextString && accessToken) {
            try {
                const loginResponseData = JSON.parse(userContextString);
                console.log('📦 Using complete login response from cookies:', loginResponseData);

                // Store complete login response in Redux - no complex parsing needed
                dispatch(setAuthenticated(true));
                dispatch(setLoginResponse(loginResponseData));
                dispatch(setAccessToken(accessToken));
                dispatch(setUser(loginResponseData)); // Use complete login response as user data
                dispatch(setContextData(loginResponseData));
                dispatch(setSoldTo(loginResponseData.soldToId));
                dispatch(setSalesOrg(loginResponseData.salesOrgId));
                
                // Legacy userSlice for backward compatibility
                dispatch(setIsLoggedInState(true));
                dispatch(setUserState([loginResponseData]));
                dispatch(setSelectedAccountState([{
                    soldToID: loginResponseData.soldToId,
                    soldTo: loginResponseData.soldToId
                }]));
                dispatch(setLoginResponseState([loginResponseData]));
                
                console.log('✅ AuthContextInitializer: Successfully initialized auth state from cookies');

            } catch (e) {
                console.error("❌ Failed to parse user context cookie:", e);
                // Handle corrupted cookie/session - clear both slices
                dispatch(clearAuth());
                dispatch(clearUserState());
            }
        } else {
            console.log('⚠️ AuthContextInitializer: No auth cookies found, checking persist storage fallback...');
            
            // PRIORITY 3: Final fallback - try redux-persist localStorage
            try {
                const persistedAuthRaw = typeof window !== 'undefined' ? localStorage.getItem('persist:ccr-auth') : null;
                if (persistedAuthRaw) {
                    const persistedAuth = JSON.parse(persistedAuthRaw);
                    console.log('🔍 Raw persisted auth (fallback check):', persistedAuth);
                    
                    // Redux-persist stores each field as a JSON-stringified value
                    // Need to parse each field separately
                    const parseField = (field) => {
                        if (!field) return null;
                        try {
                            return typeof field === 'string' ? JSON.parse(field) : field;
                        } catch {
                            return field;
                        }
                    };

                    const persistedToken = parseField(persistedAuth.accessToken);
                    const persistedContext = parseField(persistedAuth.contextData);
                    const persistedLoginResponse = parseField(persistedAuth.loginResponse);
                    const persistedSoldTo = parseField(persistedAuth.soldTo);
                    const persistedSalesOrg = parseField(persistedAuth.salesOrg);
                    const persistedUser = parseField(persistedAuth.user);
                    const persistedIsAuth = parseField(persistedAuth.isAuthenticated);

                    console.log('🔍 Parsed persist data (fallback):', {
                        hasToken: !!persistedToken,
                        hasContext: !!persistedContext,
                        hasLoginResponse: !!persistedLoginResponse,
                        isAuth: persistedIsAuth
                    });

                    if (persistedToken && persistedIsAuth && persistedLoginResponse) {
                        console.log('🔧 AuthContextInitializer: Rehydrating from persist storage (fallback)');
                        
                        // Ensure soldToId is available in user object
                        const fallbackContext = persistedContext || persistedLoginResponse || {};
                        const soldToId = persistedSoldTo || fallbackContext?.soldToId || persistedLoginResponse?.soldToId;
                        const salesOrgId = persistedSalesOrg || fallbackContext?.salesOrgId || persistedLoginResponse?.salesOrgId;

                        // User slice
                        dispatch(setIsLoggedInState(true));
                        dispatch(setUserState([{
                            userID: persistedUser?.username || fallbackContext.username,
                            role: persistedUser?.persona || fallbackContext.persona,
                            firstName: persistedUser?.firstName || fallbackContext.firstName,
                            lastName: persistedUser?.lastName || "",
                            soldToList: [{
                                soldToName: persistedLoginResponse?.userProfile?.defaultContext?.[0]?.soldToName || "",
                                soldTo: soldToId,
                                soldToID: soldToId
                            }]
                        }]));
                        dispatch(setSelectedAccountState([{ soldToID: soldToId, soldTo: soldToId }]));
                        dispatch(setLoginResponseState([{
                            soldToID: soldToId,
                            soldTo: soldToId
                        }]));

                        // Auth slice - ensure soldToId is in user object
                        dispatch(setAuthenticated(true));
                        dispatch(setUser({
                            username: persistedUser?.username || fallbackContext.username,
                            firstName: persistedUser?.firstName || fallbackContext.firstName,
                            lastName: persistedUser?.lastName || "",
                            persona: persistedUser?.persona || fallbackContext.persona,
                            soldToId: soldToId // Critical: include soldToId
                        }));
                        dispatch(setLoginResponse(persistedLoginResponse));
                        dispatch(setAccessToken(persistedToken));
                        dispatch(setContextData(fallbackContext));
                        dispatch(setSoldTo(soldToId));
                        dispatch(setSalesOrg(salesOrgId));
                        console.log('✅ AuthContextInitializer: Rehydrated auth state from persist storage (fallback)');
                        return;
                    }
                }
            } catch (err) {
                console.warn('⚠️ AuthContextInitializer: Persist fallback failed', err);
            }

            console.log('⚠️ AuthContextInitializer: No auth data found anywhere, setting unauthenticated state');
            dispatch(setAuthenticated(false));
            dispatch(setIsLoggedInState(false));
        }
    }
    }, [dispatch]);

    return <>{children}</>;
}