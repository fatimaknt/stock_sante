// Frontend API configuration - Production: stock-sante-backend.onrender.com
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'https://stock-sante-backend.onrender.com/api';

// Debug log
if (typeof window !== 'undefined') {
    console.log('🔗 API_BASE configured:', API_BASE);
    console.log('🔗 NEXT_PUBLIC_API_BASE env:', process.env.NEXT_PUBLIC_API_BASE);
}

export const API = (path: string) => {
    const fullUrl = `${API_BASE}${path}`;
    console.log('📡 API call:', fullUrl);
    return fullUrl;
};

// Fonction publique (sans token) pour les pages publiques
export async function getJSONPublic(input: RequestInfo | URL, init?: RequestInit) {
    const res = await fetch(input, {
        ...init,
        headers: {
            'Content-Type': 'application/json',
            ...init?.headers,
        },
    });

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const body = isJson ? await res.json().catch(() => ({})) : undefined;

    if (!res.ok) {
        const msg = (isJson && (body as any)?.message) ? (body as any).message : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return body ?? {};
}

// Fonction protégée (avec token) pour les pages authentifiées
export async function getJSON(input: RequestInfo | URL, init?: RequestInit) {
    const token = localStorage.getItem('auth_token');

    if (!token) {
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Non authentifié');
    }

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...init?.headers,
    };

    const res = await fetch(input, {
        ...init,
        headers,
    });

    // Si non autorisé, rediriger vers login
    if (res.status === 401) {
        localStorage.removeItem('auth_token');
        if (typeof window !== 'undefined') {
            window.location.href = '/login';
        }
        throw new Error('Non autorisé');
    }

    const ct = res.headers.get('content-type') || '';
    const isJson = ct.includes('application/json');
    const body = isJson ? await res.json().catch(() => ({})) : undefined;

    if (!res.ok) {
        const msg = (isJson && (body as any)?.message) ? (body as any).message : `HTTP ${res.status}`;
        throw new Error(msg);
    }

    return body ?? {};
}

