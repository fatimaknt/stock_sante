import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useSettings } from '../contexts/SettingsContext';
import { BellIcon, ExclamationTriangleIcon, CheckIcon, XMarkIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = {
    id: number;
    name: string;
    category: string;
    quantity: number;
    critical_level: number;
    price: number;
    supplier?: string | null;
};

type Alert = {
    product: Product;
    type: 'low' | 'critical';
    message: string;
};

function getStatusLabel(p: { quantity: number; critical_level: number }): 'Normal' | 'Faible' | 'Critique' {
    if (p.quantity <= 0) return 'Critique';
    if (p.quantity <= p.critical_level) return 'Faible';
    return 'Normal';
}

export default function AlertsPage() {
    const { settings } = useSettings();
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [readAlerts, setReadAlerts] = useState<Set<number>>(new Set());

    const loadAlerts = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await getJSON(API('/products')) as any;
            const products = (data.items || []) as Product[];

            // Filtrer les produits avec alertes
            const alertList: Alert[] = [];
            products.forEach(product => {
                const status = getStatusLabel(product);
                if (status === 'Critique') {
                    alertList.push({
                        product,
                        type: 'critical',
                        message: product.quantity === 0
                            ? 'Stock épuisé'
                            : `Stock très faible (${product.quantity} unités restantes)`
                    });
                } else if (status === 'Faible') {
                    alertList.push({
                        product,
                        type: 'low',
                        message: `Stock faible (${product.quantity} unités restantes, seuil: ${product.critical_level})`
                    });
                }
            });

            // Trier: critiques d'abord, puis faibles
            alertList.sort((a, b) => {
                if (a.type === 'critical' && b.type === 'low') return -1;
                if (a.type === 'low' && b.type === 'critical') return 1;
                return a.product.name.localeCompare(b.product.name);
            });

            setAlerts(alertList);
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
            setAlerts([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAlerts();
        // Charger les alertes marquées comme lues depuis localStorage
        const saved = localStorage.getItem('readAlerts');
        if (saved) {
            try {
                const readIds = JSON.parse(saved) as number[];
                setReadAlerts(new Set(readIds));
            } catch (e) {
                console.error('Erreur lors du chargement des alertes lues:', e);
            }
        }
    }, []);

    const markAsRead = (productId: number) => {
        const newReadAlerts = new Set(readAlerts);
        newReadAlerts.add(productId);
        setReadAlerts(newReadAlerts);
        // Sauvegarder dans localStorage
        localStorage.setItem('readAlerts', JSON.stringify(Array.from(newReadAlerts)));
    };

    const markAllAsRead = () => {
        const allIds = alerts.map(a => a.product.id);
        const newReadAlerts = new Set(allIds);
        setReadAlerts(newReadAlerts);
        localStorage.setItem('readAlerts', JSON.stringify(Array.from(newReadAlerts)));
    };

    const getAlertColor = (type: string, isRead: boolean) => {
        if (isRead) {
            return type === 'critical'
                ? 'bg-red-50 border-red-200 text-red-600 opacity-60'
                : 'bg-orange-50 border-orange-200 text-orange-600 opacity-60';
        }
        return type === 'critical'
            ? 'bg-red-100 border-red-300 text-red-800'
            : 'bg-orange-100 border-orange-300 text-orange-800';
    };

    const getStatusColor = (status: string) => {
        if (status === 'Critique') return 'bg-red-500 text-white';
        if (status === 'Faible') return 'bg-orange-500 text-white';
        return 'bg-green-500 text-white';
    };

    const unreadAlerts = alerts.filter(a => !readAlerts.has(a.product.id));
    const criticalAlerts = unreadAlerts.filter(a => a.type === 'critical');
    const lowAlerts = unreadAlerts.filter(a => a.type === 'low');

    const formatCurrency = useMemo(() => {
        const localeMap: { [key: string]: string } = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'es': 'es-ES'
        };
        const locale = localeMap[settings.language] || 'fr-FR';
        const currency = settings.defaultCurrency;

        return (value: number) => {
            return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
        };
    }, [settings.language, settings.defaultCurrency]);

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Alertes</h1>
                            <p className="text-orange-100">Gérez les alertes de stock et les notifications</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <BellIcon className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-700 dark:text-red-400 border-l-4 border-red-500 dark:border-red-400 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{error}</span>
                        <button type="button" onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 dark:border-orange-400"></div>
                        </div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/50 dark:to-green-800/50 flex items-center justify-center mb-4">
                                <BellIcon className="w-10 h-10 text-green-600 dark:text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Aucune alerte</h2>
                            <p className="text-gray-500 dark:text-gray-400">Tous vos produits sont en stock suffisant.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Résumé des alertes avec gradients */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                                <div className="flex items-center justify-between mb-4">
                                    <ExclamationTriangleIcon className="w-8 h-8 text-red-100" />
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-red-100" />
                                </div>
                                <p className="text-red-100 text-sm font-medium mb-1">Alertes critiques</p>
                                <p className="text-3xl font-bold mb-1">{criticalAlerts.length}</p>
                                <p className="text-red-100 text-xs">Stock épuisé ou très faible</p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                                <div className="flex items-center justify-between mb-4">
                                    <BellIcon className="w-8 h-8 text-orange-100" />
                                    <ArrowTrendingUpIcon className="w-5 h-5 text-orange-100" />
                                </div>
                                <p className="text-orange-100 text-sm font-medium mb-1">Alertes de stock faible</p>
                                <p className="text-3xl font-bold mb-1">{lowAlerts.length}</p>
                                <p className="text-orange-100 text-xs">Sous le seuil critique</p>
                            </div>
                        </div>

                        {/* Liste des alertes */}
                        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                                        <BellIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Liste des alertes</h2>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{unreadAlerts.length} non lues / {alerts.length} total</p>
                                    </div>
                                </div>
                                {unreadAlerts.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:scale-105 font-medium"
                                    >
                                        <CheckIcon className="w-5 h-5" />
                                        Marquer toutes comme lues
                                    </button>
                                )}
                            </div>
                            <div className="space-y-4">
                                {alerts.map((alert) => {
                                    const status = getStatusLabel(alert.product);
                                    const isRead = readAlerts.has(alert.product.id);
                                    return (
                                        <div
                                            key={alert.product.id}
                                            className={`border rounded-xl p-6 transition-all transform hover:scale-[1.01] shadow-md ${isRead
                                                ? 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-gray-200 dark:border-gray-600 opacity-75'
                                                : alert.type === 'critical'
                                                    ? 'bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 border-red-300 dark:border-red-700 shadow-red-100 dark:shadow-red-900/20'
                                                    : 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-orange-900/20'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <h3 className={`text-xl font-bold ${isRead ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {alert.product.name}
                                                        </h3>
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${status === 'Critique'
                                                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                                                            : status === 'Faible'
                                                                ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white'
                                                                : 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                                                            }`}>
                                                            {status}
                                                        </span>
                                                        {isRead && (
                                                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 shadow-sm">
                                                                <CheckIcon className="w-3 h-3" />
                                                                Lu
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className={`text-sm mb-4 font-medium ${isRead ? 'text-gray-600 dark:text-gray-400' : alert.type === 'critical' ? 'text-red-800 dark:text-red-400' : 'text-orange-800 dark:text-orange-400'}`}>
                                                        {alert.message}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 shadow-sm">
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">Catégorie:</span>
                                                            <span className="text-gray-600 dark:text-gray-400">{alert.product.category}</span>
                                                        </span>
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 shadow-sm">
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">Stock:</span>
                                                            <span className={`font-bold ${alert.type === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-orange-600 dark:text-orange-400'}`}>{alert.product.quantity}</span>
                                                        </span>
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 shadow-sm">
                                                            <span className="font-semibold text-gray-700 dark:text-gray-300">Seuil:</span>
                                                            <span className="text-gray-600 dark:text-gray-400">{alert.product.critical_level}</span>
                                                        </span>
                                                        {alert.product.supplier && (
                                                            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/70 dark:bg-gray-700/70 border border-gray-200 dark:border-gray-600 shadow-sm">
                                                                <span className="font-semibold text-gray-700 dark:text-gray-300">Fournisseur:</span>
                                                                <span className="text-gray-600 dark:text-gray-400">{alert.product.supplier}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-3 ml-6">
                                                    <div className="text-right px-4 py-3 rounded-lg bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border border-gray-200 dark:border-gray-600 shadow-sm">
                                                        <p className={`text-2xl font-bold ${isRead ? 'text-gray-500 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                                                            {formatCurrency(Number(alert.product.price))}
                                                        </p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Prix unitaire</p>
                                                    </div>
                                                    {!isRead && (
                                                        <button
                                                            onClick={() => markAsRead(alert.product.id)}
                                                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all transform hover:scale-105 text-sm font-medium"
                                                        >
                                                            <CheckIcon className="w-4 h-4" />
                                                            Marquer comme lue
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}

