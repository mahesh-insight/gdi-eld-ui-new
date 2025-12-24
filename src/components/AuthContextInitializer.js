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
                    
                    // CRITICAL: Always ensure user object has complete fields to prevent header display issues
                    // This prevents showing firstName instead of account name after cache reset
                    const soldToId = persistedSoldTo || persistedLoginResponse?.soldToId || persistedLoginResponse?.soldTo;
                    console.log('🔧 AuthContextInitializer: Ensuring complete user object for header display');
                    dispatch(setUser({
                        ...persistedUser,
                        soldToId: soldToId || persistedUser?.soldToId,
                        firstName: persistedUser?.firstName || persistedLoginResponse?.firstName || '',
                        lastName: persistedUser?.lastName || persistedLoginResponse?.lastName || '',
                        username: persistedUser?.username || persistedLoginResponse?.username || '',
                        persona: persistedUser?.persona || persistedLoginResponse?.persona || ''
                    }));
                    // CRITICAL: Also ensure loginResponse is complete
                    if (!persistedLoginResponse?.userProfile?.defaultContext?.[0]?.soldToName) {
                        console.warn('⚠️ Missing soldToName in loginResponse - this may cause header display issues');
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
                console.log('🔍 Company name analysis:', {
                    hasSoldToName: !!loginResponseData?.userProfile?.defaultContext?.[0]?.soldToName,
                    soldToName: loginResponseData?.userProfile?.defaultContext?.[0]?.soldToName,
                    hasCompanyName: !!loginResponseData?.companyName,
                    companyName: loginResponseData?.companyName,
                    hasDefaultContext: !!loginResponseData?.userProfile?.defaultContext?.[0],
                    defaultContext: loginResponseData?.userProfile?.defaultContext?.[0]
                });

                // Store complete login response exactly as received - no modifications needed
                dispatch(setAuthenticated(true));
                
                // Store the original login response without any fallback modifications
                // soldToName "ET Test Customer US" is already present in the response
                console.log('✅ Storing login response exactly as received:', {
                    soldToName: loginResponseData?.userProfile?.defaultContext?.[0]?.soldToName,
                    soldToId: loginResponseData?.userProfile?.defaultContext?.[0]?.soldToId,
                    soldTo: loginResponseData?.userProfile?.defaultContext?.[0]?.soldTo
                });
                
                dispatch(setLoginResponse(loginResponseData)); // Store original response without modifications
                
                // Set user data from original login response
                const userData = {
                    id: loginResponseData.id,
                    username: loginResponseData.username,
                    email: loginResponseData.email,
                    firstName: loginResponseData.firstName,
                    lastName: loginResponseData.lastName,
                    persona: loginResponseData.persona,
                    soldToId: loginResponseData.userProfile?.defaultContext?.[0]?.soldToId,
                    soldToName: loginResponseData.userProfile?.defaultContext?.[0]?.soldToName,
                    permissions: loginResponseData.permissions,
                    isInsightEmployee: loginResponseData.isInsightEmployee,
                    isInsightAdmin: loginResponseData.isInsightAdmin
                };
                dispatch(setUser(userData));
                dispatch(setContextData(loginResponseData.userProfile?.defaultContext?.[0] || {}));
                dispatch(setSoldTo(loginResponseData.userProfile?.defaultContext?.[0]?.soldTo));
                dispatch(setSalesOrg(loginResponseData.salesOrgId));
                
                // Legacy userSlice for backward compatibility
                dispatch(setIsLoggedInState(true));
                dispatch(setUserState([loginResponseData]));
                dispatch(setSelectedAccountState([{
                    soldToID: loginResponseData.userProfile?.defaultContext?.[0]?.soldToId,
                    soldTo: loginResponseData.userProfile?.defaultContext?.[0]?.soldTo
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