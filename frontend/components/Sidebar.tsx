import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import {
    Squares2X2Icon,
    CubeIcon,
    ArrowDownTrayIcon,
    ArrowRightOnRectangleIcon,
    ClipboardDocumentListIcon,
    UserIcon,
    Cog6ToothIcon,
    BellIcon,
    ChartBarIcon,
} from '@heroicons/react/24/outline';

export default function Sidebar({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
    const router = useRouter();
    const pathname = router.pathname;
    const { settings } = useSettings();
    const { hasPermission } = useAuth();

    const navItems = [
        { href: '/', label: 'Dashboard', icon: 'dashboard', perm: null },
        { href: '/products', label: 'Produits', icon: 'cube', perm: 'Gestion stock' },
        { href: '/receipts', label: 'Réception', icon: 'inbox', perm: 'Réceptions' },
        { href: '/stockout', label: 'Sortie', icon: 'arrow-right', perm: 'Sorties' },
        { href: '/inventory', label: 'Inventaire', icon: 'clipboard', perm: 'Inventaire' },
        { href: '/alerts', label: 'Alertes', icon: 'bell', perm: 'Alertes' },
        { href: '/user', label: 'Utilisateur', icon: 'user', perm: 'Administration' },
        { href: '/reports', label: 'Rapports', icon: 'chart', perm: 'Rapports' },
        { href: '/settings', label: 'Paramètres', icon: 'cog', perm: 'Administration' },
    ].filter(item => !item.perm || hasPermission(item.perm));

    const isActive = (href: string) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // Logo cube vert pour StockPro
    const LogoCubeIcon = () => (
        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#10b981" fillOpacity="1" />
            <path d="M3 7V17L12 22L21 17V7L12 12L3 7Z" fill="#10b981" fillOpacity="0.85" />
            <path d="M12 12V22L21 17V7L12 12Z" fill="#10b981" fillOpacity="0.7" />
        </svg>
    );

    const getIcon = (iconType: string, isActiveItem: boolean) => {
        const iconClass = 'w-7 h-7 transition-transform duration-300 group-hover:scale-110';
        const colorClass = isActiveItem ? 'text-white' : 'text-gray-700 dark:text-gray-300';

        switch (iconType) {
            case 'dashboard':
                return <Squares2X2Icon className={`${iconClass} ${colorClass}`} />;
            case 'cube':
                return <CubeIcon className={`${iconClass} ${colorClass}`} />;
            case 'inbox':
                return <ArrowDownTrayIcon className={`${iconClass} ${colorClass}`} />;
            case 'arrow-right':
                return <ArrowRightOnRectangleIcon className={`${iconClass} ${colorClass}`} />;
            case 'clipboard':
                return <ClipboardDocumentListIcon className={`${iconClass} ${colorClass}`} />;
            case 'user':
                return <UserIcon className={`${iconClass} ${colorClass}`} />;
            case 'cog':
                return <Cog6ToothIcon className={`${iconClass} ${colorClass}`} />;
            case 'bell':
                return <BellIcon className={`${iconClass} ${colorClass}`} />;
            case 'chart':
                return <ChartBarIcon className={`${iconClass} ${colorClass}`} />;
            default:
                return null;
        }
    };

    return (
        <aside className={`${isCollapsed ? 'w-16' : 'w-64'} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen fixed left-0 top-0 z-20 transition-all duration-300 ease-in-out overflow-hidden`}>

            <div className="p-4">
                {/* Logo StockPro avec icône cube verte */}
                {!isCollapsed && (
                    <div className="flex items-center gap-3 mb-6 animate-fade-in cursor-pointer group/logo">
                        <div className="animate-bounce-slow group-hover/logo:scale-110 transition-transform duration-300">
                            <LogoCubeIcon />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white group-hover/logo:text-emerald-600 dark:group-hover/logo:text-emerald-400 transition-colors duration-300">{settings.organizationName}</h1>
                    </div>
                )}
                {isCollapsed && (
                    <div className="flex justify-center mb-6 cursor-pointer group/logo">
                        <div className="animate-bounce-slow group-hover/logo:scale-110 transition-transform duration-300">
                            <LogoCubeIcon />
                        </div>
                    </div>
                )}

                <nav className="space-y-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`group block ${isCollapsed ? 'px-2 py-2 justify-center' : 'px-3 py-2.5'} rounded-lg flex items-center gap-3 transition-all duration-300 cursor-pointer ${active
                                    ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-lg scale-105 border-l-4 border-emerald-800 dark:border-emerald-600'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-gray-700 hover:text-emerald-700 dark:hover:text-emerald-400 hover:scale-105 hover:shadow-md hover:border-l-4 hover:border-emerald-300 dark:hover:border-emerald-500'
                                    }`}
                            >
                                {getIcon(item.icon, active)}
                                {!isCollapsed && (
                                    <span className={`font-medium transition-colors duration-300 ${active ? 'text-white' : 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400'}`}>
                                        {item.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </div>
        </aside>
    );
}
