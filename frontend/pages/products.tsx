import React, { FormEvent, useEffect, useMemo, useState, useRef } from 'react';
import Layout from '../components/Layout.tsx';
import TopBar from '../components/TopBar.tsx';
import { useSettings } from '../contexts/SettingsContext';
import { MagnifyingGlassIcon, ChevronDownIcon, PlusIcon, XMarkIcon, CubeIcon, DocumentArrowDownIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api.ts';

type Product = {
    id: number;
    ref?: string | null;
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
    const { settings } = useSettings();
    const [items, setItems] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [search, setSearch] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Tous');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedAcquirer, setSelectedAcquirer] = useState<string>('');
    const [isOpen, setIsOpen] = useState(false);
    const [confirmId, setConfirmId] = useState<number | null>(null);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState({ ref: '', name: '', category_id: '', quantity: 0, price: 0, critical_level: 10, supplier: '', acquirer: '', beneficiary: '', acquired_at: '' });
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    // Récupérer les acquéreurs uniques (du cache local)
    const uniqueAcquirers = useMemo(() => {
        const acquirers = items
            .map(p => p.acquirer)
            .filter((acq): acq is string => acq !== null && acq !== undefined && acq !== '')
            .filter((acq, index, self) => self.indexOf(acq) === index)
            .sort();
        return acquirers;
    }, [items]);

    const filtered = useMemo(() => {
        // Les filtres frontend seulement pour les données déjà chargées
        return items.filter(p => {
            // Filtre par recherche (réf, nom, catégorie)
            const matchesSearch = search === '' ||
                [p.ref || '', p.name, p.category].join(' ').toLowerCase().includes(search.toLowerCase());

            // Filtre par statut
            const statusLabel = getStatusLabel(p);
            const matchesStatus = selectedStatus === 'Tous' || statusLabel === selectedStatus;

            // Filtre par catégorie
            const matchesCategory = selectedCategory === '' || p.category === selectedCategory || String(p.category_id) === selectedCategory;

            // Filtre par date
            const matchesDate = selectedDate === '' || (p.acquired_at && p.acquired_at.split('T')[0] === selectedDate);

            // Filtre par acquéreur
            const matchesAcquirer = selectedAcquirer === '' || p.acquirer === selectedAcquirer;

            return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesAcquirer;
        });
    }, [items, search, selectedStatus, selectedCategory, selectedDate, selectedAcquirer]);

    const load = async (page: number = 1) => {
        try {
            setIsLoading(true);
            const [p, c] = await Promise.all([
                // Charger seulement 15 produits par page
                getJSON(API(`/products?page=${page}&per_page=${itemsPerPage}`)) as Promise<any>,
                getJSON(API('/categories')).catch(() => CATEGORIES_FALLBACK) as Promise<any>
            ]);
            setItems(p.items || []);
            setTotalItems(p.total || 0);
            setTotalPages(p.last_page || 1);
            setCategories(Array.isArray(c) ? c : CATEGORIES_FALLBACK);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError(err?.message || 'Erreur de chargement');
            setSuccess('');
        } finally {
            setIsLoading(false);
        }
    };
    
    // Charger les données au montage
    useEffect(() => { 
        setCurrentPage(1);
        load(1); 
    }, []);
    
    // Recharger quand on change de page
    useEffect(() => {
        if (currentPage > 0) {
            load(currentPage);
        }
    }, [currentPage]);
    
    // Réinitialiser à la page 1 quand les filtres changent
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedStatus, selectedCategory, selectedDate, selectedAcquirer]);

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

    const generateUniqueRef = () => {
        // Générer une référence unique basée sur timestamp + random
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `REF-${timestamp}-${random}`;
    };

    const openCreate = () => {
        setEditing(null);
        setForm({
            ref: generateUniqueRef(),
            name: '',
            category_id: '',
            quantity: 0,
            price: 0,
            critical_level: 10,
            supplier: '',
            acquirer: '',
            beneficiary: '',
            acquired_at: ''
        });
        setIsOpen(true);
    };
    const openEdit = (p: Product) => {
        const catId = p.category_id || categories.find(c => c.name === p.category)?.id;
        const supplierValue = (p.supplier === null || p.supplier === undefined) ? '' : String(p.supplier);
        setEditing(p);
        setForm({
            ref: p.ref || '',
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
            load(currentPage);
        } catch (err: any) { setError(err?.message || 'Erreur'); setSuccess(''); }
    };

    const remove = async (id: number) => {
        try {
            await getJSON(API(`/products/${id}`), { method: 'DELETE' });
            setSuccess('Produit supprimé');
            setConfirmId(null);
            load(currentPage);
        } catch (err: any) { setError(err?.message || 'Erreur'); setSuccess(''); }
    };

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

    // Fonction pour préparer les données d'un produit pour Excel
    const prepareProductData = (product: Product) => {
        const row: any = {
            'Référence': product.ref || '-',
            'Nom': product.name,
            'Catégorie': product.category,
            'Quantité': product.quantity,
            'Prix': product.price,
            'Statut': getStatusLabel(product)
        };

        // Ajouter les champs optionnels s'ils existent
        if (product.supplier) row['Fournisseur'] = product.supplier;
        if (product.acquirer) row['Acquéreur'] = product.acquirer;
        if (product.beneficiary) row['Bénéficiaire'] = product.beneficiary;
        if (product.acquired_at) {
            row['Date d\'acquisition'] = new Date(product.acquired_at).toLocaleDateString('fr-FR');
        }

        return row;
    };

    // Fonction pour exporter un seul produit en Excel
    const exportSingleProductExcel = async (product: Product) => {
        try {
            const XLSX = await import('xlsx');

            // Préparer les données pour l'export
            const data = [prepareProductData(product)];

            // Créer le workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Ajuster la largeur des colonnes
            const colWidths = [
                { wch: 15 }, // Référence
                { wch: 30 }, // Nom
                { wch: 25 }, // Catégorie
                { wch: 10 }, // Quantité
                { wch: 12 }, // Prix
                { wch: 12 }  // Statut
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'Produit');

            // Générer le nom du fichier
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `produit_${product.id}_${dateStr}.xlsx`;

            // Télécharger le fichier
            XLSX.writeFile(wb, filename);
            setSuccess('Export Excel réussi !');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Erreur lors de l\'export Excel:', err);
            setError('Erreur lors de l\'export Excel');
        }
    };

    // Fonction pour exporter tous les produits filtrés en Excel
    const exportAllProductsExcel = async () => {
        try {
            const XLSX = await import('xlsx');

            // Préparer les données pour l'export
            const data = filtered.map(product => prepareProductData(product));

            // Créer le workbook
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(data);

            // Ajuster la largeur des colonnes
            const colWidths = [
                { wch: 15 }, // Référence
                { wch: 30 }, // Nom
                { wch: 25 }, // Catégorie
                { wch: 10 }, // Quantité
                { wch: 12 }, // Prix
                { wch: 12 }  // Statut
            ];
            ws['!cols'] = colWidths;

            XLSX.utils.book_append_sheet(wb, ws, 'Produits');

            // Générer le nom du fichier
            const dateStr = new Date().toISOString().split('T')[0];
            const filename = `produits_${dateStr}.xlsx`;

            // Télécharger le fichier
            XLSX.writeFile(wb, filename);
            setSuccess('Export Excel réussi !');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Erreur lors de l\'export Excel:', err);
            setError('Erreur lors de l\'export Excel');
        }
    };

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Gestion des Produits</h1>
                            <p className="text-emerald-100">Gérez votre inventaire de produits</p>
                        </div>
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <CubeIcon className="w-8 h-8 text-white" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-l-4 border-red-500 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{error}</span>
                        <button onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-200 text-red-700 hover:text-red-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {success && (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-l-4 border-emerald-500 px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{success}</span>
                        <button onClick={() => setSuccess('')} className="ml-4 p-1 rounded-full hover:bg-emerald-200 text-emerald-700 hover:text-emerald-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Rechercher par référence, nom ou catégorie..."
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
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
                                            setCurrentPage(1);
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
                                            setCurrentPage(1);
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
                                            setCurrentPage(1);
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
                                            setCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Critique' ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Critique
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Category Filter */}
                        <div className="relative">
                            <select
                                value={selectedCategory}
                                onChange={(e) => {
                                    setSelectedCategory(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[180px] shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="">Toutes les catégories</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>

                        {/* Date Filter */}
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-w-[150px]"
                                placeholder="Filtrer par date"
                            />
                            {selectedDate && (
                                <button
                                    onClick={() => setSelectedDate('')}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                                    title="Effacer le filtre de date"
                                >
                                    <XMarkIcon className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Acquirer Filter */}
                        <div className="relative">
                            <select
                                value={selectedAcquirer}
                                onChange={(e) => {
                                    setSelectedAcquirer(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[180px] shadow-sm appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            >
                                <option value="">Tous les acquéreurs</option>
                                {uniqueAcquirers.map(acq => (
                                    <option key={acq} value={acq}>{acq}</option>
                                ))}
                            </select>
                            <ChevronDownIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Table card */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <CubeIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900">Liste des produits</h3>
                                <p className="text-sm text-gray-500">Affichage {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} produits (Page {currentPage}/{totalPages})</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {totalPages > 1 && (
                                <p className="text-sm text-gray-600">
                                    Page {currentPage} sur {totalPages}
                                </p>
                            )}
                        {items.length > 0 && (
                            <button
                                onClick={exportAllProductsExcel}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg shadow-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 font-medium disabled:opacity-50"
                                title="Exporter tous les produits filtrés en Excel"
                                disabled={isLoading}
                            >
                                <DocumentArrowDownIcon className="w-5 h-5" />
                                <span>Exporter</span>
                            </button>
                        )}
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        {isLoading && (
                            <div className="bg-white p-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                                <p className="mt-2 text-gray-600">Chargement des produits...</p>
                            </div>
                        )}
                        {!isLoading && (
                            <>
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Réf.</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Nom</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Catégorie</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Prix</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                            <CubeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucun produit trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(r => (
                                        <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-6 py-5 text-gray-700 font-mono text-sm">{r.ref || '-'}</td>
                                            <td className="px-6 py-5 font-semibold text-gray-900">{r.name}</td>
                                            <td className="px-6 py-5 text-gray-700">{r.category}</td>
                                            <td className="px-6 py-5 text-gray-700 font-medium">{r.quantity}</td>
                                            <td className="px-6 py-5 text-gray-700 font-medium">{formatCurrency(Number(r.price))}</td>
                                            <td className="px-6 py-5">
                                                {(() => {
                                                    const label = getStatusLabel(r);
                                                    const color = label === 'Normal'
                                                        ? 'bg-gradient-to-r from-green-600 to-green-700'
                                                        : label === 'Faible'
                                                            ? 'bg-gradient-to-r from-orange-600 to-orange-700'
                                                            : 'bg-gradient-to-r from-red-600 to-red-700';
                                                    return (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold text-white shadow-sm ${color}`}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => exportSingleProductExcel(r)}
                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all transform hover:scale-110"
                                                        aria-label="exporter ce produit en Excel"
                                                        title="Exporter ce produit en Excel"
                                                    >
                                                        <DocumentArrowDownIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => setConfirmId(r.id)} className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110" aria-label="supprimer">
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
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
                            </>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1 || isLoading}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        currentPage === 1 || isLoading
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - currentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;
                                            
                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setCurrentPage(page)}
                                                        disabled={isLoading}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${
                                                            currentPage === page
                                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
                                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50'
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
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages || isLoading}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        currentPage >= totalPages || isLoading
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

                {/* Modal */}
                {isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
                        <div className="relative bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-gray-200">
                            <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-t-xl p-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-white">{editing ? 'Modifier un produit' : 'Ajouter un nouveau produit'}</h3>
                                    <button onClick={closeModal} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors" aria-label="fermer">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={submit} className="p-6 grid grid-cols-6 gap-4">
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Référence <span className="text-red-500">*</span></label>
                                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm font-mono" required value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value.toUpperCase() })} placeholder="REF-XXXXX" />
                                    <p className="text-xs text-gray-500 mt-1">Référence unique du produit</p>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Nom du produit <span className="text-red-500">*</span></label>
                                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Laptop Dell XPS" />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Catégorie <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm bg-white" value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })}>
                                            <option value="">Sélectionnez une catégorie</option>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Quantité <span className="text-red-500">*</span></label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Prix (€) <span className="text-red-500">*</span></label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" value={form.price} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Seuil critique</label>
                                    <input type="number" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" value={form.critical_level} onChange={e => setForm({ ...form, critical_level: Number(e.target.value) })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Fournisseur</label>
                                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" placeholder="Nom du fournisseur" value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Acquéreur</label>
                                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" placeholder="Nom de l'acquéreur" value={form.acquirer} onChange={e => setForm({ ...form, acquirer: e.target.value })} />
                                </div>
                                <div className="col-span-3">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Bénéficiaire</label>
                                    <input className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" placeholder="Nom du bénéficiaire" value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} />
                                </div>
                                <div className="col-span-6">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">Date d'acquisition</label>
                                    <input type="date" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm" value={form.acquired_at} onChange={e => setForm({ ...form, acquired_at: e.target.value })} />
                                </div>
                                <div className="col-span-6 flex items-center justify-end gap-3 mt-4 pt-4 border-t">
                                    <button type="button" onClick={closeModal} className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium">Annuler</button>
                                    <button className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-green-700 text-white shadow-lg hover:from-emerald-700 hover:to-green-800 transition-all transform hover:scale-105 font-medium">{editing ? 'Mettre à jour' : 'Ajouter'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Confirm delete modal */}
                {confirmId !== null && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm">
                        <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmId(null)} />
                        <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl border border-gray-200">
                            <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-t-xl p-6">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mx-auto mb-4">
                                    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-2xl font-bold text-center mb-2 text-gray-900">Confirmer la suppression</h3>
                                <p className="text-gray-600 mb-6 text-center">Voulez-vous vraiment supprimer ce produit ?<br /><span className="text-red-600 font-medium">Cette action est irréversible.</span></p>
                                <div className="flex items-center justify-end gap-3">
                                    <button onClick={() => setConfirmId(null)} className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors font-medium">Annuler</button>
                                    <button onClick={() => remove(confirmId!)} className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 font-medium">Supprimer</button>
                                </div>
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
