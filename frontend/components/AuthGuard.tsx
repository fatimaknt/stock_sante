import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const { reload, hasPermission, user } = useAuth();

    // Déterminer si la route est publique (doit être stable et avant tout return)
    const isPublic = useMemo(() => {
        const publicPages = ['/login', '/register', '/auth/activate'];
        return publicPages.includes(router.pathname);
    }, [router.pathname]);

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                setIsAuthenticated(false);
                if (!isPublic) router.push('/login');
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
                    // Charger l'utilisateur une seule fois
                    if (!user) {
                        await reload();
                    }
                    setIsAuthenticated(true);
                } else {
                    localStorage.removeItem('auth_token');
                    setIsAuthenticated(false);
                    if (!isPublic) router.push('/login');
                }
            } catch (error) {
                console.error('Erreur de vérification auth:', error);
                localStorage.removeItem('auth_token');
                setIsAuthenticated(false);
                if (!isPublic) router.push('/login');
            }
        };

        if (isPublic) {
            // Autoriser l'affichage des pages publiques sans contrôle d'auth
            setIsAuthenticated(true);
            return;
        }

        checkAuth();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router.pathname, isPublic]);

    // Map des permissions requises par route
    const routePermission = useMemo(() => {
        const map: Record<string, string | null> = {
            '/products': 'Gestion stock',
            '/receipts': 'Réceptions',
            '/stockout': 'Sorties',
            '/inventory': 'Inventaire',
            '/alerts': 'Alertes',
            '/user': 'Administration',
            '/reports': 'Rapports',
            '/settings': 'Administration',
        };
        const path = router.pathname;
        const key = Object.keys(map).find(k => (k === '/' ? path === '/' : path.startsWith(k)));
        return key ? map[key] : null;
    }, [router.pathname]);

    // Loader pendant vérification
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

    // Autoriser directement les pages publiques
    if (isPublic) {
        return <>{children}</>;
    }

    // Contrôle des permissions
    if (routePermission && !hasPermission(routePermission)) {
        if (router.pathname !== '/') router.push('/');
        return null;
    }

    // Si authentifié et autorisé
    if (isAuthenticated) {
        return <>{children}</>;
    }

    // Sinon, ne rien afficher (redirection en cours)
    return null;
}

