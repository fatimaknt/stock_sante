import { useState, useEffect, useRef } from 'react';
import { BellIcon, UserCircleIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/router';
import { useSidebar } from '../contexts/SidebarContext';
import { API, getJSON } from '../utils/api';

export default function TopBar() {
    const { toggle, isCollapsed } = useSidebar();
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

                // Compter uniquement les alertes non lues de produits
                let unreadCount = 0;
                products.forEach(product => {
                    const isAlert = product.quantity <= 0 || (product.quantity <= (product.critical_level || 10));
                    if (isAlert && !readIds.includes(product.id)) {
                        unreadCount++;
                    }
                });

                // Charger les maintenances et compter les alertes
                try {
                    const maintenancesData = await getJSON(API('/maintenances')) as any[];
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const in7Days = new Date(today);
                    in7Days.setDate(in7Days.getDate() + 7);

                    maintenancesData.forEach(maintenance => {
                        if (maintenance.next_maintenance_date) {
                            const nextDate = new Date(maintenance.next_maintenance_date);
                            nextDate.setHours(0, 0, 0, 0);
                            const maintenanceAlertId = maintenance.id + 1000000;
                            
                            if ((nextDate <= today || nextDate <= in7Days) && !readIds.includes(maintenanceAlertId)) {
                                unreadCount++;
                            }
                        }
                    });
                } catch (err) {
                    console.error('Erreur lors du chargement des maintenances:', err);
                }

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
        <div className={`fixed top-0 right-0 z-50 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg px-8 py-4 flex items-center justify-between backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 transition-all duration-300 ease-in-out ${isCollapsed ? 'left-16' : 'left-64'}`}>
            <div className="flex items-center gap-3">
                <button
                    onClick={toggle}
                    className="relative flex items-center gap-2 cursor-pointer group"
                    role="button"
                    tabIndex={0}
                    aria-label="Toggle sidebar"
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } }}
                >
                    <div className="h-10 w-12 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 transition-all duration-200 hover:shadow-md group-hover:text-emerald-600">
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" strokeWidth="2" stroke="currentColor">
                            <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" fill="none" />
                            <line x1="10" y1="6" x2="10" y2="18" stroke="currentColor" />
                        </svg>
                    </div>
                </button>
            </div>

            <div className="flex items-center gap-3">
                {/* Notification Icon */}
                <div className="relative">
                    <button
                        onClick={() => router.push('/alerts')}
                        className="relative p-2.5 text-gray-600 hover:text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 rounded-lg transition-all duration-200 hover:shadow-md group"
                        aria-label="Alertes"
                    >
                        <BellIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>
                    {notifications > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full shadow-lg animate-pulse">
                            {notifications > 99 ? '99+' : notifications}
                        </span>
                    )}
                </div>

                {/* Divider */}
                <div className="h-8 w-px bg-gradient-to-b from-gray-200 via-gray-300 to-gray-200"></div>

                {/* Profile Icon with Dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="p-2.5 text-gray-600 hover:text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 rounded-lg transition-all duration-200 hover:shadow-md group"
                        aria-label="Profil"
                    >
                        <UserCircleIcon className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>

                    {/* Profile Dropdown Menu */}
                    {isProfileOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {/* User Email Header */}
                            <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border-b border-gray-200">
                                <p className="text-sm font-semibold text-gray-900 mb-1">Profil Utilisateur</p>
                                <p className="text-sm text-gray-600 truncate">{userEmail || 'Chargement...'}</p>
                            </div>

                            {/* Logout Button */}
                            <button
                                onClick={handleLogout}
                                className="w-full px-5 py-3.5 flex items-center gap-3 text-left text-sm font-medium text-gray-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 hover:text-red-700 transition-all duration-200 group"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                                <span>Déconnexion</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

