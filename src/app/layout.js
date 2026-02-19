// src/app/layout.js
import './globals.css';
import ClientLayout from './ClientLayout';
import '@progress/kendo-theme-default/dist/all.css';
import "Insight-Theme/dist/css/insight-theme.css"; 
import "@/styles/chart-theme.css";
import "@/i18n";
import { DownloadProvider } from '@/lib/download';

export const metadata = {
  title: 'CCR',
  description: 'Cloud & consumption reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning={true}>
        <DownloadProvider>
          <ClientLayout>{children}</ClientLayout>
        </DownloadProvider>
      </body>
    </html>
  );
}
