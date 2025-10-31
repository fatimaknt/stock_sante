import React, { useEffect, useState, FormEvent } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { PlusIcon, TrashIcon, InboxIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = { id: number; name: string };
type ReceiptRow = { id: number; supplier: string | null; agent: string; received_at: string; notes?: string; items_count: number };

type Item = { product_name: string; quantity: number; unit_price: number };

export default function ReceiptsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [rows, setRows] = useState<ReceiptRow[]>([]);
    const [supplier, setSupplier] = useState<string>('');
    const [agent, setAgent] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<Item[]>([{ product_name: '', quantity: 0, unit_price: 0 }]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');

    // Initialize date on client side only
    useEffect(() => {
        if (!date) {
            setDate(new Date().toISOString().slice(0, 10));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = async () => {
        try {
            const p = await getJSON(API('/products')) as any;
            setProducts((p.items || []).map((x: any) => ({ id: x.id, name: x.name })));
            const r = await getJSON(API('/receipts')) as any;
            setRows(Array.isArray(r) ? r : []);
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


    const addLine = () => setItems([...items, { product_name: '', quantity: 0, unit_price: 0 }]);
    const updateLine = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeLine = (i: number) => {
        // S'assurer qu'il reste toujours au moins une ligne
        if (items.length > 1) {
            setItems(items.filter((_, idx) => idx !== i));
        } else {
            // Si c'est la dernière ligne, on la remet à vide au lieu de la supprimer
            setItems([{ product_name: '', quantity: 0, unit_price: 0 }]);
        }
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                supplier,
                agent,
                received_at: date,
                notes,
                items: items.filter(it => it.product_name.trim() !== '' && it.quantity > 0).map(it => {
                    // Chercher le produit par nom
                    const product = products.find(p => p.name.toLowerCase() === it.product_name.toLowerCase().trim());
                    return {
                        product_id: product ? product.id : null,
                        product_name: it.product_name.trim(),
                        quantity: Number(it.quantity),
                        unit_price: Number(it.unit_price)
                    };
                })
            };
            await getJSON(API('/receipts'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setItems([{ product_name: '', quantity: 0, unit_price: 0 }]);
            setSupplier('');
            setAgent('');
            setNotes('');
            setSuccess('Réception enregistrée avec succès!');
            load();
        } catch (err: any) { setError(err?.message || 'Erreur'); setSuccess(''); }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
        } catch {
            return 'N/A';
        }
    };

    // Filtrer les réceptions
    const filteredRows = rows.filter(row => {
        // Filtre par recherche (fournisseur, agent, notes)
        const matchesSearch = searchQuery === '' ||
            row.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.notes?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Réception de produits</h1>
                    <p className="text-gray-500">Enregistrez les réceptions de produits après acquisition</p>
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

                {/* Nouvelle réception form */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <InboxIcon className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-2xl font-bold">Nouvelle réception</h2>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        {/* Produits à recevoir */}
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-semibold">
                                    Produits à recevoir <span className="text-red-500">*</span>
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
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Nom du produit</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Quantité</th>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Prix unitaire</th>
                                            <th className="w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((it, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full border rounded-lg px-3 py-2"
                                                        placeholder="Nom du produit"
                                                        value={it.product_name}
                                                        onChange={e => updateLine(idx, { product_name: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        className="w-full border rounded-lg px-3 py-2"
                                                        placeholder="Quantité"
                                                        value={it.quantity || ''}
                                                        onChange={e => updateLine(idx, { quantity: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full border rounded-lg px-3 py-2"
                                                        placeholder="Prix"
                                                        value={it.unit_price || ''}
                                                        onChange={e => updateLine(idx, { unit_price: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(idx)}
                                                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors"
                                                        aria-label="supprimer"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Autres champs */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Fournisseur <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Nom du fournisseur"
                                    value={supplier}
                                    onChange={e => setSupplier(e.target.value)}
                                    required
                                />
                            </div>
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
                                <label className="text-sm font-semibold mb-2 block">Date de réception</label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Observation */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block">Observation</label>
                            <textarea
                                className="w-full border rounded-lg px-3 py-2"
                                rows={4}
                                placeholder="Ajouter des commentaires ou observations..."
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
                                <InboxIcon className="w-5 h-5" />
                                <span className="font-medium">Enregistrer la réception</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Historique des réceptions */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold">Historique des réceptions ({filteredRows.length})</h2>
                        {/* Search Bar */}
                        <div className="relative w-80">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher fournisseur, agent, observation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Fournisseur</th>
                                    <th className="text-left px-6 py-6 text-gray-600 font-semibold tabular-nums">Nbre articles</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Date réception</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Agent responsable</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                                            Aucune réception trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(r => (
                                        <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-3 py-4">{r.supplier || 'ND'}</td>
                                            <td className="px-6 py-4 text-left tabular-nums">{r.items_count}</td>
                                            <td className="px-3 py-4">{formatDate(r.received_at)}</td>
                                            <td className="px-3 py-4">{r.agent || 'ND'}</td>
                                            <td className="px-3 py-4">
                                                <span className="inline-flex items-center justify-center px-5 py-1 rounded-full text-[13px] leading-5 font-semibold text-white shadow-sm ring-1 ring-black/5 bg-emerald-600">
                                                    Complétée
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
