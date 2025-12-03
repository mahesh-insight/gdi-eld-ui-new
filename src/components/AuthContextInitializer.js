// src/components/AuthContextInitializer.js
"use client";

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Cookies from 'js-cookie'; // Client-side library to read non-HTTP-only cookies
// Import Redux actions
import { setIsLoggedIn, setUserData, setSelectedAccount, setLoginResponse } from "@/lib/store/slices/userSlice";


export default function AuthContextInitializer({ children }) {
    const dispatch = useDispatch();

    useEffect(() => {
        // This runs once client-side after the page loads
        const userContextString = Cookies.get('user_context');
        const accessToken = Cookies.get('access_token');

        if (userContextString && accessToken) {
            try {
                const userContext = JSON.parse(userContextString);
                
                // 1. Initialize Redux States
                dispatch(setIsLoggedIn(true));
                dispatch(setUserData({
                    // Map context data to user state
                    role: userContext.persona,
                    firstName: userContext.firstName,
                    // ... other required fields
                }));
                dispatch(setLoginResponse({
                    soldToID: userContext.soldToId,
                    // ... other analytics data
                }));
                
                // 2. Perform the secondary calls (like getMPSAStatus) here
                // You must ensure getMPSAStatus is updated to be a client-side utility
                // getMPSAStatus(userContext.soldToId); 

            } catch (e) {
                console.error("Failed to parse user context cookie:", e);
                // Handle corrupted cookie/session
            }
        } else {
            dispatch(setIsLoggedIn(false));
        }
    }, [dispatch]);

    return <>{children}</>;
}