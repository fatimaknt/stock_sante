import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { API } from '../utils/api';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                router.push('/login');
                return;
            }

            try {
                const response = await fetch(API('/auth/user'), {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('auth_token');
                    router.push('/login');
                }
            } catch (error) {
                console.error('Erreur de vérification auth:', error);
                localStorage.removeItem('auth_token');
                router.push('/login');
            }
        };

        // Ne pas vérifier l'auth sur les pages publiques
        const publicPages = ['/login', '/register', '/auth/activate'];
        if (!publicPages.includes(router.pathname)) {
            checkAuth();
        } else {
            setIsAuthenticated(true); // Permettre l'affichage des pages publiques
        }
    }, [router]);

    // Pages publiques
    const publicPages = ['/login', '/register', '/auth/activate'];
    if (publicPages.includes(router.pathname)) {
        return <>{children}</>;
    }

    // Afficher un loader pendant la vérification
    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Vérification de l'authentification...</p>
                </div>
            </div>
        );
    }

    // Si authentifié, afficher le contenu
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Sinon, ne rien afficher (redirection en cours)
    return null;
}

