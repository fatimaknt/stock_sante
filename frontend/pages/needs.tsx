import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { ClipboardDocumentListIcon, PlusIcon, MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

type Product = { id: number; name: string; quantity: number };
type Need = {
    id: number;
    product_id: number;
    product?: { id: number; name: string };
    quantity: number;
    reason: string;
    user?: { id: number; name: string; email: string };
    status: 'pending' | 'approved' | 'rejected';
    approved_by?: number | null;
    approver?: { id: number; name: string } | null;
    rejection_reason?: string | null;
    approved_at?: string | null;
    created_at: string;
    updated_at: string;
};

export default function NeedsPage() {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [needs, setNeeds] = useState<Need[]>([]);
    const [productId, setProductId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(1);
    const [reason, setReason] = useState<string>('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStatus, setSelectedStatus] = useState<string>('Tous');
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    // États pour les modals
    const [needToApprove, setNeedToApprove] = useState<Need | null>(null);
    const [needToReject, setNeedToReject] = useState<Need | null>(null);
    const [rejectionReason, setRejectionReason] = useState<string>('');
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
    const [needToView, setNeedToView] = useState<Need | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

    // Vérification stricte : seuls les administrateurs peuvent voir les actions d'approbation
    const isAdmin = user !== null && user !== undefined && user.role === 'Administrateur';

    useEffect(() => {
        load();
    }, []);

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

    const load = async () => {
        try {
            const p = await getJSON(API('/products')) as any;
            setProducts((p.items || []).map((x: any) => ({ id: x.id, name: x.name, quantity: Number(x.quantity ?? 0) })));
            const n = await getJSON(API('/needs')) as any;
            setNeeds(Array.isArray(n) ? n : []);
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
            setNeeds([]);
            setProducts([]);
        }
    };

    const save = async (e: FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!productId || quantity < 1 || !reason.trim()) {
            setError('Veuillez remplir tous les champs requis');
            return;
        }

        try {
            await getJSON(API('/needs'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: Number(productId),
                    quantity: Number(quantity),
                    reason: reason.trim(),
                })
            });

            setProductId('');
            setQuantity(1);
            setReason('');
            setSuccess('Demande de besoin créée avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de la sauvegarde:', err);
            setError(err?.message || 'Erreur lors de la création du besoin');
            setSuccess('');
        }
    };

    const openApproveModal = (need: Need) => {
        // Sécurité : seuls les admins peuvent approuver
        if (!user || user.role !== 'Administrateur') return;
        setNeedToApprove(need);
        setIsApproveModalOpen(true);
    };

    const closeApproveModal = () => {
        setIsApproveModalOpen(false);
        setNeedToApprove(null);
    };

    const confirmApprove = async () => {
        if (!needToApprove) return;

        try {
            await getJSON(API(`/needs/${needToApprove.id}/approve`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            closeApproveModal();
            setSuccess('Besoin approuvé avec succès!');
            setError('');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'approbation:', err);
            setError(err?.message || 'Erreur lors de l\'approbation du besoin');
            setSuccess('');
        }
    };

    const openRejectModal = (need: Need) => {
        // Sécurité : seuls les admins peuvent rejeter
        if (!user || user.role !== 'Administrateur') return;
        setNeedToReject(need);
        setRejectionReason('');
        setIsRejectModalOpen(true);
    };

    const closeRejectModal = () => {
        setIsRejectModalOpen(false);
        setNeedToReject(null);
        setRejectionReason('');
    };

    const confirmReject = async () => {
        if (!needToReject) return;

        try {
            await getJSON(API(`/needs/${needToReject.id}/reject`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rejection_reason: rejectionReason.trim() || null
                })
            });

            closeRejectModal();
            setSuccess('Besoin rejeté');
            setError('');
            await load();
        } catch (err: any) {
            console.error('Erreur lors du rejet:', err);
            setError(err?.message || 'Erreur lors du rejet du besoin');
            setSuccess('');
        }
    };

    const openViewModal = (need: Need) => {
        setNeedToView(need);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setNeedToView(null);
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

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { label: 'En attente', color: 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' };
            case 'approved':
                return { label: 'Approuvé', color: 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white' };
            case 'rejected':
                return { label: 'Rejeté', color: 'bg-gradient-to-r from-red-600 to-red-700 text-white' };
            default:
                return { label: status, color: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white' };
        }
    };

    // Filtrer les besoins
    const filteredNeeds = needs.filter(need => {
        // Filtre par recherche (produit, motif, utilisateur)
        const product = products.find(p => p.id === need.product_id);
        const matchesSearch = searchQuery === '' ||
            product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            need.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            need.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            need.user?.email.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtre par statut
        const matchesStatus = selectedStatus === 'Tous' || need.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    // Pagination
    const paginatedNeeds = filteredNeeds.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Besoins</h1>
                            <p className="text-blue-100">Demandez des produits nécessaires pour votre travail</p>
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

                {/* Formulaire de besoin */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 mb-6 -m-6 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <PlusIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Nouveau besoin</h2>
                        </div>
                    </div>

                    <form onSubmit={save} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Produit <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <select
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm bg-white"
                                        value={productId}
                                        onChange={e => setProductId(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un produit</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.quantity > 0 && `(Stock: ${p.quantity})`}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDownIcon className="w-5 h-5 absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Quantité <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                    placeholder="Quantité"
                                    value={quantity || ''}
                                    onChange={e => setQuantity(Number(e.target.value))}
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-2 block">
                                Motif <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm resize-none"
                                rows={4}
                                placeholder="Expliquez pourquoi vous avez besoin de ce produit..."
                                value={reason}
                                onChange={e => setReason(e.target.value)}
                                required
                            />
                        </div>

                        <div className="pt-4 border-t">
                            <button
                                type="submit"
                                className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-medium"
                            >
                                <PlusIcon className="w-5 h-5" />
                                <span>Créer la demande</span>
                            </button>
                        </div>
                    </form>
                </div>

                {/* Filtres et recherche */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par produit, motif ou utilisateur..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
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
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'Tous' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Tous les statuts
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('pending');
                                            setIsStatusDropdownOpen(false);
                                            setCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'pending' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        En attente
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('approved');
                                            setIsStatusDropdownOpen(false);
                                            setCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'approved' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Approuvé
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('rejected');
                                            setIsStatusDropdownOpen(false);
                                            setCurrentPage(1);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${selectedStatus === 'rejected' ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                    >
                                        Rejeté
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Liste des besoins */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <ClipboardDocumentListIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Liste des besoins</h2>
                                <p className="text-sm text-gray-500">{filteredNeeds.length} besoin{filteredNeeds.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 border-b-2 border-blue-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Date</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Produit</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Motif</th>
                                    {user && user.role === 'Administrateur' && <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Demandeur</th>}
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredNeeds.length === 0 ? (
                                    <tr>
                                        <td colSpan={user && user.role === 'Administrateur' ? 7 : 6} className="px-6 py-12 text-center text-gray-500">
                                            <ClipboardDocumentListIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucun besoin trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedNeeds.map(need => {
                                        const product = products.find(p => p.id === need.product_id);
                                        const statusInfo = getStatusInfo(need.status);
                                        return (
                                            <tr key={need.id} className="border-t hover:bg-blue-50 transition-colors">
                                                <td className="px-6 py-5 font-medium text-gray-700">{formatDate(need.created_at)}</td>
                                                <td className="px-6 py-5 font-semibold text-gray-900">{product?.name || `Produit #${need.product_id}`}</td>
                                                <td className="px-6 py-5 text-gray-700 font-medium">{need.quantity}</td>
                                                <td className="px-6 py-5 text-gray-600 max-w-md">
                                                    <p className="truncate" title={need.reason}>{need.reason}</p>
                                                </td>
                                                {user && user.role === 'Administrateur' && (
                                                    <td className="px-6 py-5 text-gray-700">
                                                        {need.user ? (
                                                            <div>
                                                                <p className="font-medium">{need.user.name}</p>
                                                                <p className="text-sm text-gray-500">{need.user.email}</p>
                                                            </div>
                                                        ) : 'ND'}
                                                    </td>
                                                )}
                                                <td className="px-6 py-5">
                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                        {statusInfo.label}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2">
                                                        {/* Bouton Visualiser */}
                                                        <button
                                                            onClick={() => openViewModal(need)}
                                                            className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-110"
                                                            aria-label="visualiser"
                                                            title="Visualiser les détails"
                                                        >
                                                            <EyeIcon className="w-5 h-5" />
                                                        </button>
                                                        {/* Boutons Admin - Approuver/Rejeter - UNIQUEMENT pour les administrateurs */}
                                                        {user && user.role === 'Administrateur' && need.status === 'pending' && (
                                                            <>
                                                                <button
                                                                    onClick={() => openApproveModal(need)}
                                                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all transform hover:scale-110"
                                                                    aria-label="approuver"
                                                                    title="Approuver le besoin"
                                                                >
                                                                    <CheckCircleIcon className="w-5 h-5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => openRejectModal(need)}
                                                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                                    aria-label="rejeter"
                                                                    title="Rejeter le besoin"
                                                                >
                                                                    <XCircleIcon className="w-5 h-5" />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredNeeds.length > itemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage === 1}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredNeeds.length / itemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const totalPages = Math.ceil(filteredNeeds.length / itemsPerPage);
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - currentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const totalPages = Math.ceil(filteredNeeds.length / itemsPerPage);
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setCurrentPage(page)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${currentPage === page
                                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
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
                                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredNeeds.length / itemsPerPage), prev + 1))}
                                    disabled={currentPage >= Math.ceil(filteredNeeds.length / itemsPerPage)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${currentPage >= Math.ceil(filteredNeeds.length / itemsPerPage)
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

                {/* Modal d'approbation */}
                {isApproveModalOpen && needToApprove && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Approuver le besoin</h3>
                                </div>
                                <p className="text-gray-700 mb-6">
                                    Êtes-vous sûr de vouloir approuver ce besoin ?
                                    <br /><br />
                                    <span className="font-semibold">Produit:</span> {products.find(p => p.id === needToApprove.product_id)?.name || `Produit #${needToApprove.product_id}`}
                                    <br />
                                    <span className="font-semibold">Quantité:</span> {needToApprove.quantity}
                                    <br />
                                    <span className="font-semibold">Motif:</span> {needToApprove.reason}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeApproveModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmApprove}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg shadow-lg hover:from-green-700 hover:to-green-800 transition-all font-medium"
                                    >
                                        Approuver
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de rejet */}
                {isRejectModalOpen && needToReject && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <XCircleIcon className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Rejeter le besoin</h3>
                                </div>
                                <p className="text-gray-700 mb-4">
                                    Êtes-vous sûr de vouloir rejeter ce besoin ?
                                    <br /><br />
                                    <span className="font-semibold">Produit:</span> {products.find(p => p.id === needToReject.product_id)?.name || `Produit #${needToReject.product_id}`}
                                    <br />
                                    <span className="font-semibold">Quantité:</span> {needToReject.quantity}
                                </p>
                                <div className="mb-4">
                                    <label className="text-sm font-semibold mb-2 block text-gray-700">
                                        Raison du rejet (optionnel)
                                    </label>
                                    <textarea
                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm resize-none"
                                        rows={3}
                                        placeholder="Expliquez pourquoi ce besoin est rejeté..."
                                        value={rejectionReason}
                                        onChange={e => setRejectionReason(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeRejectModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmReject}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 transition-all font-medium"
                                    >
                                        Rejeter
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de visualisation */}
                {isViewModalOpen && needToView && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6 p-6 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <EyeIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Détails du besoin</h3>
                                </div>
                                <button
                                    onClick={closeViewModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                    aria-label="fermer"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6 p-6">
                                {/* Informations générales */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4">Informations générales</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Date de demande</p>
                                            <p className="text-base font-semibold text-gray-900">{formatDate(needToView.created_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Produit</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {products.find(p => p.id === needToView.product_id)?.name || `Produit #${needToView.product_id}`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Quantité</p>
                                            <p className="text-base font-semibold text-gray-900">{needToView.quantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Statut</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${getStatusInfo(needToView.status).color}`}>
                                                    {getStatusInfo(needToView.status).label}
                                                </span>
                                            </p>
                                        </div>
                                        {needToView.user && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Demandeur</p>
                                                <p className="text-base font-semibold text-gray-900">{needToView.user.name}</p>
                                                <p className="text-sm text-gray-500">{needToView.user.email}</p>
                                            </div>
                                        )}
                                        {needToView.approver && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Traité par</p>
                                                <p className="text-base font-semibold text-gray-900">{needToView.approver.name}</p>
                                                {needToView.approved_at && (
                                                    <p className="text-sm text-gray-500">{formatDate(needToView.approved_at)}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Motif */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                    <h4 className="text-lg font-bold text-gray-800 mb-3">Motif</h4>
                                    <p className="text-base text-gray-700 whitespace-pre-wrap">{needToView.reason}</p>
                                </div>

                                {/* Raison du rejet si rejeté */}
                                {needToView.status === 'rejected' && needToView.rejection_reason && (
                                    <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3">Raison du rejet</h4>
                                        <p className="text-base text-gray-700 whitespace-pre-wrap">{needToView.rejection_reason}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t p-6">
                                <button
                                    onClick={closeViewModal}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

