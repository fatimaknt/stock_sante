// Force absolute backend URL to prevent relative requests
const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || 'https://stock-sante-backend.onrender.com/api';

export const API = (path: string) => {
    // Always return absolute URL
    const url = `${BACKEND_URL}${path}`;
    console.log('📡 Full URL:', url);
    return url;
};

// Fonction publique (sans token) pour les pages publiques
export async function getJSONPublic(input: RequestInfo | URL, init?: RequestInit) {
    // Ensure we have absolute URL
    const urlStr = String(input);
    const absoluteUrl = urlStr.startsWith('http') ? urlStr : `${BACKEND_URL}${urlStr}`;

    const res = await fetch(absoluteUrl, {
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

    // Ensure we have absolute URL
    const urlStr = String(input);
    const absoluteUrl = urlStr.startsWith('http') ? urlStr : `${BACKEND_URL}${urlStr}`;

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...init?.headers,
    };

    const res = await fetch(absoluteUrl, {
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

