import Head from 'next/head';
import RecoilProvider from '../components/RecoilProvider';

// Import global styles
import "Insight-Theme/dist/scss/index.scss"; 

export default function RootLayout({ children }) {   
    return (
        <html lang="en">
            <Head>
               <title>CCR</title>
            </Head>
            <body>
                <RecoilProvider>
                    {children}
                </RecoilProvider>
            </body>
        </html>
    );
}