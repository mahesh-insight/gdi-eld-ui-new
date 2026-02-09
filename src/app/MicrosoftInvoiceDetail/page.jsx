// src/app/MicrosoftInvoiceDetail/page.jsx
import { cookies } from 'next/headers';

export const metadata = {
  title: 'Microsoft Invoice Detail',
};

export default async function MicrosoftInvoiceDetailPage() {
  console.log('🎯 SERVER: Rendering Microsoft Invoice Detail page...');
  
  // Get authentication data from server-side cookies
  const cookieStore = await cookies();
  const userContextCookie = cookieStore.get('user_context');
  const soldToIdCookie = cookieStore.get('soldToId');
  
  // Extract soldToId
  let soldToId = soldToIdCookie?.value;
  
  if (!soldToId && userContextCookie?.value) {
    try {
      const parsedContext = JSON.parse(userContextCookie.value);
      soldToId = parsedContext.soldToId;
    } catch (err) {
      console.error('❌ Failed to parse user_context cookie:', err);
    }
  }
  
  return (
    <div style={{ padding: '24px' }}>
      <h1>Microsoft Invoice Detail</h1>
      <p>This page displays detailed information about Microsoft Telco charges and overages.</p>
      {soldToId && <p>Account: {soldToId}</p>}
      <p style={{ marginTop: '24px', color: '#666' }}>
        Content for this page is under development.
      </p>
    </div>
  );
}
