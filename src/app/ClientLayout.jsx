// src/app/ClientLayout.jsx
"use client";

import { useEffect } from 'react';
import Header from '@/components/Header/Header';
import ReduxProvider from '@/components/ReduxProvider';
import AuthContextInitializer from '@/components/AuthContextInitializer';
import CookieSync from '@/components/CookieSync';
import NetworkErrorBoundary from '@/components/NetworkErrorBoundary';
import { usePathname } from 'next/navigation';
import { KendoIntlProvider } from '@/components/KendoIntlProvider';
import { saveLastVisitedPage, updateSessionTimestamp } from '@/lib/auth/sessionManager';
import { DownloadWindow } from '@/lib/download';

// Pages where header should NOT show (pre-login / error pages)
const NO_HEADER_PATHS = ['/', '/Unauthorised', '/SignIn'];

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  // Add global error handlers
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled Promise Rejection:', event.reason);
      // Log the error but don't prevent default to avoid breaking the app
      if (event.reason && typeof event.reason === 'object' && event.reason.message) {
        console.error('🚨 Error details:', event.reason.message);
        console.error('🚨 Stack trace:', event.reason.stack);
      }
    };

    const handleError = (event) => {
      console.error('🚨 Global Error:', event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // Track page visits for session restoration
  useEffect(() => {
    // Save the current page if it's not a login/auth page
    if (pathname && !NO_HEADER_PATHS.includes(pathname)) {
      saveLastVisitedPage(pathname);
      updateSessionTimestamp();
    }
  }, [pathname]);

  const showHeader = !NO_HEADER_PATHS.includes(pathname);

  return (
    <ReduxProvider>
      <KendoIntlProvider>
        <AuthContextInitializer>
          <NetworkErrorBoundary>
            <CookieSync />
            <DownloadWindow />
            <div className="App">
              {showHeader && <Header />}

              {/* All your pages will render here */}
              {children}
            </div>
          </NetworkErrorBoundary>
        </AuthContextInitializer>
      </KendoIntlProvider>
    </ReduxProvider>
  );
}
