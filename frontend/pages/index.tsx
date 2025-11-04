import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useSettings } from '../contexts/SettingsContext';
import {
    CubeIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    WifiIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    CalendarDaysIcon,
    ArrowUpIcon,
    ArrowDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { getJSON, API } from '../utils/api';

type Product = {
    id: number;
    name: string;
    category: string;
    quantity: number;
    price: number;
    critical_level: number;
};

type StockOut = {
    id: number;
    product_id: number;
    product?: { name: string };
    quantity: number;
    price?: number;
    movement_date: string;
};

type ReceiptItem = {
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
};

type Receipt = {
    id: number;
    received_at: string;
    items?: ReceiptItem[];
};

type TimePeriod = '7j' | '30j' | '3m' | '6m' | '1an' | 'Tout';

export default function Dashboard() {
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('30j');

    // Forcer le re-render quand la langue change
    useEffect(() => {
        // Ce useEffect force le composant à se re-rendre quand la langue change
    }, [settings.language, settings.defaultCurrency]);

    // Données
    const [products, setProducts] = useState<Product[]>([]);
    const [stockOuts, setStockOuts] = useState<StockOut[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [productsData, stockOutsData, receiptsData] = await Promise.all([
                getJSON(API('/products')) as Promise<any>,
                getJSON(API('/stockouts')) as Promise<any>,
                getJSON(API('/receipts')) as Promise<any>,
            ]);

            setProducts((productsData.items || []) as Product[]);
            setStockOuts((stockOutsData || []) as StockOut[]);
            setReceipts((receiptsData || []) as Receipt[]);
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    // Calcul de la date de début selon la période
    const getDateRange = (period: TimePeriod) => {
        const end = new Date();
        const start = new Date();

        switch (period) {
            case '7j':
                start.setDate(start.getDate() - 7);
                break;
            case '30j':
                start.setDate(start.getDate() - 30);
                break;
            case '3m':
                start.setMonth(start.getMonth() - 3);
                break;
            case '6m':
                start.setMonth(start.getMonth() - 6);
                break;
            case '1an':
                start.setFullYear(start.getFullYear() - 1);
                break;
            case 'Tout':
                start.setFullYear(2020); // Date très ancienne pour tout
                break;
        }

        return { start, end };
    };

    const { start: periodStart, end: periodEnd } = getDateRange(selectedPeriod);

    // Pour calculer les tendances, on compare avec la période précédente
    const prevPeriodStart = useMemo(() => {
        const diff = periodEnd.getTime() - periodStart.getTime();
        const prevStart = new Date(periodStart.getTime() - diff);
        const prevEnd = periodStart;
        return { start: prevStart, end: prevEnd };
    }, [periodStart, periodEnd]);

    const filterByDate = (dateStr: string, start: Date, end: Date) => {
        if (!dateStr) return false;
        const date = new Date(dateStr);
        return date >= start && date <= end;
    };

    const filteredReceipts = receipts.filter(r => filterByDate(r.received_at, periodStart, periodEnd));
    const filteredStockOuts = stockOuts.filter(s => filterByDate(s.movement_date, periodStart, periodEnd));
    const prevFilteredReceipts = receipts.filter(r => filterByDate(r.received_at, prevPeriodStart.start, prevPeriodStart.end));
    const prevFilteredStockOuts = stockOuts.filter(s => filterByDate(s.movement_date, prevPeriodStart.start, prevPeriodStart.end));

    // Calculs des KPIs
    const totalProducts = products.length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= p.critical_level);
    const outOfStockProducts = products.filter(p => p.quantity <= 0);

    // Calcul des tendances basées sur l'activité
    const currentReceiptsQty = filteredReceipts.reduce((sum, r) => sum + (r.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0);
    const prevReceiptsQty = prevFilteredReceipts.reduce((sum, r) => sum + (r.items?.reduce((s, i) => s + i.quantity, 0) || 0), 0);

    const currentStockOutsQty = filteredStockOuts.reduce((sum, s) => sum + s.quantity, 0);
    const prevStockOutsQty = prevFilteredStockOuts.reduce((sum, s) => sum + s.quantity, 0);

    // Calcul des pourcentages de tendance basés sur l'activité
    const calculateTrend = (current: number, previous: number): { value: number; isUp: boolean } => {
        if (previous === 0) {
            return { value: current > 0 ? 100 : 0, isUp: current > 0 };
        }
        const change = ((current - previous) / previous) * 100;
        return { value: Math.abs(change), isUp: change > 0 };
    };

    // Tendances: Basées sur l'activité des réceptions vs sorties
    // Total Produits: tendance basée sur les réceptions (nouveaux produits)
    const receiptTrend = calculateTrend(currentReceiptsQty, prevReceiptsQty);

    // Stock Value: tendance basée sur la balance nette (réceptions - sorties)
    const currentNetValue = filteredReceipts.reduce((sum, r) => {
        return sum + (r.items?.reduce((itemSum, item) => {
            const product = products.find(p => p.id === item.product_id);
            return itemSum + (item.quantity * (product?.price || item.unit_price));
        }, 0) || 0);
    }, 0) - filteredStockOuts.reduce((sum, s) => {
        const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
        return sum + (s.quantity * price);
    }, 0);

    const prevNetValue = prevFilteredReceipts.reduce((sum, r) => {
        return sum + (r.items?.reduce((itemSum, item) => {
            const product = products.find(p => p.id === item.product_id);
            return itemSum + (item.quantity * (product?.price || item.unit_price));
        }, 0) || 0);
    }, 0) - prevFilteredStockOuts.reduce((sum, s) => {
        const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
        return sum + (s.quantity * price);
    }, 0);

    const valueTrend = calculateTrend(currentNetValue, prevNetValue);

    // Pour stock faible et ruptures: on compare l'activité
    // Si plus de sorties que de réceptions, cela augmente les risques d'alertes (tendance négative)
    const stockOutsTrend = calculateTrend(currentStockOutsQty, prevStockOutsQty);
    const receiptActivityTrend = calculateTrend(currentReceiptsQty, prevReceiptsQty);

    // Si plus de sorties cette période, risque d'alertes augmenté (tendance négative = rouge)
    // Si plus de réceptions, risque d'alertes diminué (tendance positive = vert)
    const alertTrend = currentStockOutsQty > prevStockOutsQty
        ? { value: stockOutsTrend.value, isUp: true } // Plus de sorties = plus d'alertes (mauvais = rouge)
        : { value: receiptActivityTrend.value || 0, isUp: false };  // Plus de réceptions = moins d'alertes (bon = vert)

    // Top 5 Produits les Plus Reçus
    const topReceivedProducts = useMemo(() => {
        const productMap = new Map<number, { name: string; category: string; quantity: number }>();

        filteredReceipts.forEach(r => {
            r.items?.forEach(item => {
                const product = products.find(p => p.id === item.product_id);
                if (product) {
                    if (!productMap.has(item.product_id)) {
                        productMap.set(item.product_id, {
                            name: product.name,
                            category: product.category,
                            quantity: 0
                        });
                    }
                    const data = productMap.get(item.product_id)!;
                    data.quantity += item.quantity;
                }
            });
        });

        return Array.from(productMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [filteredReceipts, products]);

    // Top 5 Produits les Plus Sortis
    const topDispatchedProducts = useMemo(() => {
        const productMap = new Map<number, { name: string; category: string; quantity: number }>();

        filteredStockOuts.forEach(s => {
            const product = products.find(p => p.id === s.product_id);
            if (product) {
                if (!productMap.has(s.product_id)) {
                    productMap.set(s.product_id, {
                        name: product.name,
                        category: product.category,
                        quantity: 0
                    });
                }
                const data = productMap.get(s.product_id)!;
                data.quantity += s.quantity;
            }
        });

        return Array.from(productMap.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [filteredStockOuts, products]);

    // Fonction pour formater les dates selon la période
    const formatDateForPeriod = useMemo(() => {
        const localeMap: { [key: string]: string } = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'es': 'es-ES'
        };
        const locale = localeMap[settings.language] || 'fr-FR';

        return (dateStr: string, period: TimePeriod): string => {
            const date = new Date(dateStr);

            if (period === '7j' || period === '30j') {
                // Pour les périodes courtes, afficher jour et mois : "05 nov."
                return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
            } else if (period === '3m' || period === '6m') {
                // Pour les périodes moyennes, afficher jour et mois : "05 nov."
                return date.toLocaleDateString(locale, { day: '2-digit', month: 'short' });
            } else if (period === '1an') {
                // Pour l'année, afficher mois et année : "nov. 2025"
                return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
            } else {
                // Pour "Tout", afficher mois et année : "nov. 2025"
                return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
            }
        };
    }, [settings.language]);

    // Données pour les graphiques (groupées par jour, mois ou année selon la période)
    const chartData = useMemo(() => {
        const dataMap = new Map<string, { date: string; receptions: number; sorties: number }>();

        // Déterminer le niveau de groupement selon la période
        const shouldGroupByMonth = selectedPeriod === '1an' || selectedPeriod === 'Tout';
        const shouldGroupByYear = selectedPeriod === 'Tout' && (periodEnd.getTime() - periodStart.getTime()) > 365 * 24 * 60 * 60 * 1000 * 2;

        // Ajouter les réceptions
        filteredReceipts.forEach(r => {
            const receiptDate = new Date(r.received_at);
            let key: string;

            if (shouldGroupByYear) {
                // Grouper par année
                key = `${receiptDate.getFullYear()}`;
            } else if (shouldGroupByMonth) {
                // Grouper par mois
                key = `${receiptDate.getFullYear()}-${String(receiptDate.getMonth() + 1).padStart(2, '0')}`;
            } else {
                // Grouper par jour
                key = receiptDate.toISOString().slice(0, 10);
            }

            if (!dataMap.has(key)) {
                dataMap.set(key, { date: key, receptions: 0, sorties: 0 });
            }
            const data = dataMap.get(key)!;
            data.receptions += r.items?.reduce((sum, i) => sum + i.quantity, 0) || 0;
        });

        // Ajouter les sorties
        filteredStockOuts.forEach(s => {
            const stockoutDate = new Date(s.movement_date);
            let key: string;

            if (shouldGroupByYear) {
                // Grouper par année
                key = `${stockoutDate.getFullYear()}`;
            } else if (shouldGroupByMonth) {
                // Grouper par mois
                key = `${stockoutDate.getFullYear()}-${String(stockoutDate.getMonth() + 1).padStart(2, '0')}`;
            } else {
                // Grouper par jour
                key = stockoutDate.toISOString().slice(0, 10);
            }

            if (!dataMap.has(key)) {
                dataMap.set(key, { date: key, receptions: 0, sorties: 0 });
            }
            const data = dataMap.get(key)!;
            data.sorties += s.quantity;
        });

        // Trier par date et formater
        const sorted = Array.from(dataMap.values())
            .sort((a, b) => {
                // Comparer les dates selon le format
                let dateA: Date, dateB: Date;

                if (shouldGroupByYear) {
                    // Format: "2025"
                    dateA = new Date(parseInt(a.date), 0, 1);
                    dateB = new Date(parseInt(b.date), 0, 1);
                } else if (shouldGroupByMonth) {
                    // Format: "2025-11"
                    const [yearA, monthA] = a.date.split('-');
                    const [yearB, monthB] = b.date.split('-');
                    dateA = new Date(parseInt(yearA), parseInt(monthA) - 1, 1);
                    dateB = new Date(parseInt(yearB), parseInt(monthB) - 1, 1);
                } else {
                    // Format: "2025-11-05"
                    dateA = new Date(a.date);
                    dateB = new Date(b.date);
                }

                return dateA.getTime() - dateB.getTime();
            });

        // Formater les dates pour l'affichage
        return sorted.map(d => {
            let formattedDate: string;

            if (shouldGroupByYear) {
                // Format: "2025"
                formattedDate = d.date;
            } else if (shouldGroupByMonth) {
                // Format: "nov. 2025"
                const [year, month] = d.date.split('-');
                const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
                const localeMap: { [key: string]: string } = {
                    'fr': 'fr-FR',
                    'en': 'en-US',
                    'es': 'es-ES'
                };
                const locale = localeMap[settings.language] || 'fr-FR';
                formattedDate = monthDate.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
            } else {
                // Format: "05 nov."
                formattedDate = formatDateForPeriod(d.date, selectedPeriod);
            }

            return {
                date: formattedDate,
                receptions: d.receptions,
                sorties: d.sorties
            };
        });
    }, [filteredReceipts, filteredStockOuts, selectedPeriod, periodStart, periodEnd, settings.language]);

    // Alertes Stock Faible
    const lowStockAlerts = useMemo(() => {
        return products
            .filter(p => p.quantity <= p.critical_level && p.quantity >= 0)
            .map(p => ({
                name: p.name,
                category: p.category,
                current: p.quantity,
                threshold: p.critical_level,
                status: p.quantity === 0 ? 'Critique' : p.quantity <= p.critical_level ? 'Faible' : 'Normal'
            }))
            .sort((a, b) => {
                if (a.status === 'Critique' && b.status !== 'Critique') return -1;
                if (b.status === 'Critique' && a.status !== 'Critique') return 1;
                return a.current - b.current;
            });
    }, [products]);

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

    // Application des tendances calculées
    const trend1 = receiptTrend; // Total Produits: basé sur l'activité de réception
    const trend2 = valueTrend.isUp ? valueTrend : { value: valueTrend.value, isUp: true }; // Valeur Stock: positif si net positif
    const trend3 = alertTrend; // Stock Faible: inversé (plus d'alertes = tendance négative)
    const trend4 = alertTrend; // Ruptures: inversé (plus d'alertes = tendance négative)

    if (loading) {
        return (
            <Layout>
                <div className="p-7">
                    <TopBar />
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Dashboard</h1>
                            <p className="text-emerald-100">Aperçu de votre inventaire en temps réel</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <CalendarDaysIcon className="w-6 h-6 text-emerald-100" />
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-2 py-1">
                                {(['7j', '30j', '3m', '6m', '1an', 'Tout'] as TimePeriod[]).map(period => (
                                    <button
                                        key={period}
                                        onClick={() => setSelectedPeriod(period)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedPeriod === period
                                            ? 'bg-white text-emerald-700 shadow-md'
                                            : 'text-emerald-100 hover:bg-white/10'
                                            }`}
                                    >
                                        {period}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 text-red-700 dark:text-red-400 border-l-4 border-red-500 dark:border-red-400 px-6 py-4 rounded-lg shadow-md">
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Total Produits */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <CubeIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`flex items-center gap-1 ${trend1.isUp ? 'text-green-600' : 'text-red-600'}`}>
                                {trend1.isUp ? (
                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-5 h-5" />
                                )}
                                <span className="text-sm font-semibold">{trend1.value.toFixed(0)}%</span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">TOTAL PRODUITS</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalProducts}</p>
                    </div>

                    {/* Valeur du Stock */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <CurrencyDollarIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`flex items-center gap-1 ${trend2.isUp ? 'text-green-600' : 'text-red-600'}`}>
                                {trend2.isUp ? (
                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-5 h-5" />
                                )}
                                <span className="text-sm font-semibold">{trend2.value.toFixed(0)}%</span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">VALEUR DU STOCK</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white" key={`currency-${settings.language}-${settings.defaultCurrency}`}>{formatCurrency(totalStockValue)}</p>
                    </div>

                    {/* Stock Faible */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`flex items-center gap-1 ${trend3.isUp ? 'text-red-600' : 'text-green-600'}`}>
                                {trend3.isUp ? (
                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-5 h-5" />
                                )}
                                <span className="text-sm font-semibold">{trend3.value.toFixed(0)}%</span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">STOCK FAIBLE</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{lowStockProducts.length}</p>
                    </div>

                    {/* Ruptures */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:scale-105 hover:border-red-300 dark:hover:border-red-600 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <WifiIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className={`flex items-center gap-1 ${trend4.isUp ? 'text-red-600' : 'text-green-600'}`}>
                                {trend4.isUp ? (
                                    <ArrowTrendingUpIcon className="w-5 h-5" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-5 h-5" />
                                )}
                                <span className="text-sm font-semibold">{trend4.value.toFixed(0)}%</span>
                            </div>
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">RUPTURES</p>
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{outOfStockProducts.length}</p>
                    </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Évolution des Stocks */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <CubeIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Évolution des Stocks</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}
                                />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="receptions"
                                    name="→ Réceptions"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ fill: '#10b981', r: 4 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="sorties"
                                    name="→ Sorties"
                                    stroke="#ef4444"
                                    strokeWidth={2}
                                    dot={{ fill: '#ef4444', r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Mouvements de Stock */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <ArrowUpIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Mouvements de Stock</h2>
                        </div>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="date" stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '8px',
                                        padding: '8px'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="receptions" name="Réceptions" fill="#10b981" radius={[8, 8, 0, 0]} />
                                <Bar dataKey="sorties" name="Sorties" fill="#ef4444" radius={[8, 8, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top 5 Produits */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top 5 Produits les Plus Reçus */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <ArrowUpIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top 5 Produits les Plus Reçus</h2>
                        </div>
                        {topReceivedProducts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Aucune réception dans cette période</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topReceivedProducts.map((product, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-md hover:border hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-300 cursor-pointer">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-emerald-600 dark:text-emerald-400">{product.quantity}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">unités</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top 5 Produits les Plus Sortis */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <ArrowDownIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top 5 Produits les Plus Sortis</h2>
                        </div>
                        {topDispatchedProducts.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <p>Aucune sortie dans cette période</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topDispatchedProducts.map((product, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-md hover:border hover:border-red-300 dark:hover:border-red-600 transition-all duration-300 cursor-pointer">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-bold text-gray-900 dark:text-white">{product.name}</p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">{product.category}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-red-600 dark:text-red-400">{product.quantity}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">unités</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Alertes Stock Faible */}
                {lowStockAlerts.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                                <ExclamationTriangleIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alertes Stock Faible</h2>
                        </div>
                        <div className="space-y-3">
                            {lowStockAlerts.map((alert, index) => (
                                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 hover:scale-105 hover:shadow-md hover:border hover:border-orange-300 dark:hover:border-orange-600 transition-all duration-300 cursor-pointer">
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900 dark:text-white">{alert.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{alert.category}</p>
                                    </div>
                                    <div className="text-center mx-4">
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Stock actuel</p>
                                        <p className="font-bold text-gray-900 dark:text-white">{alert.current}/{alert.threshold}</p>
                                    </div>
                                    <div>
                                        <span className={`inline-flex items-center justify-center px-4 py-2 rounded-full text-sm font-semibold ${alert.status === 'Critique'
                                            ? 'bg-red-500 text-white'
                                            : 'bg-orange-500 text-white'
                                            }`}>
                                            {alert.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
