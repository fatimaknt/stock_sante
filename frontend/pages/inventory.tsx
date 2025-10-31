import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { PlusIcon, TrashIcon, ClipboardDocumentListIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
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
            setRows(Array.isArray(h) ? h : []);
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
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Inventaire</h1>
                    <p className="text-gray-500">Enregistrez les comptages d'inventaire et ajustez les stocks</p>
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

                {success && (
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{success}</span>
                        <button type="button" onClick={() => setSuccess('')} className="ml-4 p-1 rounded-full hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Nouvel inventaire form */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <ClipboardDocumentListIcon className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-2xl font-bold">Nouvel inventaire</h2>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        {/* Champs de base */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Agent responsable <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
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
                                    className="w-full border rounded-lg px-3 py-2"
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
                                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span className="text-sm font-medium">Ajouter une ligne</span>
                                </button>
                            </div>
                            <div className="border rounded-lg overflow-hidden">
                                <div className="space-y-3 p-4">
                                    {items.map((it, idx) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <select
                                                className="flex-1 border rounded-lg px-3 py-2"
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
                                            <input
                                                type="number"
                                                className="w-50 border rounded-lg px-3 py-2"
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
                                                    className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
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
                                className="w-full border rounded-lg px-3 py-2"
                                rows={4}
                                placeholder="Commentaires sur cet inventaire..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Bouton Enregistrer */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors"
                            >
                                <ClipboardDocumentListIcon className="w-5 h-5" />
                                <span className="font-medium">Enregistrer l'inventaire</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Search and Filters */}
                <div className="bg-white border rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par produit ou agent..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[150px]"
                            />
                        </div>

                        {/* Variance/Ecart Filter */}
                        <div className="relative" ref={varianceDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsVarianceDropdownOpen(!isVarianceDropdownOpen);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
                            >
                                <span>{selectedVariance === 'Tous' ? 'Tous les écarts' : selectedVariance}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {isVarianceDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedVariance('Tous');
                                            setIsVarianceDropdownOpen(false);
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
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6">Historique des inventaires ({filteredRows.reduce((acc, inv) => acc + (inv.items?.length || 0), 0)})</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Date</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Produit</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Stock théorique</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Quantité comptée</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Écart</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Agent</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Observation</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                                            Aucun inventaire trouvé
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(inv => {
                                        return inv.items?.map((item, itemIdx) => {
                                            const product = products.find(p => p.id === item.product_id);
                                            return (
                                                <tr key={`${inv.id}-${item.id}`} className="border-t hover:bg-emerald-50 transition-colors">
                                                    <td className="px-3 py-4">{formatDate(inv.counted_at)}</td>
                                                    <td className="px-3 py-4">{product?.name || `Produit #${item.product_id}`}</td>
                                                    <td className="px-3 py-4">{item.theoretical_qty}</td>
                                                    <td className="px-3 py-4">{item.counted_qty}</td>
                                                    <td className={`px-3 py-4 font-semibold ${item.variance < 0 ? 'text-red-600' : item.variance > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                                        {item.variance > 0 ? '+' : ''}{item.variance}
                                                    </td>
                                                    <td className="px-3 py-4">{inv.agent || 'ND'}</td>
                                                    <td className="px-3 py-4">{inv.notes || '-'}</td>
                                                    <td className="px-3 py-4">
                                                        <button
                                                            className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                                                            aria-label="supprimer"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        }) || [];
                                    }).flat()
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
