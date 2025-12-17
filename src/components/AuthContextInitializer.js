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
        console.log('🔧 AuthContextInitializer: Initializing auth state from cookies');
        
        // Check if we already have persisted data in Redux first
        let hasPersistedLoginResponse = false;
        try {
            const persistedAuthRaw = typeof window !== 'undefined' ? localStorage.getItem('persist:ccr-auth') : null;
            if (persistedAuthRaw) {
                const persistedAuth = JSON.parse(persistedAuthRaw);
                const loginResponseStr = persistedAuth.loginResponse;
                if (loginResponseStr && loginResponseStr !== 'null' && loginResponseStr !== 'undefined') {
                    const persistedLoginResponse = typeof loginResponseStr === 'string' ? JSON.parse(loginResponseStr) : loginResponseStr;
                    if (persistedLoginResponse && Object.keys(persistedLoginResponse).length > 5) {
                        hasPersistedLoginResponse = true;
                        console.log('✅ AuthContextInitializer: Found full loginResponse in persist storage, skipping cookie initialization');
                    }
                }
            }
        } catch (e) {
            console.warn('⚠️ Error checking persisted loginResponse:', e);
        }

        // If we have full login response in persist, don't overwrite it with minimal cookie data
        if (hasPersistedLoginResponse) {
            console.log('⏭️ AuthContextInitializer: Skipping initialization - using persisted data');
            return;
        }
        
        // This runs once client-side after the page loads
        const userContextString = Cookies.get('user_context');
        const accessToken = Cookies.get('access_token');
        
        console.log('🔧 AuthContextInitializer: Found cookies', {
            hasUserContext: !!userContextString,
            hasAccessToken: !!accessToken
        });

        if (userContextString && accessToken) {
            try {
                const userContext = JSON.parse(userContextString);
                console.log('🔧 AuthContextInitializer: Parsed user context', userContext);
                
                // Create comprehensive login response object that matches Header expectations
                const loginResponseData = {
                    username: userContext.username,
                    firstName: userContext.firstName,
                    lastName: userContext.lastName || "",
                    persona: userContext.persona,
                    soldToID: userContext.soldToId,
                    soldToId: userContext.soldToId,
                    salesOrgId: userContext.salesOrgId,
                    accessToken: accessToken,
                    isAuthenticated: true,
                    // Add userProfile structure that Header expects
                    userProfile: {
                        defaultContext: [{
                            soldTo: userContext.soldToId,
                            soldToName: userContext.soldToName || "",
                            salesOrgId: userContext.salesOrgId
                        }]
                    }
                };

                console.log('📦 Created loginResponse:', loginResponseData);

                // 1. Initialize userSlice
                dispatch(setIsLoggedInState(true));
                dispatch(setUserState([{
                    userID: userContext.username,
                    role: userContext.persona,
                    firstName: userContext.firstName,
                    lastName: userContext.lastName || "",
                    soldToList: [{
                        soldToName: userContext.soldToName || "",
                        soldTo: userContext.soldToId,
                        soldToID: userContext.soldToId
                    }]
                }]));
                dispatch(setSelectedAccountState([{
                    soldToID: userContext.soldToId,
                    soldTo: userContext.soldToId
                }]));
                dispatch(setLoginResponseState([{
                    soldToID: userContext.soldToId,
                    soldTo: userContext.soldToId
                }]));
                
                // 2. Initialize authSlice (main authentication state)
                dispatch(setAuthenticated(true));
                dispatch(setUser({
                    username: userContext.username,
                    firstName: userContext.firstName,
                    lastName: userContext.lastName || "",
                    persona: userContext.persona
                }));
                dispatch(setLoginResponse(loginResponseData));
                dispatch(setAccessToken(accessToken));
                dispatch(setContextData(userContext));
                dispatch(setSoldTo(userContext.soldToId));
                dispatch(setSalesOrg(userContext.salesOrgId));
                
                console.log('✅ AuthContextInitializer: Successfully initialized auth state');

            } catch (e) {
                console.error("❌ Failed to parse user context cookie:", e);
                // Handle corrupted cookie/session - clear both slices
                dispatch(clearAuth());
                dispatch(clearUserState());
            }
        } else {
            // Fallback: try redux-persist localStorage (helps after hard refresh when cookies are HTTP-only)
            try {
                const persistedAuthRaw = typeof window !== 'undefined' ? localStorage.getItem('persist:ccr-auth') : null;
                if (persistedAuthRaw) {
                    const persistedAuth = JSON.parse(persistedAuthRaw);
                    console.log('🔍 Raw persisted auth:', persistedAuth);
                    
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

                    console.log('🔍 Parsed persist data:', {
                        hasToken: !!persistedToken,
                        hasContext: !!persistedContext,
                        hasLoginResponse: !!persistedLoginResponse,
                        isAuth: persistedIsAuth
                    });

                    if (persistedToken && persistedIsAuth) {
                        console.log('🔧 AuthContextInitializer: Rehydrating from persist storage');
                        const fallbackContext = persistedContext || persistedLoginResponse || {};
                        const soldToId = persistedSoldTo || fallbackContext?.soldToId;
                        const salesOrgId = persistedSalesOrg || fallbackContext?.salesOrgId;

                        // User slice
                        dispatch(setIsLoggedInState(true));
                        dispatch(setUserState([{
                            userID: fallbackContext.username,
                            role: fallbackContext.persona,
                            firstName: fallbackContext.firstName,
                            lastName: "",
                            soldToList: [{
                                soldToName: "",
                                soldTo: soldToId,
                                soldToID: soldToId
                            }]
                        }]));
                        dispatch(setSelectedAccountState([{ soldToID: soldToId, soldTo: soldToId }]));
                        dispatch(setLoginResponseState([{
                            soldToID: soldToId,
                            soldTo: soldToId
                        }]));

                        // Auth slice
                        dispatch(setAuthenticated(true));
                        dispatch(setUser({
                            username: fallbackContext.username || persistedUser?.username,
                            firstName: fallbackContext.firstName || persistedUser?.firstName,
                            persona: fallbackContext.persona || persistedUser?.persona
                        }));
                        dispatch(setLoginResponse(persistedLoginResponse || fallbackContext));
                        dispatch(setAccessToken(persistedToken));
                        dispatch(setContextData(fallbackContext));
                        dispatch(setSoldTo(soldToId));
                        dispatch(setSalesOrg(salesOrgId));
                        console.log('✅ AuthContextInitializer: Rehydrated auth state from persist storage');
                        return;
                    }
                }
            } catch (err) {
                console.warn('⚠️ AuthContextInitializer: Persist fallback failed', err);
            }

            console.log('⚠️ AuthContextInitializer: No auth cookies or persist data found, setting unauthenticated state');
            dispatch(setAuthenticated(false));
            dispatch(setIsLoggedInState(false));
        }
    }, [dispatch]);

    return <>{children}</>;
}