import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { SidebarProvider } from '../contexts/SidebarContext';
import AuthGuard from '../components/AuthGuard';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <SidebarProvider>
            <AuthGuard>
                <Component {...pageProps} />
            </AuthGuard>
        </SidebarProvider>
    );
}
