import type { AppProps } from 'next/app';
import '../styles/globals.css';
import { SidebarProvider } from '../contexts/SidebarContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { AuthProvider } from '../contexts/AuthContext';
import AuthGuard from '../components/AuthGuard';

export default function MyApp({ Component, pageProps }: AppProps) {
    return (
        <SettingsProvider>
            <AuthProvider>
                <SidebarProvider>
                    <AuthGuard>
                        <Component {...pageProps} />
                    </AuthGuard>
                </SidebarProvider>
            </AuthProvider>
        </SettingsProvider>
    );
}
