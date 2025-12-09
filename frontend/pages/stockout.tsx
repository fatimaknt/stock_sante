import React, { useEffect, useState, FormEvent, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { ArrowRightOnRectangleIcon, PlusIcon, TrashIcon, ArrowTrendingUpIcon, MagnifyingGlassIcon, ChevronDownIcon, XMarkIcon, DocumentArrowDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, ArrowUturnLeftIcon, XCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

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
    pending_operation_id?: number | null;
};

type TopBeneficiary = {
    beneficiary: string;
    productCount: number;
    exitCount: number;
    totalUnits: number;
};

type Item = { product_id: number | ''; quantity: number };

export default function StockOutPage() {
    const { user } = useAuth();
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

    // Pagination
    const [stockOutsCurrentPage, setStockOutsCurrentPage] = useState(1);
    const [stockOutsItemsPerPage] = useState(10);

    // États pour les modals de validation/retour/visualisation
    const [stockOutToValidate, setStockOutToValidate] = useState<StockOutRow | null>(null);
    const [stockOutToReturn, setStockOutToReturn] = useState<StockOutRow | null>(null);
    const [stockOutToView, setStockOutToView] = useState<StockOutRow | null>(null);
    const [isValidateModalOpen, setIsValidateModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

    const approveStockOut = async (pendingOperationId: number) => {
        try {
            setError('');
            await getJSON(API(`/approvals/${pendingOperationId}/approve`), { method: 'POST' });
            setSuccess('Sortie approuvée avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'approbation:', err);
            setError(err?.message || 'Erreur lors de l\'approbation de la sortie');
            setSuccess('');
        }
    };

    const rejectStockOut = async (pendingOperationId: number) => {
        try {
            setError('');
            await getJSON(API(`/approvals/${pendingOperationId}/reject`), { method: 'POST' });
            setSuccess('Sortie rejetée');
            await load();
        } catch (err: any) {
            console.error('Erreur lors du rejet:', err);
            setError(err?.message || 'Erreur lors du rejet de la sortie');
            setSuccess('');
        }
    };

    const openValidateModal = (stockOut: StockOutRow) => {
        setStockOutToValidate(stockOut);
        setIsValidateModalOpen(true);
    };

    const closeValidateModal = () => {
        setIsValidateModalOpen(false);
        setStockOutToValidate(null);
    };

    const confirmValidate = async () => {
        if (!stockOutToValidate) return;

        try {
            await getJSON(API(`/stockouts/${stockOutToValidate.id}/validate`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            closeValidateModal();
            setSuccess('Sortie validée avec succès!');
            setError('');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de la validation:', err);
            setError(err?.message || 'Erreur lors de la validation de la sortie');
            setSuccess('');
        }
    };

    const openReturnModal = (stockOut: StockOutRow) => {
        setStockOutToReturn(stockOut);
        setIsReturnModalOpen(true);
    };

    const closeReturnModal = () => {
        setIsReturnModalOpen(false);
        setStockOutToReturn(null);
    };

    const openViewModal = (stockOut: StockOutRow) => {
        setStockOutToView(stockOut);
        setIsViewModalOpen(true);
    };

    const closeViewModal = () => {
        setIsViewModalOpen(false);
        setStockOutToView(null);
    };

    const confirmReturn = async () => {
        if (!stockOutToReturn) return;

        try {
            await getJSON(API(`/stockouts/${stockOutToReturn.id}/return`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            closeReturnModal();
            setSuccess('Sortie retournée avec succès, stock réintégré!');
            setError('');
            await load();
        } catch (err: any) {
            console.error('Erreur lors du retour:', err);
            setError(err?.message || 'Erreur lors du retour de la sortie');
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

    const getStatusInfo = (status?: string) => {
        switch (status) {
            case 'pending':
                return { label: 'En attente', color: 'bg-gradient-to-r from-yellow-500 to-yellow-600' };
            case 'rejected':
                return { label: 'Rejetée', color: 'bg-gradient-to-r from-red-600 to-red-700' };
            case 'Retournée':
                return { label: 'Retournée', color: 'bg-gradient-to-r from-green-600 to-green-700' };
            case 'Complétée':
                return { label: 'Complétée', color: 'bg-gradient-to-r from-emerald-600 to-emerald-700' };
            default:
                return { label: status || 'Aucun', color: 'bg-gradient-to-r from-gray-600 to-gray-700' };
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

    // Fonction pour exporter une seule sortie en PDF
    const exportSingleStockOutPDF = async (row: StockOutRow) => {
        try {
            const { jsPDF: jsPDFModule } = await import('jspdf');
            const doc = new jsPDFModule('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = margin;

            // En-tête
            doc.setFontSize(18);
            doc.setTextColor(220, 38, 38); // red-600
            doc.text('Détail de Sortie de Stock', margin, yPos);
            yPos += 12;

            const product = products.find(p => p.id === row.product_id);
            const productName = product?.name || `Produit #${row.product_id}`;
            const status = row.status || 'Aucun';

            // Tableau des informations
            const tableStartY = yPos;
            const rowHeight = 8;
            const labelWidth = 50;
            const valueWidth = pageWidth - margin - labelWidth - 10;

            // En-tête du tableau
            doc.setFillColor(220, 38, 38); // red-600
            doc.rect(margin, tableStartY, pageWidth - 2 * margin, rowHeight, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('Information', margin + 5, tableStartY + 5);
            doc.text('Valeur', margin + labelWidth + 5, tableStartY + 5);

            yPos = tableStartY + rowHeight;
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            // Lignes du tableau
            const dataRows = [
                { label: 'Date', value: formatDate(row.movement_date) },
                { label: 'Produit', value: productName },
                { label: 'Quantité', value: String(row.quantity || 0) },
                { label: 'Bénéficiaire', value: row.beneficiary || 'ND' },
                { label: 'Type', value: row.exit_type || '-' },
                { label: 'Statut', value: status }
            ];

            dataRows.forEach((dataRow, index) => {
                // Ligne de séparation
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPos, pageWidth - margin, yPos);

                // Label
                doc.setFont('helvetica', 'bold');
                doc.text(dataRow.label + ':', margin + 5, yPos + 5);

                // Valeur
                doc.setFont('helvetica', 'normal');
                const valueLines = doc.splitTextToSize(dataRow.value, valueWidth - 10);
                doc.text(valueLines, margin + labelWidth + 5, yPos + 5);

                yPos += Math.max(rowHeight, valueLines.length * 5);
            });

            // Observation si présente
            if (row.notes) {
                yPos += 5;
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, yPos, pageWidth - margin, yPos);
                yPos += 5;

                doc.setFont('helvetica', 'bold');
                doc.setFontSize(11);
                doc.text('Observation:', margin + 5, yPos);
                yPos += 7;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                const notesLines = doc.splitTextToSize(row.notes, pageWidth - 2 * margin - 10);
                doc.text(notesLines, margin + 5, yPos);
            }

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(128, 128, 128);
            doc.text(
                `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
                margin,
                doc.internal.pageSize.getHeight() - 10
            );

            // Télécharger le PDF
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`sortie_${row.id}_${dateStr}.pdf`);
            setSuccess('Export PDF réussi !');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Erreur lors de l\'export PDF:', err);
            setError('Erreur lors de l\'export PDF');
        }
    };

    // Fonction pour exporter toutes les sorties filtrées en PDF
    const exportStockOutPDF = async () => {
        try {
            const { jsPDF: jsPDFModule } = await import('jspdf');
            const doc = new jsPDFModule('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = margin;

            // En-tête
            doc.setFontSize(18);
            doc.setTextColor(220, 38, 38); // red-600
            doc.text('Rapport des Sorties de Stock', margin, yPos);
            yPos += 10;

            // Informations de filtre
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const filters: string[] = [];
            if (selectedType !== 'Tous') filters.push(`Type: ${selectedType}`);
            if (selectedStatus !== 'Tous') filters.push(`Statut: ${selectedStatus}`);
            if (selectedDate) filters.push(`Date: ${formatDate(selectedDate)}`);
            if (searchQuery) filters.push(`Recherche: ${searchQuery}`);

            if (filters.length > 0) {
                doc.text(`Filtres appliqués: ${filters.join(' | ')}`, margin, yPos);
                yPos += 7;
            }

            doc.text(`Total: ${filteredRows.length} sortie${filteredRows.length > 1 ? 's' : ''}`, margin, yPos);
            yPos += 10;

            // Tableau des sorties
            if (filteredRows.length > 0) {
                // En-tête du tableau
                doc.setFillColor(220, 38, 38); // red-600
                doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');

                let xPos = margin + 5;
                doc.text('Date', xPos, yPos + 5);
                xPos += 25;
                doc.text('Produit', xPos, yPos + 5);
                xPos += 55;
                doc.text('Qté', xPos, yPos + 5);
                xPos += 15;
                doc.text('Bénéficiaire', xPos, yPos + 5);
                xPos += 35;
                doc.text('Type', xPos, yPos + 5);
                xPos += 25;
                doc.text('Statut', xPos, yPos + 5);

                yPos += 10;
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'normal');

                filteredRows.forEach((row, index) => {
                    // Vérifier si on doit créer une nouvelle page
                    if (yPos > doc.internal.pageSize.getHeight() - 30) {
                        doc.addPage();
                        yPos = margin;
                    }

                    const product = products.find(p => p.id === row.product_id);
                    const productName = product?.name || `Produit #${row.product_id}`;

                    // Ligne du tableau
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, yPos, pageWidth - margin, yPos);

                    xPos = margin + 5;
                    doc.setFontSize(9);
                    doc.text(formatDate(row.movement_date), xPos, yPos + 5);
                    xPos += 25;

                    // Nom du produit (peut être long)
                    const maxWidth = 55;
                    const productNameLines = doc.splitTextToSize(productName, maxWidth);
                    doc.text(productNameLines, xPos, yPos + 5);
                    const productHeight = productNameLines.length * 5;
                    xPos += 55;

                    doc.text(String(row.quantity || 0), xPos, yPos + 5);
                    xPos += 15;

                    const beneficiary = row.beneficiary || 'ND';
                    const beneficiaryLines = doc.splitTextToSize(beneficiary, 35);
                    doc.text(beneficiaryLines, xPos, yPos + 5);
                    xPos += 35;

                    doc.text(row.exit_type || '-', xPos, yPos + 5);
                    xPos += 25;

                    // Statut - seulement couleur pour "Retournée", pas pour "Complétée"
                    const status = row.status || 'Aucun';
                    if (status === 'Retournée') {
                        // Badge vert uniquement pour "Retournée"
                        const statusColor = [34, 197, 94]; // green-600
                        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
                        const statusWidth = doc.getTextWidth(status) + 4;
                        doc.roundedRect(xPos, yPos - 2, statusWidth, 6, 1.5, 1.5, 'F');
                        doc.setTextColor(255, 255, 255);
                        doc.setFont('helvetica', 'bold');
                        doc.setFontSize(8);
                        doc.text(status, xPos + 2, yPos + 2);
                        doc.setTextColor(0, 0, 0);
                        doc.setFont('helvetica', 'normal');
                    } else {
                        // Texte simple pour les autres statuts (y compris "Complétée")
                        doc.setFontSize(9);
                        doc.text(status, xPos, yPos + 5);
                    }

                    yPos += Math.max(8, productHeight, beneficiaryLines.length * 5);
                });
            }

            // Footer
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Page ${i} sur ${pageCount} - Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
                    margin,
                    doc.internal.pageSize.getHeight() - 10
                );
            }

            // Télécharger le PDF
            const dateStr = new Date().toISOString().split('T')[0];
            doc.save(`sorties_${dateStr}.pdf`);
            setSuccess('Export PDF réussi !');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err: any) {
            console.error('Erreur lors de l\'export PDF:', err);
            setError('Erreur lors de l\'export PDF');
        }
    };

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
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setStockOutsCurrentPage(1);
                                }}
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                            setStockOutsCurrentPage(1);
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
                                onChange={(e) => {
                                    setSelectedDate(e.target.value);
                                    setStockOutsCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 min-w-[150px] shadow-sm transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Historique des sorties */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Bon de sortie</h2>
                                <p className="text-sm text-gray-500">{filteredRows.length} sortie{filteredRows.length > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            {filteredRows.length > stockOutsItemsPerPage && (
                                <p className="text-sm text-gray-600">
                                    {((stockOutsCurrentPage - 1) * stockOutsItemsPerPage + 1)} - {Math.min(stockOutsCurrentPage * stockOutsItemsPerPage, filteredRows.length)} sur {filteredRows.length}
                                </p>
                            )}
                            {filteredRows.length > 0 && (
                                <button
                                    onClick={exportStockOutPDF}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-medium"
                                    title="Exporter toutes les sorties filtrées en PDF"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    <span>Exporter tout en PDF</span>
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-b-2 border-red-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Date</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Produit</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Bénéficiaire</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Observation</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
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
                                    filteredRows
                                        .slice((stockOutsCurrentPage - 1) * stockOutsItemsPerPage, stockOutsCurrentPage * stockOutsItemsPerPage)
                                        .map(r => {
                                            const product = products.find(p => p.id === r.product_id);
                                            // Vérifier si c'est une sortie provisoire sans statut
                                            const isProvisoireWithoutStatus = r.exit_type === 'Provisoire' && (!r.status || r.status === '' || r.status === null);
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
                                                        {(() => {
                                                            // Si c'est une sortie en attente/rejetée (pending_operation)
                                                            if (r.status === 'pending' || r.status === 'rejected') {
                                                                const statusInfo = getStatusInfo(r.status);
                                                                return (
                                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                                        {statusInfo.label}
                                                                    </span>
                                                                );
                                                            }
                                                            // Si c'est une sortie provisoire sans statut
                                                            if (!r.status && r.exit_type === 'Provisoire') {
                                                                return (
                                                                    <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                                                                        En attente
                                                                    </span>
                                                                );
                                                            }
                                                            // Sinon, afficher le statut normal
                                                            if (r.status) {
                                                                const statusInfo = getStatusInfo(r.status);
                                                                return (
                                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                                        {statusInfo.label}
                                                                    </span>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                    </td>
                                                    <td className="px-6 py-5 text-gray-600">{r.notes || '-'}</td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-2">
                                                            {/* Bouton Visualiser - visible pour toutes les sorties */}
                                                            <button
                                                                onClick={() => openViewModal(r)}
                                                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-110"
                                                                aria-label="visualiser"
                                                                title="Visualiser les détails de la sortie"
                                                            >
                                                                <EyeIcon className="w-5 h-5" />
                                                            </button>
                                                            {/* Boutons d'approbation/rejet - UNIQUEMENT pour les admins */}
                                                            {user && user.role === 'Administrateur' && r.status === 'pending' && r.pending_operation_id && (
                                                                <>
                                                                    <button
                                                                        onClick={() => approveStockOut(r.pending_operation_id!)}
                                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all transform hover:scale-110"
                                                                        aria-label="approuver"
                                                                        title="Approuver la sortie"
                                                                    >
                                                                        <CheckCircleIcon className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => rejectStockOut(r.pending_operation_id!)}
                                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                                        aria-label="rejeter"
                                                                        title="Rejeter la sortie"
                                                                    >
                                                                        <XCircleIcon className="w-5 h-5" />
                                                                    </button>
                                                                </>
                                                            )}
                                                            {/* Bouton Valider - visible uniquement pour les sorties provisoires non retournées */}
                                                            {isProvisoireWithoutStatus && (
                                                                <button
                                                                    onClick={() => openValidateModal(r)}
                                                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all transform hover:scale-110"
                                                                    aria-label="valider cette sortie provisoire"
                                                                    title="Valider cette sortie provisoire (transformer en définitive)"
                                                                >
                                                                    <CheckCircleIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            {/* Bouton Retourner - visible uniquement pour les sorties provisoires non retournées */}
                                                            {isProvisoireWithoutStatus && (
                                                                <button
                                                                    onClick={() => openReturnModal(r)}
                                                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-110"
                                                                    aria-label="retourner cette sortie provisoire"
                                                                    title="Retourner cette sortie provisoire (réintégrer le stock)"
                                                                >
                                                                    <ArrowUturnLeftIcon className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            {/* Boutons pour les sorties approuvées uniquement */}
                                                            {r.status !== 'pending' && r.status !== 'rejected' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => exportSingleStockOutPDF(r)}
                                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 transition-all transform hover:scale-110"
                                                                        aria-label="exporter cette sortie en PDF"
                                                                        title="Exporter cette sortie en PDF"
                                                                    >
                                                                        <DocumentArrowDownIcon className="w-5 h-5" />
                                                                    </button>
                                                                    <button
                                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                                        aria-label="supprimer"
                                                                    >
                                                                        <TrashIcon className="w-5 h-5" />
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
                    {filteredRows.length > stockOutsItemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setStockOutsCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={stockOutsCurrentPage === 1}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${stockOutsCurrentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredRows.length / stockOutsItemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const totalPages = Math.ceil(filteredRows.length / stockOutsItemsPerPage);
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - stockOutsCurrentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const totalPages = Math.ceil(filteredRows.length / stockOutsItemsPerPage);
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setStockOutsCurrentPage(page)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${stockOutsCurrentPage === page
                                                                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
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
                                    onClick={() => setStockOutsCurrentPage(prev => Math.min(Math.ceil(filteredRows.length / stockOutsItemsPerPage), prev + 1))}
                                    disabled={stockOutsCurrentPage >= Math.ceil(filteredRows.length / stockOutsItemsPerPage)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${stockOutsCurrentPage >= Math.ceil(filteredRows.length / stockOutsItemsPerPage)
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

                {/* Top 5 Bénéficiaires */}
                {topBeneficiaries.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6 border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                <ArrowTrendingUpIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">Top 5 Bénéficiaires</h2>
                        </div>
                        <div className="space-y-3">
                            {topBeneficiaries.map((ben, idx) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-105 hover:shadow-md hover:border hover:border-red-300 transition-all duration-300 cursor-pointer">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                                        {idx + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{ben.beneficiary}</p>
                                        <p className="text-sm text-gray-500">{ben.productCount} produits • {ben.exitCount} sorties</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-red-600">{ben.totalUnits}</p>
                                        <p className="text-xs text-gray-500">unités</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Modal de validation */}
                {isValidateModalOpen && stockOutToValidate && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <CheckCircleIcon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Valider la sortie provisoire</h3>
                                </div>
                                <p className="text-gray-700 mb-6">
                                    Êtes-vous sûr de vouloir transformer cette sortie provisoire en sortie définitive ?
                                    <br /><br />
                                    <span className="font-semibold">Produit:</span> {products.find(p => p.id === stockOutToValidate.product_id)?.name || `Produit #${stockOutToValidate.product_id}`}
                                    <br />
                                    <span className="font-semibold">Quantité:</span> {stockOutToValidate.quantity}
                                    <br />
                                    <span className="font-semibold">Bénéficiaire:</span> {stockOutToValidate.beneficiary || 'ND'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeValidateModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmValidate}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-emerald-800 transition-all font-medium"
                                    >
                                        Valider
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de retour */}
                {isReturnModalOpen && stockOutToReturn && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <ArrowUturnLeftIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Retourner la sortie provisoire</h3>
                                </div>
                                <p className="text-gray-700 mb-6">
                                    Êtes-vous sûr de vouloir retourner cette sortie provisoire ?
                                    <br /><br />
                                    Le stock sera réintégré dans l'inventaire.
                                    <br /><br />
                                    <span className="font-semibold">Produit:</span> {products.find(p => p.id === stockOutToReturn.product_id)?.name || `Produit #${stockOutToReturn.product_id}`}
                                    <br />
                                    <span className="font-semibold">Quantité:</span> {stockOutToReturn.quantity}
                                    <br />
                                    <span className="font-semibold">Bénéficiaire:</span> {stockOutToReturn.beneficiary || 'ND'}
                                </p>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={closeReturnModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={confirmReturn}
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transition-all font-medium"
                                    >
                                        Retourner
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de visualisation */}
                {isViewModalOpen && stockOutToView && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6 p-6 border-b">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                        <EyeIcon className="w-6 h-6 text-red-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Détails du bon de sortie</h3>
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
                                <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl p-6 border border-red-200">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4">Informations générales</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Date de sortie</p>
                                            <p className="text-base font-semibold text-gray-900">{formatDate(stockOutToView.movement_date)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Produit</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {products.find(p => p.id === stockOutToView.product_id)?.name || `Produit #${stockOutToView.product_id}`}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Quantité</p>
                                            <p className="text-base font-semibold text-gray-900">{stockOutToView.quantity}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Bénéficiaire</p>
                                            <p className="text-base font-semibold text-gray-900">{stockOutToView.beneficiary || 'ND'}</p>
                                        </div>
                                        {stockOutToView.agent && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Agent</p>
                                                <p className="text-base font-semibold text-gray-900">{stockOutToView.agent}</p>
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Type de sortie</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {stockOutToView.exit_type ? (
                                                    <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm ${getTypeColor(stockOutToView.exit_type)}`}>
                                                        {stockOutToView.exit_type}
                                                    </span>
                                                ) : 'ND'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Statut</p>
                                            <p className="text-base font-semibold text-gray-900">
                                                {(() => {
                                                    if (stockOutToView.status === 'pending' || stockOutToView.status === 'rejected') {
                                                        const statusInfo = getStatusInfo(stockOutToView.status);
                                                        return (
                                                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                                {statusInfo.label}
                                                            </span>
                                                        );
                                                    }
                                                    if (!stockOutToView.status && stockOutToView.exit_type === 'Provisoire') {
                                                        return (
                                                            <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                                                                En attente
                                                            </span>
                                                        );
                                                    }
                                                    if (stockOutToView.status) {
                                                        const statusInfo = getStatusInfo(stockOutToView.status);
                                                        return (
                                                            <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                                {statusInfo.label}
                                                            </span>
                                                        );
                                                    }
                                                    return 'Aucun';
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes */}
                                {stockOutToView.notes && (
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3">Observation</h4>
                                        <p className="text-base text-gray-700 whitespace-pre-wrap">{stockOutToView.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t p-6">
                                <button
                                    onClick={() => {
                                        if (stockOutToView) {
                                            exportSingleStockOutPDF(stockOutToView);
                                        }
                                    }}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-medium"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    Exporter en PDF
                                </button>
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
