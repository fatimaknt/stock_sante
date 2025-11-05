import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { API } from '../utils/api';

type CurrentUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    permissions: string[];
} | null;

type AuthContextType = {
    user: CurrentUser;
    reload: () => Promise<void>;
    hasPermission: (perm: string) => boolean;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    reload: async () => { },
    hasPermission: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<CurrentUser>(null);
    const [isLoading, setIsLoading] = useState(false);

    const reload = useCallback(async () => {
        if (isLoading) return; // Éviter les appels multiples simultanés
        setIsLoading(true);
        try {
            const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
            if (!token) { setUser(null); setIsLoading(false); return; }
            const res = await fetch(API('/auth/user'), {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (!res.ok) { setUser(null); setIsLoading(false); return; }
            const data = await res.json();
            setUser({
                id: data.id,
                name: data.name,
                email: data.email,
                role: data.role,
                status: data.status,
                permissions: Array.isArray(data.permissions) ? data.permissions : [],
            });
        } catch {
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    }, []); // Pas de dépendances pour éviter les re-créations

    useEffect(() => {
        // Charger l'utilisateur seulement au montage si un token existe
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token && !user && !isLoading) {
            reload();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Uniquement au montage

    const hasPermission = useMemo(() => {
        const set = new Set((user?.permissions || []).map(p => p.toLowerCase()));
        const hasAll = set.has('gestion complète'.toLowerCase());
        return (perm: string) => hasAll || set.has(perm.toLowerCase());
    }, [user]);

    const value = useMemo(() => ({ user, reload, hasPermission }), [user, reload, hasPermission]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    return useContext(AuthContext);
}


