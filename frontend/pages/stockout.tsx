import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { ArrowRightOnRectangleIcon, PlusIcon, TrashIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline';
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
            // Ne pas effacer les messages de succès/erreur lors du chargement
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
        setError('');
        setSuccess('');

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
            setError(''); // S'assurer que l'erreur est effacée
            await load();
        } catch (err: any) {
            console.error('Erreur lors de la sauvegarde:', err);
            // Extraire le message d'erreur
            let errorMessage = 'Erreur lors de l\'enregistrement de la sortie';

            if (err?.message) {
                errorMessage = err.message;
            } else if (typeof err === 'string') {
                errorMessage = err;
            }

            setError(errorMessage);
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
                return 'bg-gradient-to-r from-red-600 to-red-700 text-white';
            case 'Affectation':
                return 'bg-gradient-to-r from-purple-600 to-purple-700 text-white';
            case 'Provisoire':
                return 'bg-gradient-to-r from-blue-600 to-blue-700 text-white';
            default:
                return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white';
        }
    };

    const getStatusColor = (status: string | undefined) => {
        if (status === 'Retournée') return 'bg-gradient-to-r from-green-600 to-green-700 text-white';
        if (status === 'Complétée') return 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white';
        return 'bg-gradient-to-r from-gray-600 to-gray-700 text-white';
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
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Sortie de Stock</h1>
                            <p className="text-red-100">Enregistrez les sorties de produits du stock</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ArrowRightOnRectangleIcon className="w-8 h-8 text-white" />
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

                {/* Top 5 Bénéficiaires */}
                {topBeneficiaries.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Top 5 Bénéficiaires</h2>
                                <p className="text-sm text-gray-500">Sorties définitives</p>
                            </div>
                        </div>
                        <div className="space-y-3">
                            {topBeneficiaries.map((ben, idx) => (
                                <div key={idx} className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-600 to-orange-600 flex items-center justify-center text-white font-bold shadow-lg">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-gray-900 text-lg">{ben.beneficiary}</div>
                                        <div className="text-sm text-gray-600 mt-1">{ben.productCount} produits • {ben.exitCount} sorties</div>
                                    </div>
                                    <div className="text-right px-5 py-3 rounded-lg bg-white/80 backdrop-blur-sm border border-gray-200 shadow-sm">
                                        <div className="font-bold text-gray-900 text-xl">{ben.totalUnits}</div>
                                        <div className="text-xs text-gray-500 mt-1">unités</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Nouvelle sortie form */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-6 mb-6 -m-6 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <ArrowRightOnRectangleIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Nouvelle sortie</h2>
                        </div>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        {/* Champs de base */}
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Bénéficiaire <span className="text-red-500">*</span>
                                </label>
                                <input
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
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
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Type de sortie <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm bg-white"
                                        value={exitType}
                                        onChange={e => setExitType(e.target.value)}
                                        required
                                    >
                                        <option value="Définitive">Définitive</option>
                                        <option value="Affectation">Affectation</option>
                                        <option value="Provisoire">Provisoire</option>
                                    </select>
                                    <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
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
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg hover:from-red-700 hover:to-orange-700 transition-all transform hover:scale-105 font-medium"
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
                                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm bg-white"
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
                                                <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                            </div>
                                            <input
                                                type="number"
                                                className="w-32 border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
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
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm resize-none"
                                rows={4}
                                placeholder="Commentaires sur cette sortie..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                            />
                        </div>

                        {/* Bouton Enregistrer */}
                        <div className="pt-4 border-t">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-orange-700 transition-all transform hover:scale-105 font-medium"
                            >
                                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                                <span>Enregistrer la sortie</span>
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
                                placeholder="Rechercher par produit, bénéficiaire ou observation..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all"
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
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between shadow-sm"
                            >
                                <span className="font-medium">{selectedType === 'Tous' ? 'Tous les types' : selectedType}</span>
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
                                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between shadow-sm"
                            >
                                <span className="font-medium">{selectedStatus === 'Tous' ? 'Tous les statuts' : selectedStatus}</span>
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
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-w-[150px] shadow-sm transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Historique des sorties */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Historique des sorties</h2>
                            <p className="text-sm text-gray-500">{filteredRows.length} sortie{filteredRows.length > 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Date</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Produit</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Quantité</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Bénéficiaire</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Type</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Statut</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Observation</th>
                                    <th className="text-left px-6 py-4 text-gray-700 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <ArrowRightOnRectangleIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucune sortie trouvée</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows.map(r => {
                                        const product = products.find(p => p.id === r.product_id);
                                        return (
                                            <tr key={r.id} className="border-t hover:bg-red-50 transition-colors">
                                                <td className="px-6 py-5 font-medium text-gray-700">{formatDate(r.movement_date)}</td>
                                                <td className="px-6 py-5 font-semibold text-gray-900">{product?.name || `Produit #${r.product_id}`}</td>
                                                <td className="px-6 py-5 text-gray-700 font-medium">{r.quantity}</td>
                                                <td className="px-6 py-5 text-gray-700">{r.beneficiary || 'ND'}</td>
                                                <td className="px-6 py-5">
                                                    {r.exit_type && (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getTypeColor(r.exit_type)}`}>
                                                            {r.exit_type}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5">
                                                    {r.status && (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getStatusColor(r.status)}`}>
                                                            {r.status}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-5 text-gray-600">{r.notes || '-'}</td>
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
