import React, { useEffect, useState, FormEvent } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { PlusIcon, TrashIcon, InboxIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = { id: number; name: string };
type ReceiptRow = { id: number; ref?: string | null; supplier: string | null; agent: string; received_at: string; notes?: string; items_count: number };

type Item = { product_ref?: string; product_name: string; quantity: number; unit_price: number };

export default function ReceiptsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [rows, setRows] = useState<ReceiptRow[]>([]);
    const [supplier, setSupplier] = useState<string>('');
    const [agent, setAgent] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<Item[]>([{ product_ref: '', product_name: '', quantity: 0, unit_price: 0 }]);
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
            console.log('Réceptions chargées:', r);
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


    const addLine = () => setItems([...items, { product_ref: '', product_name: '', quantity: 0, unit_price: 0 }]);
    const updateLine = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeLine = (i: number) => {
        // S'assurer qu'il reste toujours au moins une ligne
        if (items.length > 1) {
            setItems(items.filter((_, idx) => idx !== i));
        } else {
            // Si c'est la dernière ligne, on la remet à vide au lieu de la supprimer
            setItems([{ product_ref: '', product_name: '', quantity: 0, unit_price: 0 }]);
        }
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const filteredItems = items.filter(it => it.product_name.trim() !== '' && it.quantity > 0);

            if (filteredItems.length === 0) {
                setError('Veuillez ajouter au moins un produit avec un nom et une quantité');
                setSuccess('');
                return;
            }

            const payload = {
                supplier,
                agent,
                received_at: date,
                notes,
                items: filteredItems.map(it => {
                    // Chercher le produit par nom
                    const product = products.find(p => p.name.toLowerCase() === it.product_name.toLowerCase().trim());
                    return {
                        product_id: product ? product.id : null,
                        product_ref: (it.product_ref || '').trim() || null,
                        product_name: it.product_name.trim(),
                        quantity: Number(it.quantity),
                        unit_price: Number(it.unit_price)
                    };
                })
            };

            console.log('Envoi de la réception:', payload);
            await getJSON(API('/receipts'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setItems([{ product_ref: '', product_name: '', quantity: 0, unit_price: 0 }]);
            setSupplier('');
            setAgent('');
            setNotes('');
            setSuccess('Réception enregistrée avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'enregistrement:', err);
            setError(err?.message || 'Erreur lors de l\'enregistrement de la réception');
            setSuccess('');
        }
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
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Réception de produits</h1>
                            <p className="text-emerald-100">Enregistrez les réceptions de produits après acquisition</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <InboxIcon className="w-8 h-8 text-white" />
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

                {/* Nouvelle réception form */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 mb-6 -m-6 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <InboxIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Nouvelle réception</h2>
                        </div>
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
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Ajouter une ligne</span>
                                </button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="min-w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-sm font-semibold text-gray-700">Réf. produit</th>
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
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm font-mono text-sm"
                                                        placeholder="ex: REF-ABC123"
                                                        value={it.product_ref || ''}
                                                        onChange={e => updateLine(idx, { product_ref: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        placeholder="Nom du produit"
                                                        value={it.product_name}
                                                        onChange={e => updateLine(idx, { product_name: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        placeholder="Quantité"
                                                        value={it.quantity || ''}
                                                        onChange={e => updateLine(idx, { quantity: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        placeholder="Prix"
                                                        value={it.unit_price || ''}
                                                        onChange={e => updateLine(idx, { unit_price: Number(e.target.value) })}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(idx)}
                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                        aria-label="supprimer"
                                                    >
                                                        <TrashIcon className="w-5 h-5" />
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
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
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
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
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
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Observation */}
                        <div>
                            <label className="text-sm font-semibold mb-2 block">Observation</label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                rows={4}
                                placeholder="Ajouter des commentaires ou observations..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Bouton Enregistrer */}
                        <div className="pt-4 border-t">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                            >
                                <InboxIcon className="w-5 h-5" />
                                <span>Enregistrer la réception</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Historique des réceptions */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <InboxIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Historique des réceptions</h2>
                                <p className="text-sm text-gray-500">{filteredRows.length} réception{filteredRows.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        {/* Search Bar */}
                        <div className="relative w-80">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher réf, fournisseur, agent, observation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                            />
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Fournisseur</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold tabular-nums">Nbre articles</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Date réception</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Agent responsable</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Statut</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                            <InboxIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucune réception trouvée</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(r => (
                                        <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-6 py-5 font-semibold text-gray-900">{r.supplier || 'ND'}</td>
                                            <td className="px-6 py-5 text-left tabular-nums font-medium text-gray-700">{r.items_count}</td>
                                            <td className="px-6 py-5 text-gray-700 font-medium">{formatDate(r.received_at)}</td>
                                            <td className="px-6 py-5 text-gray-700">{r.agent || 'ND'}</td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
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
