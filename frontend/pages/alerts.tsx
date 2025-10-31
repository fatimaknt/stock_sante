import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { BellIcon, ExclamationTriangleIcon, CheckIcon } from '@heroicons/react/24/outline';
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

    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Alertes</h1>
                    <p className="text-gray-500">Gérez les alertes de stock et les notifications</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button type="button" onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-100 text-red-700 hover:text-red-900 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="bg-white border rounded-lg shadow-md p-6">
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                        </div>
                    </div>
                ) : alerts.length === 0 ? (
                    <div className="bg-white border rounded-lg shadow-md p-6">
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <BellIcon className="w-16 h-16 text-gray-300 mb-4" />
                            <h2 className="text-2xl font-bold text-gray-700 mb-2">Aucune alerte</h2>
                            <p className="text-gray-500">Tous vos produits sont en stock suffisant.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Résumé des alertes */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="bg-white border rounded-lg shadow-sm p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">Alertes critiques</p>
                                        <p className="text-3xl font-bold text-red-600">{criticalAlerts.length}</p>
                                        <p className="text-sm text-gray-500 mt-1">Stock épuisé ou très faible</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border rounded-lg shadow-sm p-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-600 mb-1">Alertes de stock faible</p>
                                        <p className="text-3xl font-bold text-orange-600">{lowAlerts.length}</p>
                                        <p className="text-sm text-gray-500 mt-1">Sous le seuil critique</p>
                                    </div>
                                    <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
                                        <BellIcon className="h-6 w-6 text-orange-600" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Liste des alertes */}
                        <div className="bg-white border rounded-lg shadow-md p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold">Liste des alertes ({unreadAlerts.length} non lues / {alerts.length} total)</h2>
                                {unreadAlerts.length > 0 && (
                                    <button
                                        onClick={markAllAsRead}
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
                                    >
                                        <CheckIcon className="w-4 h-4" />
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
                                            className={`border rounded-lg p-4 transition-opacity ${getAlertColor(alert.type, isRead)}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className={`text-lg font-semibold`}>
                                                            {alert.product.name}
                                                        </h3>
                                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(status)}`}>
                                                            {status}
                                                        </span>
                                                        {isRead && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                                                <CheckIcon className="w-3 h-3" />
                                                                Lu
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm mb-2">{alert.message}</p>
                                                    <div className="flex items-center gap-4 text-sm">
                                                        <span><strong>Catégorie:</strong> {alert.product.category}</span>
                                                        <span><strong>Stock actuel:</strong> {alert.product.quantity}</span>
                                                        <span><strong>Seuil critique:</strong> {alert.product.critical_level}</span>
                                                        {alert.product.supplier && (
                                                            <span><strong>Fournisseur:</strong> {alert.product.supplier}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold">€{Number(alert.product.price).toFixed(2)}</p>
                                                        <p className="text-xs text-gray-600">Prix unitaire</p>
                                                    </div>
                                                    {!isRead && (
                                                        <button
                                                            onClick={() => markAsRead(alert.product.id)}
                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
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

