// src/components/AuthContextInitializer.js
"use client";

import { useEffect } from 'react';
import { useSetRecoilState } from 'recoil';
import Cookies from 'js-cookie'; // Client-side library to read non-HTTP-only cookies
// Import all your required Recoil atoms and other dependencies
import { isLoggedInState, userState, selectedAccountState, loginResponseState } from "../recoil/userAtoms";
import { /* ... all other page atoms ... */ } from "../recoil/pageAtoms";


export default function AuthContextInitializer({ children }) {
    const setLoggedIn = useSetRecoilState(isLoggedInState);
    const setUserData = useSetRecoilState(userState);
    const setLoginResponseState = useSetRecoilState(loginResponseState);
    // ... all other recoil setters

    useEffect(() => {
        // This runs once client-side after the page loads
        const userContextString = Cookies.get('user_context');
        const accessToken = Cookies.get('access_token');

        if (userContextString && accessToken) {
            try {
                const userContext = JSON.parse(userContextString);
                
                // 1. Initialize Recoil States
                setLoggedIn(true);
                setUserData({
                    // Map context data to user state
                    role: userContext.persona,
                    firstName: userContext.firstName,
                    // ... other required fields
                });
                setLoginResponseState({
                    soldToID: userContext.soldToId,
                    // ... other analytics data
                });
                
                // 2. Perform the secondary calls (like getMPSAStatus) here
                // You must ensure getMPSAStatus is updated to be a client-side utility
                // getMPSAStatus(userContext.soldToId); 

            } catch (e) {
                console.error("Failed to parse user context cookie:", e);
                // Handle corrupted cookie/session
            }
        } else {
            setLoggedIn(false);
        }
    }, [setLoggedIn, setUserData, setLoginResponseState]);

    return <>{children}</>;
}