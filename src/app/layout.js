// src/app/layout.js
import './globals.css';
import ClientLayout from './ClientLayout';
import "Insight-Theme/dist/scss/index.scss"; 

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
