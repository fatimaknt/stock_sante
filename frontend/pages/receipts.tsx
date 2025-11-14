import React, { useEffect, useState, FormEvent, useMemo } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { PlusIcon, TrashIcon, InboxIcon, MagnifyingGlassIcon, XMarkIcon, CubeIcon, EyeIcon, DocumentArrowDownIcon, ChevronLeftIcon, ChevronRightIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { jsPDF } from 'jspdf';

type Product = { id: number; name: string };
type Category = { id: number; name: string };
type ReceiptRow = { id: number; ref?: string | null; supplier: string | null; agent: string; acquirer?: string | null; persons_present?: string | null; received_at: string; notes?: string; items_count: number; items?: any[]; status?: string; approved_by?: string | null; approved_at?: string | null; pending_operation_id?: number | null };

type Item = { product_ref?: string; product_name: string; product_category_id?: string; quantity: number; unit_price: number };

const CATEGORIES_FALLBACK: Category[] = [
    { id: 1, name: 'Consommable Informatique' },
    { id: 2, name: 'Matériel informatique' },
    { id: 3, name: 'Médicaments' },
    { id: 4, name: 'Mobilier de bureau' },
    { id: 5, name: "Produits d'entretien" },
];

const getStatusInfo = (status?: string) => {
    switch (status) {
        case 'pending':
            return { label: 'En attente', color: 'bg-gradient-to-r from-yellow-500 to-yellow-600' };
        case 'approved':
            return { label: 'Approuvée', color: 'bg-gradient-to-r from-emerald-600 to-emerald-700' };
        case 'rejected':
            return { label: 'Rejetée', color: 'bg-gradient-to-r from-red-600 to-red-700' };
        default:
            return { label: 'Approuvée', color: 'bg-gradient-to-r from-emerald-600 to-emerald-700' };
    }
};

export default function ReceiptsPage() {
    const { settings } = useSettings();
    const { isAdmin, user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [rows, setRows] = useState<ReceiptRow[]>([]);
    const [supplier, setSupplier] = useState<string>('');
    const [agent, setAgent] = useState<string>('');
    const [acquirer, setAcquirer] = useState<string>('');
    const [personsPresent, setPersonsPresent] = useState<string>('');
    const [date, setDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [items, setItems] = useState<Item[]>([{ product_ref: '', product_name: '', product_category_id: '', quantity: 0, unit_price: 0 }]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState<string>('');

    // Pagination
    const [receiptsCurrentPage, setReceiptsCurrentPage] = useState(1);
    const [receiptsItemsPerPage] = useState(10);

    // États pour modification et suppression
    const [editingReceipt, setEditingReceipt] = useState<ReceiptRow | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [receiptToDelete, setReceiptToDelete] = useState<ReceiptRow | null>(null);

    // États pour le modal de détails
    const [detailReceipt, setDetailReceipt] = useState<ReceiptRow | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    // Initialize date on client side only
    useEffect(() => {
        if (!date) {
            setDate(new Date().toISOString().slice(0, 10));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = async () => {
        try {
            const [p, c, r] = await Promise.all([
                getJSON(API('/products')) as Promise<any>,
                getJSON(API('/categories')).catch(() => CATEGORIES_FALLBACK) as Promise<any>,
                getJSON(API('/receipts')) as Promise<any>
            ]);
            setProducts((p.items || []).map((x: any) => ({ id: x.id, name: x.name })));
            setCategories(Array.isArray(c) ? c : CATEGORIES_FALLBACK);
            console.log('Réceptions chargées:', r);
            setRows(Array.isArray(r) ? r : []);
            setError('');
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
            setRows([]);
            setProducts([]);
            setCategories(CATEGORIES_FALLBACK);
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


    const addLine = () => setItems([...items, { product_ref: '', product_name: '', product_category_id: '', quantity: 0, unit_price: 0 }]);
    const updateLine = (i: number, patch: Partial<Item>) => setItems(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
    const removeLine = (i: number) => {
        // S'assurer qu'il reste toujours au moins une ligne
        if (items.length > 1) {
            setItems(items.filter((_, idx) => idx !== i));
        } else {
            // Si c'est la dernière ligne, on la remet à vide au lieu de la supprimer
            setItems([{ product_ref: '', product_name: '', product_category_id: '', quantity: 0, unit_price: 0 }]);
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
                acquirer: acquirer || undefined,
                persons_present: personsPresent || undefined,
                received_at: date,
                notes,
                items: filteredItems.map(it => {
                    // Chercher le produit par nom
                    const product = products.find(p => p.name.toLowerCase() === it.product_name.toLowerCase().trim());
                    const categoryId = it.product_category_id ? Number(it.product_category_id) : null;
                    const category = categoryId ? categories.find(c => c.id === categoryId) : null;
                    return {
                        product_id: product ? product.id : null,
                        product_ref: (it.product_ref || '').trim() || null,
                        product_name: it.product_name.trim(),
                        product_category_id: categoryId,
                        product_category: category ? category.name : null,
                        quantity: Number(it.quantity),
                        unit_price: Number(it.unit_price)
                    };
                })
            };

            console.log('Envoi de la réception:', payload);
            await getJSON(API('/receipts'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            setItems([{ product_ref: '', product_name: '', product_category_id: '', quantity: 0, unit_price: 0 }]);
            setSupplier('');
            setAgent('');
            setAcquirer('');
            setPersonsPresent('');
            setNotes('');
            setSuccess('Réception enregistrée avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'enregistrement:', err);
            setError(err?.message || 'Erreur lors de l\'enregistrement de la réception');
            setSuccess('');
        }
    };

    const approveReceipt = async (pendingOperationId: number) => {
        try {
            setError('');
            await getJSON(API(`/approvals/${pendingOperationId}/approve`), { method: 'POST' });
            setSuccess('Réception approuvée avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'approbation:', err);
            setError(err?.message || 'Erreur lors de l\'approbation de la réception');
            setSuccess('');
        }
    };

    const rejectReceipt = async (pendingOperationId: number) => {
        try {
            setError('');
            await getJSON(API(`/approvals/${pendingOperationId}/reject`), { method: 'POST' });
            setSuccess('Réception rejetée');
            await load();
        } catch (err: any) {
            console.error('Erreur lors du rejet:', err);
            setError(err?.message || 'Erreur lors du rejet de la réception');
            setSuccess('');
        }
    };

    const formatDate = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return 'N/A';
        }
    };

    const formatCurrency = (value: number) => {
        const localeMap: { [key: string]: string } = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'es': 'es-ES'
        };
        const locale = localeMap[settings.language] || 'fr-FR';
        const currency = settings.defaultCurrency;
        return new Intl.NumberFormat(locale, { style: 'currency', currency: currency }).format(value);
    };


    // Filtrer les réceptions
    const filteredRows = rows.filter(row => {
        // Filtre par recherche (fournisseur, agent, notes)
        const matchesSearch = searchQuery === '' ||
            row.supplier?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.agent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            row.notes?.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtre par date
        const matchesDate = dateFilter === '' || row.received_at === dateFilter;

        return matchesSearch && matchesDate;
    });

    // Fonction pour ouvrir le modal de modification
    const openEditModal = (receipt: ReceiptRow) => {
        setEditingReceipt(receipt);
        setSupplier(receipt.supplier || '');
        setAgent(receipt.agent || '');
        setAcquirer(receipt.acquirer || '');
        setPersonsPresent(receipt.persons_present || '');
        setDate(receipt.received_at || '');
        setNotes(receipt.notes || '');
        setIsEditModalOpen(true);
    };

    // Fonction pour fermer le modal de modification
    const closeEditModal = () => {
        setIsEditModalOpen(false);
        setEditingReceipt(null);
        setSupplier('');
        setAgent('');
        setAcquirer('');
        setPersonsPresent('');
        setDate(new Date().toISOString().slice(0, 10));
        setNotes('');
    };

    // Fonction pour mettre à jour une réception
    const updateReceipt = async () => {
        if (!editingReceipt) return;
        try {
            await getJSON(API(`/receipts/${editingReceipt.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier,
                    agent,
                    acquirer: acquirer || undefined,
                    persons_present: personsPresent || undefined,
                    received_at: date,
                    notes,
                }),
            });
            setSuccess('Réception mise à jour avec succès!');
            closeEditModal();
            await load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la mise à jour');
        }
    };

    // Fonction pour ouvrir le modal de suppression
    const openDeleteModal = (receipt: ReceiptRow) => {
        setReceiptToDelete(receipt);
        setIsDeleteModalOpen(true);
    };

    // Fonction pour fermer le modal de suppression
    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setReceiptToDelete(null);
    };

    // Fonction pour supprimer une réception
    const deleteReceipt = async () => {
        if (!receiptToDelete) return;
        try {
            await getJSON(API(`/receipts/${receiptToDelete.id}`), {
                method: 'DELETE',
            });
            setSuccess('Réception supprimée avec succès!');
            closeDeleteModal();
            await load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la suppression');
        }
    };

    // Fonction pour ouvrir le modal de détails
    const openDetailModal = async (receipt: ReceiptRow) => {
        try {
            // Chercher dans les rows déjà chargés qui contiennent les items
            const receiptData = rows.find(r => r.id === receipt.id);
            if (receiptData && receiptData.items && receiptData.items.length > 0) {
                setDetailReceipt(receiptData);
                setIsDetailModalOpen(true);
            } else {
                // Si les items ne sont pas dans les rows, charger depuis l'API
                const allReceipts = await getJSON(API(`/receipts`)) as any[];
                const found = Array.isArray(allReceipts) ? allReceipts.find((r: any) => r.id === receipt.id) : null;
                if (found && found.items) {
                    setDetailReceipt(found);
                    setIsDetailModalOpen(true);
                } else {
                    setDetailReceipt(receipt);
                    setIsDetailModalOpen(true);
                }
            }
        } catch (err: any) {
            console.error('Erreur lors du chargement des détails:', err);
            setDetailReceipt(receipt);
            setIsDetailModalOpen(true);
        }
    };

    // Fonction pour fermer le modal de détails
    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setDetailReceipt(null);
    };

    // Fonction pour exporter une réception en PDF
    const exportReceiptPDF = async (receipt: ReceiptRow) => {
        try {
            // Utiliser les données du modal si disponibles, sinon charger depuis l'API
            let receiptData = receipt;
            if (receipt.items && receipt.items.length > 0) {
                receiptData = receipt;
            } else {
                // Charger les détails complets de la réception
                const allReceipts = await getJSON(API(`/receipts`)) as any[];
                const found = Array.isArray(allReceipts) ? allReceipts.find((r: any) => r.id === receipt.id) : null;
                if (found) {
                    receiptData = found;
                }
            }

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = margin;

            // En-tête
            doc.setFontSize(18);
            doc.setTextColor(16, 185, 129); // emerald-500
            doc.text('Réception de produits', margin, yPos);
            yPos += 10;

            // Informations de la réception
            doc.setFontSize(12);
            doc.setTextColor(0, 0, 0);
            doc.text(`Fournisseur: ${receiptData.supplier || 'ND'}`, margin, yPos);
            yPos += 7;
            doc.text(`Agent responsable: ${receiptData.agent || 'ND'}`, margin, yPos);
            yPos += 7;
            if (receiptData.acquirer) {
                doc.text(`Acquéreur: ${receiptData.acquirer}`, margin, yPos);
                yPos += 7;
            }
            if (receiptData.persons_present && receiptData.persons_present !== 'ND') {
                doc.text(`Personnes présentes: ${receiptData.persons_present}`, margin, yPos);
                yPos += 7;
            }
            doc.text(`Date: ${formatDate(receiptData.received_at)}`, margin, yPos);
            yPos += 10;

            // Tableau des produits
            if (receiptData.items && receiptData.items.length > 0) {
                doc.setFontSize(14);
                doc.text('Produits reçus:', margin, yPos);
                yPos += 7;

                doc.setFontSize(10);
                let currentY = yPos;

                // Positions des colonnes (ajustées pour éviter le dépassement)
                // Page A4 = 210mm, marge = 20mm de chaque côté = 170mm disponible
                const colProduit = margin; // 20mm
                const colQuantite = margin + 70; // 90mm
                const colPrixUnitaire = margin + 95; // 115mm
                const colTotal = margin + 135; // 155mm (avec ~15mm de marge à droite)
                const maxWidth = pageWidth - margin; // 190mm

                // En-têtes du tableau
                doc.setFont('helvetica', 'bold');
                doc.text('Produit', colProduit, currentY);
                doc.text('Quantité', colQuantite, currentY);
                doc.text('Prix unitaire', colPrixUnitaire, currentY);
                doc.text('Total', colTotal, currentY);
                currentY += 6;

                // Ligne de séparation
                doc.setDrawColor(200, 200, 200);
                doc.line(margin, currentY, maxWidth, currentY);
                currentY += 5;

                // Lignes du tableau
                doc.setFont('helvetica', 'normal');
                let totalAmount = 0;
                for (const item of receiptData.items) {
                    if (currentY > 250) {
                        doc.addPage();
                        currentY = margin;
                    }

                    // Pour les réceptions en attente, utiliser product_name si disponible
                    let productName = item.product_name || '';
                    
                    // Si product_id existe, essayer de trouver le produit par ID
                    if (item.product_id) {
                        const product = products.find(p => p.id === item.product_id);
                        if (product) {
                            productName = product.name;
                        } else if (!productName) {
                            productName = `Produit #${item.product_id}`;
                        }
                    }
                    
                    // Si toujours pas de nom, utiliser un fallback
                    if (!productName || productName.trim() === '') {
                        productName = item.product_ref ? `Produit ${item.product_ref}` : 'Produit sans nom';
                    }
                    
                    const quantity = item.quantity || 0;
                    const unitPrice = item.unit_price || 0;
                    const total = quantity * unitPrice;
                    totalAmount += total;

                    // Tronquer le nom du produit si trop long pour tenir dans la colonne
                    const maxNameWidth = colQuantite - colProduit - 5;
                    const displayName = productName.length > 25 ? productName.substring(0, 22) + '...' : productName;
                    doc.text(displayName, colProduit, currentY);

                    // Aligner à droite pour les nombres dans leurs colonnes respectives
                    const quantityStr = quantity.toString();
                    const quantityWidth = doc.getTextWidth(quantityStr);
                    doc.text(quantityStr, colQuantite + 15 - quantityWidth, currentY);

                    const priceStr = `${unitPrice.toFixed(2)} ${settings.defaultCurrency}`;
                    const priceWidth = doc.getTextWidth(priceStr);
                    doc.text(priceStr, colPrixUnitaire + 20 - priceWidth, currentY);

                    const totalStr = `${total.toFixed(2)} ${settings.defaultCurrency}`;
                    const totalWidth = doc.getTextWidth(totalStr);
                    doc.text(totalStr, colTotal + 20 - totalWidth, currentY);

                    currentY += 7;
                }

                // Total
                currentY += 3;
                doc.line(margin, currentY, maxWidth, currentY);
                currentY += 5;
                doc.setFont('helvetica', 'bold');
                const totalLabel = 'Total:';
                const totalValue = `${totalAmount.toFixed(2)} ${settings.defaultCurrency}`;
                doc.text(totalLabel, colPrixUnitaire, currentY);
                // Aligner la valeur du total à droite de la colonne Total
                const totalValueWidth = doc.getTextWidth(totalValue);
                doc.text(totalValue, colTotal + 20 - totalValueWidth, currentY);
                yPos = currentY;
            }

            // Notes
            if (receiptData.notes) {
                yPos += 10;
                if (yPos > 250) {
                    doc.addPage();
                    yPos = margin;
                }
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text('Notes:', margin, yPos);
                yPos += 7;
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                const notesLines = doc.splitTextToSize(receiptData.notes, pageWidth - 2 * margin);
                doc.text(notesLines, margin, yPos);
            }

            // Pied de page
            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                const footerY = doc.internal.pageSize.getHeight() - 10;
                doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
                const dateStr = new Date().toLocaleDateString('fr-FR');
                const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                doc.text(`Généré le ${dateStr} à ${timeStr}`, margin, footerY);
            }

            // Télécharger le PDF
            const fileName = `reception-${receiptData.id}-${formatDate(receiptData.received_at).replace(/\//g, '-').replace(/\s/g, '-')}.pdf`;
            doc.save(fileName);
            setSuccess('PDF exporté avec succès!');
        } catch (err: any) {
            console.error('Erreur lors de l\'export PDF:', err);
            setError('Erreur lors de l\'export PDF');
        }
    };

    // Fonction pour exporter toutes les réceptions filtrées en PDF
    const exportAllReceiptsPDF = async () => {
        try {
            if (filteredRows.length === 0) {
                setError('Aucune réception à exporter');
                return;
            }

            // Charger toutes les réceptions avec leurs détails complets
            const allReceipts = await getJSON(API(`/receipts`)) as any[];
            const receiptsWithDetails = filteredRows.map(filteredRow => {
                const fullReceipt = Array.isArray(allReceipts) ? allReceipts.find((r: any) => r.id === filteredRow.id) : null;
                return fullReceipt || filteredRow;
            });

            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            let yPos = margin;

            // En-tête principal
            doc.setFontSize(18);
            doc.setTextColor(16, 185, 129); // emerald-500
            doc.text('Rapport des Réceptions de Produits', margin, yPos);
            yPos += 10;

            // Informations de filtre
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            const filters: string[] = [];
            if (dateFilter) filters.push(`Date: ${formatDate(dateFilter)}`);
            if (searchQuery) filters.push(`Recherche: ${searchQuery}`);

            if (filters.length > 0) {
                doc.text(`Filtres appliqués: ${filters.join(' | ')}`, margin, yPos);
                yPos += 7;
            }

            doc.text(`Total: ${filteredRows.length} réception${filteredRows.length > 1 ? 's' : ''}`, margin, yPos);
            yPos += 10;

            // Parcourir toutes les réceptions
            for (let idx = 0; idx < receiptsWithDetails.length; idx++) {
                const receiptData = receiptsWithDetails[idx];

                // Vérifier si on a besoin d'une nouvelle page
                if (yPos > 250) {
                    doc.addPage();
                    yPos = margin;
                }

                // Titre de la réception
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(16, 185, 129);
                doc.text(`Réception #${receiptData.id}`, margin, yPos);
                yPos += 8;

                // Informations de la réception
                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(`Fournisseur: ${receiptData.supplier || 'ND'}`, margin, yPos);
                yPos += 6;
                doc.text(`Agent responsable: ${receiptData.agent || 'ND'}`, margin, yPos);
                yPos += 6;
                if (receiptData.acquirer) {
                    doc.text(`Acquéreur: ${receiptData.acquirer}`, margin, yPos);
                    yPos += 6;
                }
                if (receiptData.persons_present && receiptData.persons_present !== 'ND') {
                    doc.text(`Personnes présentes: ${receiptData.persons_present}`, margin, yPos);
                    yPos += 6;
                }
                doc.text(`Date: ${formatDate(receiptData.received_at)}`, margin, yPos);
                yPos += 8;

                // Tableau des produits si disponible
                if (receiptData.items && receiptData.items.length > 0) {
                    // Vérifier si on a besoin d'une nouvelle page pour le tableau
                    if (yPos > 220) {
                        doc.addPage();
                        yPos = margin;
                    }

                    doc.setFontSize(11);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Produits reçus:', margin, yPos);
                    yPos += 6;

                    doc.setFontSize(9);
                    let currentY = yPos;

                    // Positions des colonnes
                    const colProduit = margin;
                    const colQuantite = margin + 70;
                    const colPrixUnitaire = margin + 95;
                    const colTotal = margin + 135;
                    const maxWidth = pageWidth - margin;

                    // En-têtes du tableau
                    doc.setFont('helvetica', 'bold');
                    doc.text('Produit', colProduit, currentY);
                    doc.text('Qté', colQuantite, currentY);
                    doc.text('Prix unit.', colPrixUnitaire, currentY);
                    doc.text('Total', colTotal, currentY);
                    currentY += 5;

                    // Ligne de séparation
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, currentY, maxWidth, currentY);
                    currentY += 4;

                    // Lignes du tableau
                    doc.setFont('helvetica', 'normal');
                    let totalAmount = 0;
                    for (const item of receiptData.items) {
                        if (currentY > 250) {
                            doc.addPage();
                            currentY = margin;
                        }

                        // Pour les réceptions en attente, utiliser product_name si disponible
                        let productName = item.product_name || '';
                        
                        // Si product_id existe, essayer de trouver le produit par ID
                        if (item.product_id) {
                            const product = products.find(p => p.id === item.product_id);
                            if (product) {
                                productName = product.name;
                            } else if (!productName) {
                                productName = `Produit #${item.product_id}`;
                            }
                        }
                        
                        // Si toujours pas de nom, utiliser un fallback
                        if (!productName || productName.trim() === '') {
                            productName = item.product_ref ? `Produit ${item.product_ref}` : 'Produit sans nom';
                        }
                        
                        const quantity = item.quantity || 0;
                        const unitPrice = item.unit_price || 0;
                        const total = quantity * unitPrice;
                        totalAmount += total;

                        // Tronquer le nom du produit si trop long
                        const displayName = productName.length > 25 ? productName.substring(0, 22) + '...' : productName;
                        doc.text(displayName, colProduit, currentY);

                        // Aligner à droite pour les nombres
                        const quantityStr = quantity.toString();
                        const quantityWidth = doc.getTextWidth(quantityStr);
                        doc.text(quantityStr, colQuantite + 15 - quantityWidth, currentY);

                        const priceStr = `${unitPrice.toFixed(2)} ${settings.defaultCurrency}`;
                        const priceWidth = doc.getTextWidth(priceStr);
                        doc.text(priceStr, colPrixUnitaire + 20 - priceWidth, currentY);

                        const totalStr = `${total.toFixed(2)} ${settings.defaultCurrency}`;
                        const totalWidth = doc.getTextWidth(totalStr);
                        doc.text(totalStr, colTotal + 20 - totalWidth, currentY);

                        currentY += 6;
                    }

                    // Total de la réception
                    currentY += 2;
                    doc.line(margin, currentY, maxWidth, currentY);
                    currentY += 4;
                    doc.setFont('helvetica', 'bold');
                    const totalLabel = 'Total:';
                    const totalValue = `${totalAmount.toFixed(2)} ${settings.defaultCurrency}`;
                    doc.text(totalLabel, colPrixUnitaire, currentY);
                    const totalValueWidth = doc.getTextWidth(totalValue);
                    doc.text(totalValue, colTotal + 20 - totalValueWidth, currentY);
                    yPos = currentY;
                } else {
                    // Si pas d'items, afficher juste le nombre d'articles
                    doc.text(`Nombre d'articles: ${receiptData.items_count || 0}`, margin, yPos);
                    yPos += 6;
                }

                // Notes (abrégées si trop longues)
                if (receiptData.notes) {
                    yPos += 4;
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.text('Notes:', margin, yPos);
                    yPos += 5;
                    doc.setFont('helvetica', 'normal');
                    const notesPreview = receiptData.notes.length > 100
                        ? receiptData.notes.substring(0, 97) + '...'
                        : receiptData.notes;
                    const notesLines = doc.splitTextToSize(notesPreview, pageWidth - 2 * margin);
                    doc.text(notesLines, margin, yPos);
                    yPos += notesLines.length * 5;
                }

                // Séparateur entre les réceptions (sauf pour la dernière)
                if (idx < receiptsWithDetails.length - 1) {
                    yPos += 5;
                    if (yPos > 250) {
                        doc.addPage();
                        yPos = margin;
                    }
                    doc.setDrawColor(200, 200, 200);
                    doc.line(margin, yPos, pageWidth - margin, yPos);
                    yPos += 8;
                }
            }

            // Pied de page
            const pageCount = doc.internal.pages.length - 1;
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                const footerY = doc.internal.pageSize.getHeight() - 10;
                doc.text(`Page ${i} / ${pageCount}`, pageWidth / 2, footerY, { align: 'center' });
                const dateStr = new Date().toLocaleDateString('fr-FR');
                const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
                doc.text(`Généré le ${dateStr} à ${timeStr}`, margin, footerY);
            }

            // Télécharger le PDF
            const fileName = `receptions-${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(fileName);
            setSuccess('Toutes les réceptions ont été exportées en PDF avec succès!');
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
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <CubeIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <label className="text-lg font-bold text-gray-800">
                                        Produits à recevoir <span className="text-red-500">*</span>
                                    </label>
                                </div>
                                <button
                                    type="button"
                                    onClick={addLine}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                    <span>Ajouter une ligne</span>
                                </button>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                <table className="min-w-full">
                                    <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Réf. produit</th>
                                            <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Nom du produit</th>
                                            <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Catégorie</th>
                                            <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité</th>
                                            <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Prix unitaire</th>
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
                                                <td className="px-4 py-3 min-w-[200px]">
                                                    <select
                                                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm bg-white dark:bg-gray-800 dark:text-white dark:border-gray-600"
                                                        value={it.product_category_id || ''}
                                                        onChange={e => updateLine(idx, { product_category_id: e.target.value })}
                                                    >
                                                        <option value="">Sélectionneune catégorie</option>
                                                        {categories.map(cat => (
                                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                                        ))}
                                                    </select>
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

                        {/* Informations de la réception */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                    <InboxIcon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Informations de la réception</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Fournisseur <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
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
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Nom de l'agent"
                                        value={agent}
                                        onChange={e => setAgent(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Acquéreur</label>
                                    <input
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Nom de l'acquéreur"
                                        value={acquirer}
                                        onChange={e => setAcquirer(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Commissions de reception</label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Ex: Jean Dupont, Marie Martin, Pierre Durand"
                                        value={personsPresent}
                                        onChange={e => setPersonsPresent(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Date de réception</label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        value={date}
                                        onChange={e => setDate(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Observation */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <label className="text-lg font-bold text-gray-800">Observation</label>
                            </div>
                            <textarea
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm resize-none"
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
                        {/* Search Bar et Filtre Date */}
                        <div className="flex items-center gap-3">
                            {filteredRows.length > receiptsItemsPerPage && (
                                <p className="text-sm text-gray-600">
                                    {((receiptsCurrentPage - 1) * receiptsItemsPerPage + 1)} - {Math.min(receiptsCurrentPage * receiptsItemsPerPage, filteredRows.length)} sur {filteredRows.length}
                                </p>
                            )}
                            <div className="relative w-80">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Rechercher réf, fournisseur, agent, observation..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setReceiptsCurrentPage(1);
                                    }}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                />
                            </div>
                            <input
                                type="date"
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value);
                                    setReceiptsCurrentPage(1);
                                }}
                                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                placeholder="Filtrer par date"
                            />
                            {dateFilter && (
                                <button
                                    onClick={() => setDateFilter('')}
                                    className="px-3 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
                                    title="Effacer le filtre de date"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={exportAllReceiptsPDF}
                                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-medium"
                                title="Exporter toutes les réceptions filtrées en PDF"
                            >
                                <DocumentArrowDownIcon className="w-5 h-5" />
                                Exporter tout en PDF
                            </button>
                        </div>
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                <tr>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Fournisseur</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs tabular-nums">Nbre articles</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Date réception</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Agent Resp</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Acquéreur</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Comission</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-6 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                            <InboxIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucune réception trouvée</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredRows
                                        .slice((receiptsCurrentPage - 1) * receiptsItemsPerPage, receiptsCurrentPage * receiptsItemsPerPage)
                                        .map(r => (
                                        <tr key={r.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-6 py-5 font-semibold text-gray-900">{r.supplier || 'ND'}</td>
                                            <td className="px-6 py-5 text-left tabular-nums font-medium text-gray-700">{r.items_count}</td>
                                            <td className="px-6 py-5 text-gray-700 font-medium">{formatDate(r.received_at)}</td>
                                            <td className="px-6 py-5 text-gray-700">{r.agent || 'ND'}</td>
                                            <td className="px-6 py-5 text-gray-700">{r.acquirer || 'ND'}</td>
                                            <td className="px-6 py-5 text-gray-700">{r.persons_present || 'ND'}</td>
                                            <td className="px-6 py-5">
                                                {(() => {
                                                    const statusInfo = getStatusInfo(r.status);
                                                    return (
                                                        <span className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm text-white ${statusInfo.color}`}>
                                                            {statusInfo.label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openDetailModal(r)}
                                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-110"
                                                        aria-label="détails"
                                                        title="Voir les détails"
                                                    >
                                                        <EyeIcon className="w-5 h-5" />
                                                    </button>
                                                    {/* Boutons d'approbation/rejet - UNIQUEMENT pour les admins */}
                                                    {user && user.role === 'Administrateur' && r.status === 'pending' && r.pending_operation_id && (
                                                        <>
                                                            <button
                                                                onClick={() => approveReceipt(r.pending_operation_id!)}
                                                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-all transform hover:scale-110"
                                                                aria-label="approuver"
                                                                title="Approuver la réception"
                                                            >
                                                                <CheckCircleIcon className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => rejectReceipt(r.pending_operation_id!)}
                                                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                                aria-label="rejeter"
                                                                title="Rejeter la réception"
                                                            >
                                                                <XCircleIcon className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {/* Boutons modifier et supprimer - pour toutes les réceptions (sauf rejetées) */}
                                                    {r.status !== 'rejected' && (
                                                        <>
                                                            <button
                                                                onClick={() => openEditModal(r)}
                                                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all transform hover:scale-110"
                                                                aria-label="éditer"
                                                                title="Modifier"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => openDeleteModal(r)}
                                                                className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                                aria-label="supprimer"
                                                                title="Supprimer"
                                                            >
                                                                <TrashIcon className="w-5 h-5" />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {filteredRows.length > receiptsItemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setReceiptsCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={receiptsCurrentPage === 1}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        receiptsCurrentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                    }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredRows.length / receiptsItemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const totalPages = Math.ceil(filteredRows.length / receiptsItemsPerPage);
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - receiptsCurrentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const totalPages = Math.ceil(filteredRows.length / receiptsItemsPerPage);
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;
                                            
                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setReceiptsCurrentPage(page)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${
                                                            receiptsCurrentPage === page
                                                                ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg'
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
                                    onClick={() => setReceiptsCurrentPage(prev => Math.min(Math.ceil(filteredRows.length / receiptsItemsPerPage), prev + 1))}
                                    disabled={receiptsCurrentPage >= Math.ceil(filteredRows.length / receiptsItemsPerPage)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                                        receiptsCurrentPage >= Math.ceil(filteredRows.length / receiptsItemsPerPage)
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

                {/* Modal de modification */}
                {isEditModalOpen && editingReceipt && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Modifier la réception</h3>
                                <button
                                    onClick={closeEditModal}
                                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">
                                            Fournisseur
                                        </label>
                                        <input
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                            placeholder="Nom du fournisseur"
                                            value={supplier}
                                            onChange={e => setSupplier(e.target.value)}
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
                                        <label className="text-sm font-semibold mb-2 block">Acquéreur</label>
                                        <input
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                            placeholder="Nom de l'acquéreur"
                                            value={acquirer}
                                            onChange={e => setAcquirer(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Personnes présentes</label>
                                        <input
                                            type="text"
                                            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                            placeholder="Ex: Jean Dupont, Marie Martin, Pierre Durand"
                                            value={personsPresent}
                                            onChange={e => setPersonsPresent(e.target.value)}
                                        />
                                    </div>
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
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                                <button
                                    onClick={closeEditModal}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={updateReceipt}
                                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                                >
                                    Enregistrer les modifications
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de suppression */}
                {isDeleteModalOpen && receiptToDelete && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                            <div className="text-center">
                                <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                    <TrashIcon className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Supprimer la réception</h3>
                                <p className="text-gray-600 mb-6">
                                    Êtes-vous sûr de vouloir supprimer cette réception ? Cette action annulera également les quantités ajoutées aux produits. Cette action est irréversible.
                                </p>
                                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                    <p className="text-sm text-gray-700"><strong>Fournisseur:</strong> {receiptToDelete.supplier || 'ND'}</p>
                                    <p className="text-sm text-gray-700"><strong>Date:</strong> {formatDate(receiptToDelete.received_at)}</p>
                                    <p className="text-sm text-gray-700"><strong>Articles:</strong> {receiptToDelete.items_count}</p>
                                </div>
                                <div className="flex items-center justify-center gap-3">
                                    <button
                                        onClick={closeDeleteModal}
                                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={deleteReceipt}
                                        className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-red-800 transition-all transform hover:scale-105 font-medium"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de détails */}
                {isDetailModalOpen && detailReceipt && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <EyeIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Détails de la réception</h3>
                                </div>
                                <button
                                    onClick={closeDetailModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                    aria-label="fermer"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Informations générales */}
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4">Informations générales</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Fournisseur</p>
                                            <p className="text-base font-semibold text-gray-900">{detailReceipt.supplier || 'ND'}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Date de réception</p>
                                            <p className="text-base font-semibold text-gray-900">{formatDate(detailReceipt.received_at)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Agent responsable</p>
                                            <p className="text-base font-semibold text-gray-900">{detailReceipt.agent || 'ND'}</p>
                                        </div>
                                        {detailReceipt.acquirer && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Acquéreur</p>
                                                <p className="text-base font-semibold text-gray-900">{detailReceipt.acquirer}</p>
                                            </div>
                                        )}
                                        {detailReceipt.persons_present && detailReceipt.persons_present !== 'ND' && (
                                            <div className="col-span-2">
                                                <p className="text-sm text-gray-600 mb-1">Personnes présentes</p>
                                                <p className="text-base font-semibold text-gray-900">{detailReceipt.persons_present}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Produits reçus */}
                                {detailReceipt.items && detailReceipt.items.length > 0 && (
                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-4">Produits reçus ({detailReceipt.items.length})</h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full">
                                                <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                                    <tr>
                                                        <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Produit</th>
                                                        <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Quantité</th>
                                                        <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Prix unitaire</th>
                                                        <th className="text-left px-4 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {detailReceipt.items.map((item: any, idx: number) => {
                                                        // Pour les réceptions en attente, utiliser product_name si disponible
                                                        let productName = item.product_name || '';
                                                        
                                                        // Si product_id existe, essayer de trouver le produit par ID
                                                        if (item.product_id) {
                                                            const product = products.find(p => p.id === item.product_id);
                                                            if (product) {
                                                                productName = product.name;
                                                            } else if (!productName) {
                                                                productName = `Produit #${item.product_id}`;
                                                            }
                                                        }
                                                        
                                                        // Si toujours pas de nom, utiliser un fallback
                                                        if (!productName || productName.trim() === '') {
                                                            productName = item.product_ref ? `Produit ${item.product_ref}` : 'Produit sans nom';
                                                        }
                                                        
                                                        const quantity = item.quantity || 0;
                                                        const unitPrice = item.unit_price || 0;
                                                        const total = quantity * unitPrice;
                                                        return (
                                                            <tr key={idx} className="border-t">
                                                                <td className="px-4 py-3 text-gray-900 font-medium">{productName}</td>
                                                                <td className="px-4 py-3 text-gray-700 tabular-nums">{quantity}</td>
                                                                <td className="px-4 py-3 text-gray-700 tabular-nums">{formatCurrency(unitPrice)}</td>
                                                                <td className="px-4 py-3 text-gray-900 font-semibold tabular-nums">{formatCurrency(total)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-gray-200">
                                                    <tr>
                                                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">Total:</td>
                                                        <td className="px-4 py-3 text-gray-900 font-bold tabular-nums">
                                                            {formatCurrency(
                                                                detailReceipt.items.reduce((sum: number, item: any) => {
                                                                    const quantity = item.quantity || 0;
                                                                    const unitPrice = item.unit_price || 0;
                                                                    return sum + (quantity * unitPrice);
                                                                }, 0)
                                                            )}
                                                        </td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Notes */}
                                {detailReceipt.notes && (
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3">Notes</h4>
                                        <p className="text-base text-gray-700 whitespace-pre-wrap">{detailReceipt.notes}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                                <button
                                    onClick={() => exportReceiptPDF(detailReceipt)}
                                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 font-medium"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    Exporter en PDF
                                </button>
                                <button
                                    onClick={closeDetailModal}
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
