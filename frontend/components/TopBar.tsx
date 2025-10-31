import { useState, useEffect, useRef } from 'react';
import { BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useSidebar } from '../contexts/SidebarContext';
import { API, getJSON } from '../utils/api';

export default function TopBar() {
    const { toggle } = useSidebar();
    const router = useRouter();
    const [notifications, setNotifications] = useState(0);
    const [userEmail, setUserEmail] = useState<string>('');
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const data = await getJSON(API('/auth/user')) as any;
                if (data.email) {
                    setUserEmail(data.email);
                }
            } catch (error) {
                console.error('Erreur lors du chargement de l\'utilisateur:', error);
            }
        };
        loadUser();

        // Charger le nombre d'alertes non lues
        const loadAlerts = async () => {
            try {
                const stats = await getJSON(API('/stats')) as any;
                const totalAlerts = (stats.lowStock || 0) + (stats.outOfStock || 0);

                // Récupérer les alertes lues depuis localStorage
                const saved = localStorage.getItem('readAlerts');
                let readIds: number[] = [];
                if (saved) {
                    try {
                        readIds = JSON.parse(saved) as number[];
                    } catch (e) {
                        console.error('Erreur lors du chargement des alertes lues:', e);
                    }
                }

                // Charger tous les produits pour filtrer ceux qui ont des alertes
                const productsData = await getJSON(API('/products')) as any;
                const products = (productsData.items || []) as any[];

                // Compter uniquement les alertes non lues
                let unreadCount = 0;
                products.forEach(product => {
                    const isAlert = product.quantity <= 0 || (product.quantity <= (product.critical_level || 10));
                    if (isAlert && !readIds.includes(product.id)) {
                        unreadCount++;
                    }
                });

                setNotifications(unreadCount);
            } catch (error) {
                console.error('Erreur lors du chargement des alertes:', error);
            }
        };
        loadAlerts();

        // Rafraîchir les notifications toutes les 30 secondes
        const interval = setInterval(loadAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };

        if (isProfileOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isProfileOpen]);

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('auth_token');
            if (token) {
                await fetch(API('/auth/logout'), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });
            }
            localStorage.removeItem('auth_token');
            router.push('/login');
        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            localStorage.removeItem('auth_token');
            router.push('/login');
        }
    };

    return (
        <div className="bg-white border shadow-sm rounded-md px-8 py-9 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div
                    onClick={toggle}
                    className="relative flex items-center gap-2 cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle sidebar"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
                >
                    <div className="h-10 w-14 rounded-md flex items-center justify-center text-gray-600 hover:bg-emerald-50 transition-colors duration-200">
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor">
                            <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" fill="none" />
                            <line x1="10" y1="6" x2="10" y2="18" stroke="currentColor" />
                        </svg>
                    </div>
                    <div className="h-10 w-0.5 bg-gray-500 rounded-full"></div>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {/* Notification Icon */}
                <div className="relative">
                    <button
                        onClick={() => router.push('/alerts')}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        aria-label="Alertes"
                    >
                        <BellIcon className="w-6 h-6" />
                    </button>
                    {notifications > 0 && (
                        <span className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full">
                            {notifications}
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-gray-300"></div>

                {/* Profile Icon with Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                        aria-label="Profil"
                    >
                        <UserCircleIcon className="w-6 h-6" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                            {/* User Email */}
                            <div className="px-4 py-3 border-b border-gray-200">
                                <p className="text-sm font-medium text-gray-900">Profil</p>
                                <p className="text-sm text-gray-600 mt-1">{userEmail || 'Chargement...'}</p>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full px-4 py-3 flex items-center gap-3 text-left text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                <span className="font-medium">Déconnexion</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

