import React, { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useSettings } from '../contexts/SettingsContext';
import {
    ChartBarIcon,
    DocumentArrowDownIcon,
    CalendarDaysIcon,
    CurrencyDollarIcon,
    CubeIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    ArrowTrendingDownIcon,
    ShoppingCartIcon,
    TruckIcon,
    ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';
import { jsPDF } from 'jspdf';

type Product = {
    id: number;
    name: string;
    category: string;
    quantity: number;
    price: number;
    critical_level: number;
};

type StockOut = {
    id: number;
    product_id: number;
    product?: { name: string };
    quantity: number;
    price?: number;
    beneficiary?: string;
    movement_date: string;
    exit_type?: string;
};

type ReceiptItem = {
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
};

type Receipt = {
    id: number;
    supplier: string | null;
    agent: string;
    received_at: string;
    items_count: number;
    items?: ReceiptItem[];
};

type Inventory = {
    id: number;
    agent: string;
    counted_at: string;
    items?: InventoryItem[];
};

type InventoryItem = {
    product_id: number;
    product?: { name: string };
    variance: number;
    counted_qty: number;
    theoretical_qty: number;
};

type ReceiptItemType = {
    id: number;
    product_id: number;
    quantity: number;
    unit_price: number;
};

export default function ReportsPage() {
    const { settings } = useSettings();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Données
    const [stats, setStats] = useState<any>({});
    const [products, setProducts] = useState<Product[]>([]);
    const [stockOuts, setStockOuts] = useState<StockOut[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [inventories, setInventories] = useState<Inventory[]>([]);

    useEffect(() => {
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - 30);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    }, []);

    useEffect(() => {
        if (startDate && endDate) {
            loadData();
        }
    }, [startDate, endDate]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            const [statsData, productsData, stockOutsData, receiptsData, inventoriesData] = await Promise.all([
                getJSON(API('/stats')) as Promise<any>,
                getJSON(API('/products')) as Promise<any>,
                getJSON(API('/stockouts')) as Promise<any>,
                getJSON(API('/receipts')) as Promise<any>,
                getJSON(API('/inventories')) as Promise<any>,
            ]);

            setStats(statsData);
            setProducts((productsData.items || []) as Product[]);
            setStockOuts((stockOutsData || []) as StockOut[]);
            setReceipts((receiptsData || []) as Receipt[]);
            setInventories((inventoriesData || []) as Inventory[]);
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
        } finally {
            setLoading(false);
        }
    };

    const filterByDate = (dateStr: string) => {
        if (!startDate || !endDate || !dateStr) return true;
        const date = new Date(dateStr);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return date >= start && date <= end;
    };

    const filteredStockOuts = stockOuts.filter(s => filterByDate(s.movement_date));
    const filteredReceipts = receipts.filter(r => filterByDate(r.received_at));
    const filteredInventories = inventories.filter(i => filterByDate(i.counted_at));

    // Calculs des rapports
    const totalStockValue = products.reduce((sum, p) => sum + (p.quantity * p.price), 0);
    const lowStockProducts = products.filter(p => p.quantity > 0 && p.quantity <= p.critical_level);
    const outOfStockProducts = products.filter(p => p.quantity <= 0);

    const totalStockOutsValue = filteredStockOuts.reduce((sum, s) => {
        const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
        return sum + (s.quantity * price);
    }, 0);

    const totalReceiptsValue = filteredReceipts.reduce((sum, r) => {
        if (r.items && r.items.length > 0) {
            return sum + r.items.reduce((itemSum: number, item: ReceiptItemType) => {
                return itemSum + (item.quantity * item.unit_price);
            }, 0);
        }
        const avgPrice = products.length > 0
            ? products.reduce((s, p) => s + p.price, 0) / products.length
            : 0;
        return sum + (r.items_count * avgPrice);
    }, 0);

    const totalStockOutsQuantity = filteredStockOuts.reduce((sum, s) => sum + s.quantity, 0);
    const totalReceiptsQuantity = filteredReceipts.reduce((sum, r) => {
        if (r.items && r.items.length > 0) {
            return sum + r.items.reduce((itemSum: number, item: ReceiptItemType) => {
                return itemSum + item.quantity;
            }, 0);
        }
        return sum + r.items_count;
    }, 0);

    // Top bénéficiaires
    const beneficiaryMap = new Map<string, { count: number; quantity: number; value: number }>();
    filteredStockOuts.forEach(s => {
        if (s.beneficiary) {
            const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
            const value = s.quantity * price;
            if (!beneficiaryMap.has(s.beneficiary)) {
                beneficiaryMap.set(s.beneficiary, { count: 0, quantity: 0, value: 0 });
            }
            const data = beneficiaryMap.get(s.beneficiary)!;
            data.count++;
            data.quantity += s.quantity;
            data.value += value;
        }
    });
    const topBeneficiaries = Array.from(beneficiaryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    // Top produits sortis
    const productOutMap = new Map<number, { name: string; quantity: number; value: number }>();
    filteredStockOuts.forEach(s => {
        const product = products.find(p => p.id === s.product_id);
        if (product) {
            const price = s.price || product.price;
            if (!productOutMap.has(s.product_id)) {
                productOutMap.set(s.product_id, { name: product.name, quantity: 0, value: 0 });
            }
            const data = productOutMap.get(s.product_id)!;
            data.quantity += s.quantity;
            data.value += s.quantity * price;
        }
    });
    const topProductsOut = Array.from(productOutMap.values())
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

    // Écarts d'inventaire
    const inventoryVariances = filteredInventories.flatMap(inv =>
        (inv.items || []).map(item => ({
            product: products.find(p => p.id === item.product_id)?.name || `Produit #${item.product_id}`,
            variance: item.variance,
            date: inv.counted_at,
            agent: inv.agent,
        }))
    ).filter(item => item.variance !== 0);

    const formatDate = useMemo(() => {
        const localeMap: { [key: string]: string } = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'es': 'es-ES'
        };
        const locale = localeMap[settings.language] || 'fr-FR';

        return (dateStr: string) => {
            if (!dateStr) return 'N/A';
            try {
                const date = new Date(dateStr);
                return date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
            } catch {
                return 'N/A';
            }
        };
    }, [settings.language]);

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

    const buildReportHTML = () => {
        const style = `
            <style>
                @media print {
                    @page { margin: 1cm; size: A4; }
                    body { margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                    .page-break { page-break-after: always; }
                }
                body { 
                    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; 
                    color: #111827; 
                    margin: 0; 
                    padding: 20px;
                    background: white;
                }
                h1 { font-size: 24px; margin: 0 0 8px; color: #111827; }
                h2 { 
                    font-size: 18px; 
                    margin: 24px 0 8px; 
                    color: #111827;
                    border-bottom: 2px solid #10b981;
                    padding-bottom: 8px;
                }
                .muted { color: #6B7280; font-size: 14px; }
                .kpis { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 12px; 
                    margin: 20px 0;
                }
                .kpi { 
                    border: 1px solid #E5E7EB; 
                    border-radius: 10px; 
                    padding: 12px;
                    background: #F9FAFB;
                }
                .kpi strong { font-size: 18px; color: #111827; }
                table { 
                    width: 100%; 
                    border-collapse: collapse; 
                    font-size: 11px;
                    margin: 16px 0;
                }
                th, td { 
                    text-align: left; 
                    padding: 8px; 
                    border-bottom: 1px solid #E5E7EB;
                }
                th { 
                    background: #F9FAFB; 
                    font-weight: 600;
                    color: #111827;
                }
                tr:hover { background: #F9FAFB; }
                .footer { 
                    margin-top: 40px; 
                    font-size: 11px; 
                    color: #6B7280;
                    text-align: center;
                    border-top: 1px solid #E5E7EB;
                    padding-top: 16px;
                }
            </style>
        `;

        const fmt = (n: number) => formatCurrency(n);
        const d = (ds: string) => formatDate(ds);

        const topOutRows = topProductsOut.map(p => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>${fmt(p.value)}</td></tr>`).join('');
        const benRows = topBeneficiaries.map(b => `<tr><td>${b.name}</td><td>${b.count}</td><td>${b.quantity}</td><td>${fmt(b.value)}</td></tr>`).join('');
        const lowRows = lowStockProducts.slice(0, 50).map(p => `<tr><td>${p.name}</td><td>${p.quantity}</td><td>${p.critical_level}</td></tr>`).join('');
        const receiptsRows = filteredReceipts.slice(0, 200).map(r => `<tr><td>${d(r.received_at)}</td><td>${r.items_count}</td></tr>`).join('');
        const outsRows = filteredStockOuts.slice(0, 200).map(s => `<tr><td>${d(s.movement_date)}</td><td>${s.product?.name || products.find(p => p.id === s.product_id)?.name || ('#' + s.product_id)}</td><td>${s.quantity}</td><td>${fmt((s.price || products.find(p => p.id === s.product_id)?.price || 0) * s.quantity)}</td></tr>`).join('');

        return `<!doctype html><html><head><meta charset="utf-8" />${style}<title>Rapport StockPro</title></head><body>
            <h1>Rapport & Analyses</h1>
            <div class="muted">Période: ${startDate || '—'} → ${endDate || '—'}</div>
            <div class="kpis">
              <div class="kpi"><div class="muted">Valeur du stock</div><div><strong>${fmt(totalStockValue)}</strong></div></div>
              <div class="kpi"><div class="muted">Valeur réceptions</div><div><strong>${fmt(totalReceiptsValue)}</strong></div></div>
              <div class="kpi"><div class="muted">Valeur sorties</div><div><strong>${fmt(totalStockOutsValue)}</strong></div></div>
            </div>

            <h2>Top 5 Produits Sortis</h2>
            <table><thead><tr><th>Produit</th><th>Quantité</th><th>Valeur</th></tr></thead><tbody>${topOutRows}</tbody></table>

            <h2>Top 5 Bénéficiaires</h2>
            <table><thead><tr><th>Bénéficiaire</th><th>Sorties</th><th>Unités</th><th>Valeur</th></tr></thead><tbody>${benRows}</tbody></table>

            <h2>Produits à Faible Stock</h2>
            <table><thead><tr><th>Produit</th><th>Stock</th><th>Seuil</th></tr></thead><tbody>${lowRows}</tbody></table>

            <h2>Réceptions</h2>
            <table><thead><tr><th>Date</th><th>Articles</th></tr></thead><tbody>${receiptsRows}</tbody></table>

            <h2>Sorties</h2>
            <table><thead><tr><th>Date</th><th>Produit</th><th>Quantité</th><th>Valeur</th></tr></thead><tbody>${outsRows}</tbody></table>

            <div class="footer">Généré par StockPro • ${new Date().toLocaleString()}</div>
        </body></html>`;
    };

    const exportPDF = () => {
        try {
            console.log('Début export PDF téléchargeable...');

            // Fonction de formatage de devise pour PDF (sans caractères spéciaux)
            const formatCurrencyForPDF = (value: number): string => {
                const localeMap: { [key: string]: string } = {
                    'fr': 'fr-FR',
                    'en': 'en-US',
                    'es': 'es-ES'
                };
                const locale = localeMap[settings.language] || 'fr-FR';
                const currency = settings.defaultCurrency;

                // Utiliser toLocaleString puis nettoyer les caractères spéciaux
                const formatted = new Intl.NumberFormat(locale, {
                    style: 'currency',
                    currency: currency,
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                }).format(value);

                // Remplacer les espaces insécables et autres caractères spéciaux par des espaces normaux
                return formatted
                    .replace(/\u00A0/g, ' ') // Espace insécable → espace normal
                    .replace(/\u202F/g, ' ') // Espace fine insécable → espace normal
                    .replace(/\s+/g, ' ') // Multiples espaces → un seul espace
                    .trim();
            };

            // Créer un nouveau document PDF
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            let yPosition = margin;
            const lineHeight = 7;
            const fontSize = 12;

            // Fonction pour ajouter une nouvelle page si nécessaire
            const checkNewPage = (spaceNeeded: number = lineHeight) => {
                if (yPosition + spaceNeeded > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            };

            // En-tête
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Rapport & Analyses StockPro', margin, yPosition);
            yPosition += lineHeight * 1.5;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            const periodStart = startDate || 'N/A';
            const periodEnd = endDate || 'N/A';
            doc.text(`Période: ${periodStart} - ${periodEnd}`, margin, yPosition);
            yPosition += lineHeight * 1.5;

            // Ligne de séparation
            doc.setDrawColor(200, 200, 200);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += lineHeight;

            // KPIs
            checkNewPage(lineHeight * 4);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Indicateurs Clés', margin, yPosition);
            yPosition += lineHeight * 1.5;

            doc.setFontSize(fontSize);
            doc.setFont('helvetica', 'normal');
            const kpis = [
                { label: 'Valeur du stock', value: formatCurrencyForPDF(totalStockValue) },
                { label: 'Valeur réceptions', value: formatCurrencyForPDF(totalReceiptsValue) },
                { label: 'Valeur sorties', value: formatCurrencyForPDF(totalStockOutsValue) },
            ];

            kpis.forEach(kpi => {
                checkNewPage(lineHeight * 1.5);
                doc.text(`${kpi.label}:`, margin, yPosition);
                doc.setFont('helvetica', 'bold');
                doc.text(kpi.value, pageWidth - margin - 60, yPosition, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                yPosition += lineHeight * 1.2;
            });

            yPosition += lineHeight;

            // Top 5 Produits Sortis
            if (topProductsOut.length > 0) {
                checkNewPage(lineHeight * 8);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Top 5 Produits Sortis', margin, yPosition);
                yPosition += lineHeight * 1.5;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Produit', margin, yPosition);
                doc.text('Quantité', pageWidth - margin - 50, yPosition, { align: 'right' });
                doc.text('Valeur', pageWidth - margin, yPosition, { align: 'right' });
                yPosition += lineHeight;

                doc.setFont('helvetica', 'normal');
                topProductsOut.forEach((prod, idx) => {
                    checkNewPage(lineHeight * 1.5);
                    doc.text(`${idx + 1}. ${prod.name}`, margin + 5, yPosition);
                    doc.text(String(prod.quantity), pageWidth - margin - 50, yPosition, { align: 'right' });
                    doc.text(formatCurrencyForPDF(prod.value), pageWidth - margin, yPosition, { align: 'right' });
                    yPosition += lineHeight * 1.2;
                });
                yPosition += lineHeight;
            }

            // Top Bénéficiaires
            if (topBeneficiaries.length > 0) {
                checkNewPage(lineHeight * 10);
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Top 5 Bénéficiaires', margin, yPosition);
                yPosition += lineHeight * 1.5;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Bénéficiaire', margin, yPosition);
                doc.text('Sorties', pageWidth - margin - 80, yPosition, { align: 'right' });
                doc.text('Unités', pageWidth - margin - 50, yPosition, { align: 'right' });
                doc.text('Valeur', pageWidth - margin, yPosition, { align: 'right' });
                yPosition += lineHeight;

                doc.setFont('helvetica', 'normal');
                topBeneficiaries.forEach((ben, idx) => {
                    checkNewPage(lineHeight * 1.5);
                    doc.text(`${idx + 1}. ${ben.name}`, margin + 5, yPosition);
                    doc.text(String(ben.count), pageWidth - margin - 80, yPosition, { align: 'right' });
                    doc.text(String(ben.quantity), pageWidth - margin - 50, yPosition, { align: 'right' });
                    doc.text(formatCurrencyForPDF(ben.value), pageWidth - margin, yPosition, { align: 'right' });
                    yPosition += lineHeight * 1.2;
                });
                yPosition += lineHeight;
            }

            // Produits à Faible Stock
            if (lowStockProducts.length > 0) {
                checkNewPage(lineHeight * (Math.min(lowStockProducts.length, 10) + 4));
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.text('Produits à Faible Stock', margin, yPosition);
                yPosition += lineHeight * 1.5;

                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.text('Produit', margin, yPosition);
                doc.text('Stock', pageWidth - margin - 40, yPosition, { align: 'right' });
                doc.text('Seuil', pageWidth - margin, yPosition, { align: 'right' });
                yPosition += lineHeight;

                doc.setFont('helvetica', 'normal');
                lowStockProducts.slice(0, 10).forEach(p => {
                    checkNewPage(lineHeight * 1.5);
                    doc.text(p.name, margin + 5, yPosition);
                    doc.text(String(p.quantity), pageWidth - margin - 40, yPosition, { align: 'right' });
                    doc.text(String(p.critical_level), pageWidth - margin, yPosition, { align: 'right' });
                    yPosition += lineHeight * 1.2;
                });
                yPosition += lineHeight;
            }

            // Footer sur chaque page
            const addFooter = () => {
                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(128, 128, 128);
                    const now = new Date();
                    const day = String(now.getDate()).padStart(2, '0');
                    const month = String(now.getMonth() + 1).padStart(2, '0');
                    const year = now.getFullYear();
                    const hours = String(now.getHours()).padStart(2, '0');
                    const minutes = String(now.getMinutes()).padStart(2, '0');
                    const footerDate = `${day}/${month}/${year} à ${hours}:${minutes}`;
                    doc.text(
                        `Page ${i} sur ${pageCount} - Généré le ${footerDate}`,
                        pageWidth / 2,
                        pageHeight - 10,
                        { align: 'center' }
                    );
                    doc.setTextColor(0, 0, 0);
                }
            };

            // Ajouter le footer
            addFooter();

            // Télécharger le PDF
            const fileName = `stockpro-rapport_${startDate || 'all'}_${endDate || 'all'}.pdf`;
            doc.save(fileName);

            console.log('PDF généré et téléchargé avec succès');

        } catch (e) {
            console.error('Erreur export PDF:', e);
            alert('Échec de l\'export PDF : ' + (e instanceof Error ? e.message : 'Erreur inconnue'));
        }
    };

    const exportExcel = async () => {
        // Tente d'abord un export .xlsx via SheetJS, sinon fallback CSV
        try {
            const XLSX = await import('xlsx');

            const aoaKpis = [
                ['KPI', 'Valeur'],
                ['Valeur du stock', totalStockValue],
                ['Valeur réceptions', totalReceiptsValue],
                ['Valeur sorties', totalStockOutsValue],
            ];
            const aoaTopOut = [
                ['Produit', 'Quantité', 'Valeur'],
                ...topProductsOut.map(p => [p.name, p.quantity, p.value]),
            ];
            const aoaBen = [
                ['Bénéficiaire', 'Sorties', 'Unités', 'Valeur'],
                ...topBeneficiaries.map(b => [b.name, b.count, b.quantity, b.value]),
            ];
            const aoaLow = [
                ['Produit', 'Stock', 'Seuil'],
                ...lowStockProducts.map(p => [p.name, p.quantity, p.critical_level]),
            ];
            const aoaReceipts = [
                ['Date', 'Articles'],
                ...filteredReceipts.map(r => [r.received_at, r.items_count]),
            ];
            const aoaOuts = [
                ['Date', 'Produit', 'Quantité', 'Valeur'],
                ...filteredStockOuts.map(s => {
                    const prodName = s.product?.name || products.find(p => p.id === s.product_id)?.name || ('#' + s.product_id);
                    const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
                    return [s.movement_date, prodName, s.quantity, price * s.quantity];
                }),
            ];

            const wb = XLSX.utils.book_new();
            const meta = [[`Rapport StockPro`], ['Période', startDate || '', endDate || '']];
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(meta), 'Résumé');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaKpis), 'KPIs');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaTopOut), 'Top Produits');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaBen), 'Bénéficiaires');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaLow), 'Faible stock');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaReceipts), 'Réceptions');
            XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoaOuts), 'Sorties');

            const filename = `stockpro-rapport_${startDate || ''}_${endDate || ''}.xlsx`;
            XLSX.writeFile(wb, filename);
            return;
        } catch (e) {
            console.warn('xlsx indisponible, fallback CSV');
        }

        try {
            const delimiter = settings.language === 'fr' ? ';' : ','; // Excel FR préfère souvent ';'
            const quote = '"';
            const escapeCell = (v: string | number) => `${quote}${String(v).replace(/"/g, '""')}${quote}`;
            const lines: string[] = [];
            const add = (row: (string | number)[]) => lines.push(row.map(escapeCell).join(delimiter));

            // En-tête + indice de séparateur pour Excel
            lines.push(`sep=${delimiter}`);
            add(['Rapport StockPro']);
            add(['Période', `${startDate || ''}`, `${endDate || ''}`]);
            add(['']);

            // KPIs
            add(['KPI', 'Valeur']);
            add(['Valeur du stock', `${totalStockValue}`]);
            add(['Valeur réceptions', `${totalReceiptsValue}`]);
            add(['Valeur sorties', `${totalStockOutsValue}`]);
            add(['']);

            // Top produits sortis
            add(['Top Produits Sortis']);
            add(['Produit', 'Quantité', 'Valeur']);
            topProductsOut.forEach(p => add([p.name, p.quantity, p.value]));
            add(['']);

            // Top bénéficiaires
            add(['Top Bénéficiaires']);
            add(['Bénéficiaire', 'Sorties', 'Unités', 'Valeur']);
            topBeneficiaries.forEach(b => add([b.name, b.count, b.quantity, b.value]));
            add(['']);

            // Faible stock
            add(['Produits à Faible Stock']);
            add(['Produit', 'Stock', 'Seuil']);
            lowStockProducts.forEach(p => add([p.name, p.quantity, p.critical_level]));
            add(['']);

            // Réceptions
            add(['Réceptions']);
            add(['Date', 'Articles']);
            filteredReceipts.forEach(r => add([r.received_at, r.items_count]));
            add(['']);

            // Sorties
            add(['Sorties']);
            add(['Date', 'Produit', 'Quantité', 'Valeur']);
            filteredStockOuts.forEach(s => {
                const prodName = s.product?.name || products.find(p => p.id === s.product_id)?.name || ('#' + s.product_id);
                const price = s.price || products.find(p => p.id === s.product_id)?.price || 0;
                add([s.movement_date, prodName, s.quantity, price * s.quantity]);
            });

            const csv = lines.join('\n');
            // Ajout d'un BOM pour Excel afin de reconnaître l'UTF-8
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });

            // IE/Edge (legacy) support
            // @ts-ignore
            if (window.navigator && window.navigator.msSaveOrOpenBlob) {
                // @ts-ignore
                window.navigator.msSaveOrOpenBlob(blob, `stockpro-rapport_${startDate || ''}_${endDate || ''}.csv`);
                return;
            }

            const url = (window.URL || window.webkitURL).createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.setAttribute('download', `stockpro-rapport_${startDate || ''}_${endDate || ''}.csv`);
            a.setAttribute('target', '_blank');
            document.body.appendChild(a);
            a.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
            setTimeout(() => {
                document.body.removeChild(a);
                (window.URL || window.webkitURL).revokeObjectURL(url);
            }, 0);
        } catch (e) {
            console.error(e);
            alert('Échec de l’export Excel/CSV');
        }
    };

    // Calcul des pourcentages pour les graphiques
    const netBalance = totalReceiptsValue - totalStockOutsValue;
    const stockHealth = products.length > 0
        ? ((products.length - lowStockProducts.length - outOfStockProducts.length) / products.length * 100).toFixed(1)
        : '0';

    if (loading) {
        return (
            <Layout>
                <div className="p-7">
                    <TopBar />
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header avec filtres et export */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Rapports & Analyses</h1>
                            <p className="text-emerald-100">Visualisez et analysez vos données de stock</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log('Bouton PDF cliqué');
                                    exportPDF();
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm cursor-pointer"
                                type="button"
                            >
                                <DocumentArrowDownIcon className="w-5 h-5" />
                                PDF
                            </button>
                            <button
                                onClick={(e) => { e.preventDefault(); exportExcel(); }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors backdrop-blur-sm cursor-pointer"
                                type="button"
                            >
                                <DocumentArrowDownIcon className="w-5 h-5" />
                                Excel
                            </button>
                        </div>
                    </div>

                    {/* Filtres de période */}
                    <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-lg p-4">
                        <CalendarDaysIcon className="w-5 h-5 text-white" />
                        <div className="flex items-center gap-4">
                            <div>
                                <label className="text-sm font-medium text-emerald-100 mb-1 block">Date de début</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-emerald-200"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-emerald-100 mb-1 block">Date de fin</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-2 border border-white/20 bg-white/10 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50 placeholder:text-emerald-200"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-100">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* KPIs Principaux */}
                <div className="grid grid-cols-4 gap-6">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <CurrencyDollarIcon className="w-8 h-8 text-blue-100" />
                            <ArrowTrendingUpIcon className="w-5 h-5 text-blue-100" />
                        </div>
                        <p className="text-blue-100 text-sm font-medium mb-1">Valeur du stock</p>
                        <p className="text-3xl font-bold">{formatCurrency(totalStockValue)}</p>
                    </div>

                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <CubeIcon className="w-8 h-8 text-purple-100" />
                            <ArrowTrendingUpIcon className="w-5 h-5 text-purple-100" />
                        </div>
                        <p className="text-purple-100 text-sm font-medium mb-1">Total produits</p>
                        <p className="text-3xl font-bold">{products.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <ExclamationTriangleIcon className="w-8 h-8 text-orange-100" />
                            <ArrowTrendingDownIcon className="w-5 h-5 text-orange-100" />
                        </div>
                        <p className="text-orange-100 text-sm font-medium mb-1">Stock faible</p>
                        <p className="text-3xl font-bold">{lowStockProducts.length}</p>
                    </div>

                    <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
                        <div className="flex items-center justify-between mb-4">
                            <ExclamationTriangleIcon className="w-8 h-8 text-red-100" />
                            <ArrowTrendingDownIcon className="w-5 h-5 text-red-100" />
                        </div>
                        <p className="text-red-100 text-sm font-medium mb-1">En rupture</p>
                        <p className="text-3xl font-bold">{outOfStockProducts.length}</p>
                    </div>
                </div>

                {/* Section Mouvements */}
                <div className="grid grid-cols-2 gap-6">
                    {/* Sorties */}
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <ArrowTrendingDownIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Sorties de Stock</h2>
                                <p className="text-sm text-gray-500">Période sélectionnée</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                <p className="text-sm text-red-700 font-medium mb-1">Nombre de sorties</p>
                                <p className="text-2xl font-bold text-red-600">{filteredStockOuts.length}</p>
                                <p className="text-xs text-red-600 mt-1">{totalStockOutsQuantity} unités</p>
                            </div>
                            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                <p className="text-sm text-red-700 font-medium mb-1">Valeur totale</p>
                                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalStockOutsValue)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Réceptions */}
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Réceptions</h2>
                                <p className="text-sm text-gray-500">Période sélectionnée</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="text-sm text-green-700 font-medium mb-1">Nombre de réceptions</p>
                                <p className="text-2xl font-bold text-green-600">{filteredReceipts.length}</p>
                                <p className="text-xs text-green-600 mt-1">{totalReceiptsQuantity} articles</p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="text-sm text-green-700 font-medium mb-1">Valeur totale</p>
                                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceiptsValue)}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bilan Financier */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                            <CurrencyDollarIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Bilan Financier</h2>
                            <p className="text-sm text-gray-500">Analyse des mouvements financiers</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                        <div className="text-center p-6 bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200">
                            <p className="text-sm text-green-700 font-medium mb-2">Réceptions</p>
                            <p className="text-3xl font-bold text-green-600 mb-1">{formatCurrency(totalReceiptsValue)}</p>
                            <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                                <ArrowTrendingUpIcon className="w-4 h-4" />
                                <span>Entrées</span>
                            </div>
                        </div>

                        <div className="text-center p-6 bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200">
                            <p className="text-sm text-red-700 font-medium mb-2">Sorties</p>
                            <p className="text-3xl font-bold text-red-600 mb-1">{formatCurrency(totalStockOutsValue)}</p>
                            <div className="flex items-center justify-center gap-1 text-xs text-red-600">
                                <ArrowTrendingDownIcon className="w-4 h-4" />
                                <span>Sorties</span>
                            </div>
                        </div>

                        <div className={`text-center p-6 rounded-xl border ${netBalance >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200'}`}>
                            <p className="text-sm font-medium mb-2" style={{ color: netBalance >= 0 ? '#065f46' : '#92400e' }}>Solde net</p>
                            <p className={`text-3xl font-bold mb-1 ${netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                {formatCurrency(netBalance)}
                            </p>
                            <div className={`flex items-center justify-center gap-1 text-xs ${netBalance >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
                                {netBalance >= 0 ? (
                                    <ArrowTrendingUpIcon className="w-4 h-4" />
                                ) : (
                                    <ArrowTrendingDownIcon className="w-4 h-4" />
                                )}
                                <span>{netBalance >= 0 ? 'Positif' : 'Négatif'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Bénéficiaires */}
                {topBeneficiaries.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <ShoppingCartIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Top 5 Bénéficiaires</h2>
                                <p className="text-sm text-gray-500">Par valeur totale des sorties</p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {topBeneficiaries.map((ben, idx) => {
                                const maxValue = topBeneficiaries[0]?.value || 1;
                                const percentage = (ben.value / maxValue) * 100;
                                return (
                                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900">{ben.name}</p>
                                                    <p className="text-xs text-gray-500">{ben.count} sorties • {ben.quantity} unités</p>
                                                </div>
                                            </div>
                                            <p className="text-xl font-bold text-purple-600">{formatCurrency(ben.value)}</p>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-purple-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Top Produits Sortis */}
                {topProductsOut.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                <TruckIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Top 5 Produits Sortis</h2>
                                <p className="text-sm text-gray-500">Par quantité sortie</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {topProductsOut.map((prod, idx) => {
                                const maxQuantity = topProductsOut[0]?.quantity || 1;
                                const percentage = (prod.quantity / maxQuantity) * 100;
                                return (
                                    <div key={idx} className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-4 border border-indigo-200">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                                                    {idx + 1}
                                                </span>
                                                <p className="font-semibold text-gray-900 text-sm">{prod.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-lg font-bold text-indigo-600">{prod.quantity} unités</p>
                                            <p className="text-sm font-medium text-gray-600">{formatCurrency(prod.value)}</p>
                                        </div>
                                        <div className="w-full bg-indigo-200 rounded-full h-1.5">
                                            <div
                                                className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-1.5 rounded-full transition-all duration-500"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Produits à faible stock */}
                {lowStockProducts.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Produits à Faible Stock</h2>
                                <p className="text-sm text-gray-500">Attention requise</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            {lowStockProducts.slice(0, 6).map((p) => (
                                <div key={p.id} className="bg-orange-50 rounded-lg p-4 border border-orange-200 hover:shadow-md transition-shadow">
                                    <p className="font-semibold text-gray-900 mb-1">{p.name}</p>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs text-gray-500">Stock actuel</p>
                                            <p className="text-lg font-bold text-orange-600">{p.quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-500">Seuil</p>
                                            <p className="text-lg font-bold text-gray-700">{p.critical_level}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 w-full bg-orange-200 rounded-full h-1.5">
                                        <div
                                            className="bg-orange-500 h-1.5 rounded-full"
                                            style={{ width: `${Math.min((p.quantity / p.critical_level) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Écarts d'inventaire */}
                {inventoryVariances.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                <ClipboardDocumentCheckIcon className="w-6 h-6 text-yellow-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Écarts d'Inventaire</h2>
                                <p className="text-sm text-gray-500">{inventoryVariances.length} écarts détectés</p>
                            </div>
                        </div>

                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Produit</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Date</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Agent</th>
                                        <th className="text-left px-4 py-3 font-semibold text-gray-700">Écart</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inventoryVariances.slice(0, 10).map((item, idx) => (
                                        <tr key={idx} className="border-t hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.product}</td>
                                            <td className="px-4 py-3 text-gray-600">{formatDate(item.date)}</td>
                                            <td className="px-4 py-3 text-gray-600">{item.agent}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${item.variance > 0
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {item.variance > 0 ? '+' : ''}{item.variance}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {inventoryVariances.length > 10 && (
                            <p className="text-sm text-gray-500 mt-4 text-center">
                                Affichage des 10 premiers écarts sur {inventoryVariances.length}
                            </p>
                        )}
                    </div>
                )}

                {/* Santé du stock */}
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 flex items-center justify-center">
                            <ChartBarIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Santé du Stock</h2>
                            <p className="text-sm text-gray-600">Indicateur global</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-gray-700">Produits en bon état</span>
                            <span className="text-2xl font-bold text-emerald-600">{stockHealth}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-4 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                                style={{ width: `${stockHealth}%` }}
                            >
                                <span className="text-xs font-medium text-white">{stockHealth}%</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-4 mt-6">
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">Produits normaux</p>
                                <p className="text-xl font-bold text-emerald-600">
                                    {products.length - lowStockProducts.length - outOfStockProducts.length}
                                </p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">Stock faible</p>
                                <p className="text-xl font-bold text-orange-600">{lowStockProducts.length}</p>
                            </div>
                            <div className="text-center">
                                <p className="text-sm text-gray-600 mb-1">En rupture</p>
                                <p className="text-xl font-bold text-red-600">{outOfStockProducts.length}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
