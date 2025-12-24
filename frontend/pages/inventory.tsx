import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { PlusIcon, TrashIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon, ArrowTrendingUpIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = { id: number; name: string; quantity: number };
type InventoryRow = {
    id: number;
    agent: string;
    counted_at: string;
    notes?: string;
    items?: InventoryItem[];
};

type InventoryItem = {
    id: number;
    product_id: number;
    product?: { name: string };
    theoretical_qty: number;
    counted_qty: number;
    variance: number;
};

type Item = { product_id: number | ''; counted_qty: number };

export default function InventoryPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [rows, setRows] = useState<InventoryRow[]>([]);
    const [items, setItems] = useState<Item[]>([{ product_id: '', counted_qty: 0 }]);
    const [agent, setAgent] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedVariance, setSelectedVariance] = useState<string>('Tous');
    const [isVarianceDropdownOpen, setIsVarianceDropdownOpen] = useState(false);
    const varianceDropdownRef = useRef<HTMLDivElement>(null);

    // Pagination
    const [inventoryCurrentPage, setInventoryCurrentPage] = useState(1);
    const [inventoryItemsPerPage] = useState(10);

    useEffect(() => {
        if (!date) {
            setDate(new Date().toISOString().slice(0, 10));
        }
    }, []);

    const load = async () => {
        try {
            const p = await getJSON(API('/products')) as any;
            setProducts((p.items || []).map((x: any) => ({ id: x.id, name: x.name, quantity: Number(x.quantity || 0) })));
            const h = await getJSON(API('/inventories')) as any;
            if (h && h.items) {
                setRows(Array.isArray(h.items) ? h.items : []);
            } else {
                setRows(Array.isArray(h) ? h : []);
            }
            setError('');
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
            setRows([]);
            setProducts([]);
        }
    };

    useEffect(() => { load(); }, []);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    // Fermer les dropdowns quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (varianceDropdownRef.current && !varianceDropdownRef.current.contains(event.target as Node)) {
                setIsVarianceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addLine = () => setItems([...items, { product_id: '', counted_qty: 0 }]);
    const updateLine = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeLine = (i: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, idx) => idx !== i));
        } else {
            setItems([{ product_id: '', counted_qty: 0 }]);
        }
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                agent,
                counted_at: date,
                notes,
                items: items.filter(it => it.product_id !== '').map(it => ({
                    product_id: Number(it.product_id),
                    counted_qty: Number(it.counted_qty)
                }))
            };
            await getJSON(API('/inventories'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            setItems([{ product_id: '', counted_qty: 0 }]);
            setAgent('');
            setNotes('');
            setSuccess('Inventaire enregistré avec succès!');
            load();
        } catch (err: any) {
            setError(err?.message || 'Erreur');
            setSuccess('');
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
        } catch {
            return 'N/A';
        }
    };

    // Filtrer les inventaires
    const filteredRows = rows.filter(inv => {
        // Filtre par recherche (produit, agent)
        const matchesSearch = searchQuery === '' ||
            inv.agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.items?.some(item => {
                const product = products.find(p => p.id === item.product_id);
                return product?.name.toLowerCase().includes(searchQuery.toLowerCase());
            });

        // Filtre par date
        const matchesDate = selectedDate === '' ||
            (inv.counted_at && new Date(inv.counted_at).toISOString().slice(0, 10) === selectedDate);

        // Filtre par écart (variance)
        const matchesVariance = selectedVariance === 'Tous' ||
            (selectedVariance === 'Positif' && inv.items?.some(item => item.variance > 0)) ||
            (selectedVariance === 'Négatif' && inv.items?.some(item => item.variance < 0)) ||
            (selectedVariance === 'Conforme' && inv.items?.every(item => item.variance === 0));

        return matchesSearch && matchesDate && matchesVariance;
    });

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Inventaire</h1>
                            <p className="text-purple-100">Enregistrez les comptages d'inventaire et ajustez les stocks</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ClipboardDocumentListIcon className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-l-4 border-red-500 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{error}</span>
                        <button type="button" onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-200 text-red-700 hover:text-red-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-l-4 border-emerald-500 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{success}</span>
                        <button type="button" onClick={() => setSuccess('')} className="ml-4 p-1 rounded-full hover:bg-emerald-200 text-emerald-700 hover:text-emerald-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Nouvel inventaire form */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl p-6 mb-6 -m-6 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Nouvel inventaire</h2>
                        </div>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        {/* Champs de base */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Agent responsable <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
                                    placeholder="Nom de l'agent"
                                    value={agent}
                                    onChange={e => setAgent(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Date d'inventaire <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        {/* Produits */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-sm font-semibold">
                                    Produits <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg hover:from-purple-700 hover:to-indigo-800 transition-all transform hover:scale-105 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Ajouter une ligne</span>
                                </button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="space-y-3 p-4">
                                    {items.map((it, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="relative flex-1">
                                                <select
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm bg-white"
                                                    value={String(it.product_id || '')}
                                                    onChange={e => updateLine(idx, { product_id: e.target.value ? Number(e.target.value) : '' })}
                                                    required
                                                >
                                                    <option value="">Sélectionner un produit</option>
                                                    {products.map(p => (
                                                        <option key={p.id} value={p.id} disabled={p.quantity < 0}>
                                                            {`${p.name} (Stock: ${p.quantity})`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                            <input
                                                type="number"
                                                className="w-50 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm"
                                                placeholder="Quantité comptée"
                                                value={it.counted_qty || ''}
                                                onChange={e => updateLine(idx, { counted_qty: Number(e.target.value) })}
                                                min="0"
                                                required
                                            />
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeLine(idx)}
                                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Observation */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block">Observation</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all shadow-sm resize-none"
                                rows={4}
                                placeholder="Commentaires sur cet inventaire..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Bouton Enregistrer */}
                        <div className="pt-4 border-t">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-indigo-800 transition-all transform hover:scale-105 font-medium"
                            >
                                <ClipboardDocumentListIcon className="w-5 h-5" />
                                <span>Enregistrer l'inventaire</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Search and Filters */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par produit ou agent..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setInventoryCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                            />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setInventoryCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 min-w-[150px] shadow-sm transition-all"
                            />
                        </div>

                        {/* Variance/Ecart Filter */}
                        <div className="relative" ref={varianceDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVarianceDropdownOpen(!isVarianceDropdownOpen);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between shadow-sm"
                            >
                                <span className="font-medium">{selectedVariance === 'Tous' ? 'Tous les écarts' : selectedVariance}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {isVarianceDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariance('Tous');
                                            setIsVarianceDropdownOpen(false);
                                            setInventoryCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedVariance === 'Tous' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Tous les écarts
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariance('Positif');
                                            setIsVarianceDropdownOpen(false);
                                            setInventoryCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedVariance === 'Positif' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Positif
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariance('Négatif');
                                            setIsVarianceDropdownOpen(false);
                                            setInventoryCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedVariance === 'Négatif' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Négatif
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariance('Conforme');
                                            setIsVarianceDropdownOpen(false);
                                            setInventoryCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedVariance === 'Conforme' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Conforme
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Historique des inventaires */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                            <ClipboardDocumentListIcon className="w-6 h-6 text-purple-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Historique des inventaires</h2>
                            <p className="text-sm text-gray-500">{filteredRows.reduce((acc, inv) => acc + (inv.items?.length || 0), 0)} entrée{filteredRows.reduce((acc, inv) => acc + (inv.items?.length || 0), 0) > 1 ? 's' : ''}</p>
                        </div>
                        {filteredRows.length > inventoryItemsPerPage && (
                            <p className="text-sm text-gray-600">
                                {((inventoryCurrentPage - 1) * inventoryItemsPerPage + 1)} - {Math.min(inventoryCurrentPage * inventoryItemsPerPage, filteredRows.length)} sur {filteredRows.length}
                            </p>
                        )}
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 border-b-2 border-purple-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Date</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Produit</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Stock théorique</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité comptée</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Écart</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Agent</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Observation</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucun inventaire trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows
                                        .map(inv => {
                                        return inv.items?.map((item, itemIdx) => {
                                            const product = products.find(p => p.id === item.product_id);
                                            return (
                                                <tr key={`${inv.id}-${item.id}`} className="border-t hover:bg-purple-50 transition-colors">
                                                    <td className="px-6 py-5 font-medium text-gray-700">{formatDate(inv.counted_at)}</td>
                                                    <td className="px-6 py-5 font-semibold text-gray-900">{product?.name || `Produit #${item.product_id}`}</td>
                                                    <td className="px-6 py-5 text-gray-700">{item.theoretical_qty}</td>
                                                    <td className="px-6 py-5 text-gray-700 font-medium">{item.counted_qty}</td>
                                                    <td className="px-6 py-5">
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${item.variance < 0
                                                            ? 'bg-gradient-to-r from-red-600 to-red-700 text-white'
                                                            : item.variance > 0
                                                                ? 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                                                                : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                                                            }`}>
                                                            {item.variance > 0 ? '+' : ''}{item.variance}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-gray-700">{inv.agent || 'ND'}</td>
                                                    <td className="px-6 py-5 text-gray-600">{inv.notes || '-'}</td>
                                                    <td className="px-6 py-5">
                                                        <button
                                                            className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                            aria-label="supprimer"
                                                        >
                                                            <TrashIcon className="w-5 h-5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) || [];
                                        })
                                        .flat()
                                        .slice((inventoryCurrentPage - 1) * inventoryItemsPerPage, inventoryCurrentPage * inventoryItemsPerPage)
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredRows.length > inventoryItemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setInventoryCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={inventoryCurrentPage === 1}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        inventoryCurrentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredRows.length / inventoryItemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const totalPages = Math.ceil(filteredRows.length / inventoryItemsPerPage);
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - inventoryCurrentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const totalPages = Math.ceil(filteredRows.length / inventoryItemsPerPage);
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;
                                            
                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setInventoryCurrentPage(page)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${
                                                            inventoryCurrentPage === page
                                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white shadow-lg'
                                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                                        }`}
                                                    >
                                                        {page}
                                                    </button>
                                                    {showEllipsisAfter && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                </div>
                                <button
                                    onClick={() => setInventoryCurrentPage(prev => Math.min(Math.ceil(filteredRows.length / inventoryItemsPerPage), prev + 1))}
                                    disabled={inventoryCurrentPage >= Math.ceil(filteredRows.length / inventoryItemsPerPage)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        inventoryCurrentPage >= Math.ceil(filteredRows.length / inventoryItemsPerPage)
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                >
                                    <span>Suivant</span>
                                    <ChevronRightIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
