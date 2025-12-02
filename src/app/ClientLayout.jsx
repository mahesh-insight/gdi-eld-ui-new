// src/app/ClientLayout.jsx
"use client";

import Header from '@/components/Header/Header';
import ReduxProvider from '@/components/ReduxProvider';
import { usePathname } from 'next/navigation';

// Pages where header should NOT show (pre-login / error pages)
const NO_HEADER_PATHS = ['/', '/Unauthorised', '/SignIn'];

export default function ClientLayout({ children }) {
  const pathname = usePathname();

  const showHeader = !NO_HEADER_PATHS.includes(pathname);

  return (
    <ReduxProvider>
      <div className="App">
        {showHeader && <Header />}

        {/* All your pages will render here */}
        {children}
      </div>
    </ReduxProvider>
  );
}
