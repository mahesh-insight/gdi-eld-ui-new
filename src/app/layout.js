// src/app/layout.js
import './globals.css';
import ClientLayout from './ClientLayout';
import "Insight-Theme/dist/scss/index.scss"; 
import "@/i18n";

export const metadata = {
  title: 'CCR',
  description: 'Cloud & consumption reporting',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
