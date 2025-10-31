import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { ArrowRightOnRectangleIcon, PlusIcon, TrashIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';

type Product = { id: number; name: string; quantity: number };
type StockOutRow = {
    id: number;
    product_id: number;
    product?: { name: string };
    quantity: number;
    beneficiary?: string;
    agent?: string;
    notes?: string;
    movement_date: string;
    exit_type?: string;
    status?: string;
};

type TopBeneficiary = {
    beneficiary: string;
    productCount: number;
    exitCount: number;
    totalUnits: number;
};

type Item = { product_id: number | ''; quantity: number };

export default function StockOutPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [rows, setRows] = useState<StockOutRow[]>([]);
    const [topBeneficiaries, setTopBeneficiaries] = useState<TopBeneficiary[]>([]);
    const [items, setItems] = useState<Item[]>([{ product_id: '', quantity: 0 }]);
    const [beneficiary, setBeneficiary] = useState<string>('');
    const [exitType, setExitType] = useState<string>('Définitive');
    const [notes, setNotes] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('Tous');
    const [selectedStatus, setSelectedStatus] = useState<string>('Tous');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const typeDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!date) {
            setDate(new Date().toISOString().slice(0, 10));
        }
    }, []);

    const load = async () => {
        try {
            const p = await getJSON(API('/products')) as any;
            setProducts((p.items || []).map((x: any) => ({ id: x.id, name: x.name, quantity: Number(x.quantity ?? 0) })));
            const s = await getJSON(API('/stockouts')) as any;
            setRows(Array.isArray(s) ? s : []);

            // Calculer les top 5 bénéficiaires
            const beneficiaryMap = new Map<string, { productIds: Set<number>, exitCount: number, totalUnits: number }>();
            s.forEach((r: StockOutRow) => {
                if (r.beneficiary) {
                    const key = r.beneficiary;
                    if (!beneficiaryMap.has(key)) {
                        beneficiaryMap.set(key, { productIds: new Set(), exitCount: 0, totalUnits: 0 });
                    }
                    const data = beneficiaryMap.get(key)!;
                    if (r.product_id) data.productIds.add(r.product_id);
                    data.exitCount++;
                    data.totalUnits += r.quantity || 0;
                }
            });

            const top5: TopBeneficiary[] = Array.from(beneficiaryMap.entries())
                .map(([beneficiary, data]) => ({
                    beneficiary,
                    productCount: data.productIds.size,
                    exitCount: data.exitCount,
                    totalUnits: data.totalUnits
                }))
                .sort((a, b) => b.totalUnits - a.totalUnits)
                .slice(0, 5);

            setTopBeneficiaries(top5);
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
            if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) {
                setIsTypeDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addLine = () => setItems([...items, { product_id: '', quantity: 0 }]);
    const updateLine = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeLine = (i: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, idx) => idx !== i));
        } else {
            setItems([{ product_id: '', quantity: 0 }]);
        }
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        try {
            // Envoyer chaque produit séparément
            const promises = items
                .filter(it => it.product_id !== '' && it.quantity > 0)
                .map(it => getJSON(API('/stockouts'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        product_id: Number(it.product_id),
                        quantity: Number(it.quantity),
                        beneficiary: beneficiary.trim(),
                        movement_date: date,
                        exit_type: exitType,
                        notes: notes.trim(),
                        status: exitType === 'Provisoire' ? null : 'Complétée'
                    })
                }));

            await Promise.all(promises);
            setItems([{ product_id: '', quantity: 0 }]);
            setBeneficiary('');
            setExitType('Définitive');
            setNotes('');
            setSuccess('Sortie enregistrée avec succès!');
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

    const getTypeColor = (type: string | undefined) => {
        switch (type) {
            case 'Définitive':
                return 'bg-red-500 text-white';
            case 'Affectation':
                return 'bg-purple-500 text-white';
            case 'Provisoire':
                return 'bg-blue-500 text-white';
            default:
                return 'bg-gray-500 text-white';
        }
    };

    const getStatusColor = (status: string | undefined) => {
        if (status === 'Retournée') return 'bg-green-500 text-white';
        if (status === 'Complétée') return 'bg-green-500 text-white';
        return 'bg-gray-100 text-gray-700';
    };

    // Filtrer les sorties
    const filteredRows = rows.filter(row => {
        // Filtre par recherche (produit, bénéficiaire)
        const product = products.find(p => p.id === row.product_id);
        const matchesSearch = searchQuery === '' ||
            product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.beneficiary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.notes?.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtre par type
        const matchesType = selectedType === 'Tous' || row.exit_type === selectedType;

        // Filtre par statut
        const matchesStatus = selectedStatus === 'Tous' ||
            (selectedStatus === 'Aucun' && !row.status) ||
            row.status === selectedStatus;

        // Filtre par date
        const matchesDate = selectedDate === '' ||
            (row.movement_date && new Date(row.movement_date).toISOString().slice(0, 10) === selectedDate);

        return matchesSearch && matchesType && matchesStatus && matchesDate;
    });

    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div>
                    <h1 className="text-4xl font-bold mb-2">Sortie de Stock</h1>
                    <p className="text-gray-500">Enregistrez les sorties de produits du stock</p>
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

                {/* Top 5 Bénéficiaires */}
                {topBeneficiaries.length > 0 && (
                    <div className="bg-white border rounded-lg shadow-md p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-600" />
                            <h2 className="text-2xl font-bold">Top 5 Bénéficiaires - Sorties Définitives</h2>
                        </div>
                        <div className="space-y-3">
                            {topBeneficiaries.map((ben, idx) => (
                                <div key={idx} className="bg-gray-50 border rounded-lg p-4 flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900">{ben.beneficiary}</div>
                                        <div className="text-sm text-gray-500">{ben.productCount} produits • {ben.exitCount} sorties</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-gray-900">{ben.totalUnits}</div>
                                        <div className="text-sm text-gray-500">unités</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Nouvelle sortie form */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <ArrowRightOnRectangleIcon className="w-6 h-6 text-emerald-600" />
                        <h2 className="text-2xl font-bold">Nouvelle sortie</h2>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        {/* Champs de base */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Bénéficiaire <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="Nom du bénéficiaire"
                                    value={beneficiary}
                                    onChange={e => setBeneficiary(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Date de sortie <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Type de sortie <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2"
                                    value={exitType}
                                    onChange={e => setExitType(e.target.value)}
                                    required
                                >
                                    <option value="Définitive">Définitive</option>
                                    <option value="Affectation">Affectation</option>
                                    <option value="Provisoire">Provisoire</option>
                                </select>
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
                                                className="flex-1 border rounded-lg px-3 py-3"
                                                value={String(it.product_id || '')}
                                                onChange={e => updateLine(idx, { product_id: e.target.value ? Number(e.target.value) : '' })}
                                                required
                                            >
                                                <option value="">Sélectionner un produit</option>
                                                {products.map(p => (
                                                    <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                                                        {`${p.name} (Stock: ${p.quantity})`}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                type="number"
                                                className="w-32 border rounded-lg px-3 py-2"
                                                placeholder="Quantité"
                                                value={it.quantity || ''}
                                                onChange={e => updateLine(idx, { quantity: Number(e.target.value) })}
                                                min="1"
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
                                placeholder="Commentaires sur cette sortie..."
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
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                <span className="font-medium">Enregistrer la sortie</span>
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
                                placeholder="Rechercher par produit, bénéficiaire ou observation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* Type Filter */}
                        <div className="relative" ref={typeDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsTypeDropdownOpen(!isTypeDropdownOpen);
                                    setIsStatusDropdownOpen(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
                            >
                                <span>{selectedType === 'Tous' ? 'Tous les types' : selectedType}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {isTypeDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedType('Tous');
                                            setIsTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedType === 'Tous' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Tous les types
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedType('Définitive');
                                            setIsTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedType === 'Définitive' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Définitive
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedType('Affectation');
                                            setIsTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedType === 'Affectation' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Affectation
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedType('Provisoire');
                                            setIsTypeDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedType === 'Provisoire' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Provisoire
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                    setIsTypeDropdownOpen(false);
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
                                            setSelectedStatus('Complétée');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Complétée' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Complétée
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('Retournée');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Retournée' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Retournée
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('Aucun');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Aucun' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Aucun statut
                                    </button>
                                </div>
                            )}
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
                    </div>
                </div>

                {/* Historique des sorties */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6">Historique des sorties ({filteredRows.length})</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Date</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Produit</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Quantité</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Bénéficiaire</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Type</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Statut</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Observation</th>
                                    <th className="text-left px-3 py-5 text-gray-600 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-3 py-8 text-center text-gray-500">
                                            Aucune sortie trouvée
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(r => {
                                        const product = products.find(p => p.id === r.product_id);
                                        return (
                                            <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                                <td className="px-3 py-4">{formatDate(r.movement_date)}</td>
                                                <td className="px-3 py-4">{product?.name || `Produit #${r.product_id}`}</td>
                                                <td className="px-3 py-4">{r.quantity}</td>
                                                <td className="px-3 py-4">{r.beneficiary || 'ND'}</td>
                                                <td className="px-3 py-4">
                                                    {r.exit_type && (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-[13px] leading-5 font-semibold text-white shadow-sm ring-1 ring-black/5 ${getTypeColor(r.exit_type)}`}>
                                                            {r.exit_type}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4">
                                                    {r.status && (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1 rounded-full text-[13px] leading-5 font-semibold shadow-sm ring-1 ring-black/5 ${getStatusColor(r.status) || 'bg-gray-100 text-gray-700'}`}>
                                                            {r.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-4">{r.notes || '-'}</td>
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
