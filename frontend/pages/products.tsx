import React, { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = {
    id: number;
    name: string;
    category: string;
    category_id?: number | null;
    quantity: number;
    price: number;
    critical_level: number;
    status: string;
    supplier?: string | null;
    acquirer?: string | null;
    beneficiary?: string | null;
    acquired_at?: string | null;
};

type Category = { id: number; name: string };

const CATEGORIES_FALLBACK: Category[] = [
    { id: 1, name: 'Consommable Informatique' },
    { id: 2, name: 'Matériel informatique' },
    { id: 3, name: 'Médicaments' },
    { id: 4, name: 'Mobilier de bureau' },
    { id: 5, name: "Produits d'entretien" },
];

export default function ProductsPage(): JSX.Element {
    const [items, setItems] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Tous');
    const [isOpen, setIsOpen] = useState(false);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ name: '', category_id: '', quantity: 0, price: 0, critical_level: 10, supplier: '', acquirer: '', beneficiary: '', acquired_at: '' });
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    const filtered = useMemo(() => {
        return items.filter(p => {
            // Filtre par recherche (nom, catégorie)
            const matchesSearch = search === '' ||
                [p.name, p.category].join(' ').toLowerCase().includes(search.toLowerCase());

            // Filtre par statut
            const statusLabel = getStatusLabel(p);
            const matchesStatus = selectedStatus === 'Tous' || statusLabel === selectedStatus;

            return matchesSearch && matchesStatus;
        });
    }, [items, search, selectedStatus]);

    const load = async () => {
        try {
            const [p, c] = await Promise.all([
                getJSON(API('/products')) as Promise<any>,
                getJSON(API('/categories')).catch(() => CATEGORIES_FALLBACK) as Promise<any>
            ]);
            setItems(p.items || []);
            setCategories(Array.isArray(c) ? c : CATEGORIES_FALLBACK);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'Erreur de chargement');
            setSuccess('');
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
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const openCreate = () => { setEditing(null); setForm({ name: '', category_id: '', quantity: 0, price: 0, critical_level: 10, supplier: '', acquirer: '', beneficiary: '', acquired_at: '' }); setIsOpen(true); };
    const openEdit = (p: Product) => {
        const catId = p.category_id || categories.find(c => c.name === p.category)?.id;
        const supplierValue = (p.supplier === null || p.supplier === undefined) ? '' : String(p.supplier);
        setEditing(p);
        setForm({
            name: p.name || '',
            category_id: catId ? String(catId) : '',
            quantity: p.quantity || 0,
            price: p.price || 0,
            critical_level: p.critical_level || 10,
            supplier: supplierValue,
            acquirer: (p.acquirer === null || p.acquirer === undefined) ? '' : String(p.acquirer),
            beneficiary: (p.beneficiary === null || p.beneficiary === undefined) ? '' : String(p.beneficiary),
            acquired_at: p.acquired_at ? p.acquired_at.split('T')[0] : ''
        });
        setIsOpen(true);
    };
    const closeModal = () => setIsOpen(false);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        try {
            const payload = { ...form, category_id: form.category_id ? Number(form.category_id) : null } as any;
            if (editing) {
                await getJSON(API(`/products/${editing.id}`), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                setSuccess('Produit mis à jour avec succès');
            } else {
                await getJSON(API('/products'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
                setSuccess('Produit ajouté avec succès');
            }
            closeModal();
            load();
        } catch (err: any) { setError(err?.message || 'Erreur'); setSuccess(''); }
    };

    const remove = async (id: number) => {
        try {
            await getJSON(API(`/products/${id}`), { method: 'DELETE' });
            setSuccess('Produit supprimé');
            setConfirmId(null);
            load();
        } catch (err: any) { setError(err?.message || 'Erreur'); setSuccess(''); }
    };

    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Gestion des Produits</h1>
                        <p className="text-gray-500">Gérez votre inventaire de produits</p>
                    </div>
                    <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800">
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full border border-white/60">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3.5 h-3.5 text-white"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14M5 12h14" /></svg>
                        </span>
                        Ajouter un produit
                    </button>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-4 text-red-700 hover:text-red-900">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} className="ml-4 text-emerald-700 hover:text-emerald-900">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* Table card */}
                <div className="bg-white border rounded-lg shadow-md p-6 m-2">
                    <div className="flex items-center justify-between px-4 py-2 border-b pb-7">
                        <h3 className="text-2xl font-semibold ">Liste des produits ({filtered.length})</h3>
                        <div className="flex items-center gap-4">
                            {/* Search Bar */}
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Rechercher par nom ou catégorie..."
                                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-80"
                                />
                            </div>

                            {/* Status Filter */}
                            <div className="relative" ref={statusDropdownRef}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                    }}
                                    className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
                                >
                                    <span>{selectedStatus === 'Tous' ? 'Tous les statuts' : selectedStatus}</span>
                                    <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                </button>
                                {isStatusDropdownOpen && (
                                    <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus('Tous');
                                                setIsStatusDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Tous' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                        >
                                            Tous les statuts
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus('Normal');
                                                setIsStatusDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Normal' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                        >
                                            Normal
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus('Faible');
                                                setIsStatusDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Faible' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                        >
                                            Faible
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedStatus('Critique');
                                                setIsStatusDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Critique' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                        >
                                            Critique
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <table className="min-w-full text-md">
                        <thead className="bg-gray-50">
                            <tr>{['Nom', 'Catégorie', 'Quantité', 'Prix', 'Statut', 'Actions'].map((h, i) => (<th key={i} className="text-left px-3 py-5 text-gray-600">{h}</th>))}</tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                                        Aucun produit trouvé
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(r => (
                                    <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                        <td className="px-3 py-4">{r.name}</td>
                                        <td className="px-3 py-4">{r.category}</td>
                                        <td className="px-3 py-4">{r.quantity}</td>
                                        <td className="px-3 py-4">€{Number(r.price).toFixed(2)}</td>
                                        <td className="px-3 py-4">
                                            {(() => {
                                                const label = getStatusLabel(r);
                                                const color = label === 'Normal' ? 'bg-[#23865A]' : label === 'Faible' ? 'bg-[#F59E0B]' : 'bg-[#DC2626]';
                                                return (
                                                    <span className={`inline-flex items-center justify-center px-5 py-1 rounded-full text-[13px] leading-5 font-semibold text-white shadow-sm ring-1 ring-black/5 ${color}`}>
                                                        {label}
                                                    </span>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => openEdit(r)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 transition-colors" aria-label="éditer">
                                                    <svg className="w-4 h-4 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                    </svg>
                                                </button>
                                                <button onClick={() => setConfirmId(r.id)} className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white shadow-sm hover:bg-red-50 transition-colors" aria-label="supprimer">
                                                    <svg className="w-4 h-4 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
                        <div className="relative bg-white w-full max-w-2xl rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">{editing ? 'Modifier un produit' : 'Ajouter un nouveau produit'}</h3>
                                <button onClick={closeModal} className="p-2 rounded hover:bg-gray-100" aria-label="fermer">✕</button>
                            </div>
                            <form onSubmit={submit} className="grid grid-cols-6 gap-3">
                                <div className="col-span-6">
                                    <label className="text-sm">Nom du produit *</label>
                                    <input className="w-full border rounded-lg px-3 py-2" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Laptop Dell XPS" />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm">Catégorie *</label>
                                    <div className="relative">
                                        <select className="w-full border rounded-lg px-3 py-2 appearance-none" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                            <option value="">Sélectionnez une catégorie</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <svg className="w-5 h-5 absolute right-3 top-2.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 11.188l3.71-3.96a.75.75 0 011.08 1.04l-4.24 4.53a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" /></svg>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm">Quantité *</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm">Prix (€) *</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm">Seuil critique</label>
                                    <input type="number" className="w-full border rounded-lg px-3 py-2" value={form.critical_level} onChange={e => setForm({ ...form, critical_level: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm">Fournisseur</label>
                                    <input className="w-full border rounded-lg px-3 py-2" placeholder="Nom du fournisseur" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm">Acquéreur</label>
                                    <input className="w-full border rounded-lg px-3 py-2" placeholder="Nom de l'acquéreur" value={form.acquirer} onChange={e => setForm({ ...form, acquirer: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm">Bénéficiaire</label>
                                    <input className="w-full border rounded-lg px-3 py-2" placeholder="Nom du bénéficiaire" value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm">Date d'acquisition</label>
                                    <input type="date" className="w-full border rounded-lg px-3 py-2" value={form.acquired_at} onChange={e => setForm({ ...form, acquired_at: e.target.value })} />
                                </div>
                                <div className="col-span-6 flex items-center justify-end gap-3 mt-2">
                                    <button type="button" onClick={closeModal} className="px-4 py-2 rounded-lg border bg-white text-gray-700">Annuler</button>
                                    <button className="px-4 py-2 rounded-lg bg-emerald-700 text-white">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Confirm delete modal */}
                {confirmId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center">
                        <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmId(null)} />
                        <div className="relative bg-white w-full max-w-md rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold mb-2">Confirmer la suppression</h3>
                            <p className="text-gray-600 mb-4">Voulez-vous vraiment supprimer ce produit ? Cette action est irréversible.</p>
                            <div className="flex items-center justify-end gap-3">
                                <button onClick={() => setConfirmId(null)} className="px-4 py-2 rounded-lg border bg-white text-gray-700">Annuler</button>
                                <button onClick={() => remove(confirmId!)} className="px-4 py-2 rounded-lg bg-red-600 text-white">Supprimer</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout >
    );
}

function getStatusLabel(p: { quantity: number; critical_level: number }): 'Normal' | 'Faible' | 'Critique' {
    if (p.quantity <= 0) return 'Critique';
    if (p.quantity <= p.critical_level) return 'Faible';
    return 'Normal';
}
