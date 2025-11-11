import React, { useEffect, useState, FormEvent, useMemo } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import {
    TruckIcon,
    MagnifyingGlassIcon,
    XMarkIcon,
    EyeIcon,
    DocumentArrowDownIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    ArrowTrendingUpIcon,
    MapPinIcon,
    ClipboardDocumentCheckIcon,
    ExclamationTriangleIcon,
    PlusIcon,
    TrashIcon,
    WrenchScrewdriverIcon,
    ClockIcon,
    DocumentTextIcon,
    ChevronLeftIcon,
    ChevronRightIcon
} from '@heroicons/react/24/outline';
import { getJSON, API } from '../utils/api';
import { useSettings } from '../contexts/SettingsContext';

type Vehicle = {
    id: number;
    type: string;
    designation: string;
    chassis_number: string;
    plate_number: string;
    acquisition_date: string;
    acquirer: string;
    reception_commission?: string;
    observations?: string;
    status: 'pending' | 'assigned' | 'reformed';
    reformed_at?: string;
    reform_reason?: string;
    reform_agent?: string;
    reform_destination?: string;
    reform_notes?: string;
    assignment?: {
        id: number;
        region: string;
        recipient: string;
        structure?: string;
        district?: string;
        assigned_at: string;
    };
};

const VEHICLE_TYPES = ['moto', 'voiture', 'ambulance', 'camion', 'autres'];
const REGIONS = ['Dakar', 'Diourbel', 'Kaolack', 'Louga', 'Saint-Louis', 'Tambacounda', 'Ziguinchor', 'Thiès'];
const MAINTENANCE_TYPES = ['Entretien préventif', 'Vidange', 'Réparation', 'Révision', 'Autre'];
const REFORM_REASONS = ['Vétusté', 'Accident majeur', 'Coûts élevés', 'Fin de vie', 'Autre'];
const REFORM_DESTINATIONS = ['Vente', 'Don', 'Destruction', 'Stockage'];

type VehicleRow = {
    type: string;
    designation: string;
    chassis_number: string;
    plate_number: string;
    acquisition_date: string;
    acquirer: string;
};

type Maintenance = {
    id: number;
    vehicle_id: number;
    vehicle?: {
        id: number;
        plate_number: string;
        designation: string;
    };
    type: string;
    maintenance_date: string;
    mileage?: number;
    cost: number;
    agent: string;
    next_maintenance_date?: string;
    next_maintenance_mileage?: number;
    observations?: string;
};

export default function VehiclesPage() {
    const { settings } = useSettings();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // États pour le formulaire de réception - système de lignes multiples
    const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>([{
        type: '',
        designation: '',
        chassis_number: '',
        plate_number: '',
        acquisition_date: new Date().toISOString().slice(0, 10),
        acquirer: ''
    }]);

    // Champs globaux pour toute la réception (comme dans receipts)
    const [receptionCommission, setReceptionCommission] = useState<string>('');
    const [observations, setObservations] = useState<string>('');

    // États pour le formulaire d'affectation
    const [selectedVehicle, setSelectedVehicle] = useState<string>('');
    const [assignmentRegion, setAssignmentRegion] = useState<string>('');
    const [recipient, setRecipient] = useState<string>('');
    const [structure, setStructure] = useState<string>('');
    const [district, setDistrict] = useState<string>('');

    // Filtres
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [acquirerFilter, setAcquirerFilter] = useState<string>('');
    const [yearFilter, setYearFilter] = useState<string>('');

    // Pagination pour les véhicules
    const [pendingVehiclesCurrentPage, setPendingVehiclesCurrentPage] = useState(1);
    const [allVehiclesCurrentPage, setAllVehiclesCurrentPage] = useState(1);
    const [vehiclesItemsPerPage] = useState(10);

    // États pour les maintenances
    const [maintenances, setMaintenances] = useState<Maintenance[]>([]);
    const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
    const [maintenanceCurrentPage, setMaintenanceCurrentPage] = useState(1);
    const [maintenanceItemsPerPage] = useState(10);
    const [maintenanceVehicleId, setMaintenanceVehicleId] = useState<string>('');
    const [maintenanceType, setMaintenanceType] = useState<string>('');
    const [maintenanceDate, setMaintenanceDate] = useState<string>('');
    const [maintenanceMileage, setMaintenanceMileage] = useState<string>('');
    const [maintenanceCost, setMaintenanceCost] = useState<string>('');
    const [maintenanceAgent, setMaintenanceAgent] = useState<string>('');
    const [nextMaintenanceDate, setNextMaintenanceDate] = useState<string>('');
    const [nextMaintenanceMileage, setNextMaintenanceMileage] = useState<string>('');
    const [maintenanceObservations, setMaintenanceObservations] = useState<string>('');

    // États pour les modals
    const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'informations' | 'affectations' | 'maintenances' | 'reform' | 'timeline'>('informations');
    const [vehicleToUnassign, setVehicleToUnassign] = useState<Vehicle | null>(null);
    const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
    const [unassignAgent, setUnassignAgent] = useState<string>('');
    const [unassignReason, setUnassignReason] = useState<string>('');

    // États pour le modal de réforme
    const [vehicleToReform, setVehicleToReform] = useState<Vehicle | null>(null);
    const [isReformModalOpen, setIsReformModalOpen] = useState(false);
    const [reformReason, setReformReason] = useState<string>('');
    const [reformAgent, setReformAgent] = useState<string>('');
    const [reformDestination, setReformDestination] = useState<string>('');
    const [reformNotes, setReformNotes] = useState<string>('');

    // Initialize date on client side only
    useEffect(() => {
        if (vehicleRows.length > 0 && !vehicleRows[0].acquisition_date) {
            const defaultDate = new Date().toISOString().slice(0, 10);
            setVehicleRows([{ ...vehicleRows[0], acquisition_date: defaultDate }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const load = async () => {
        try {
            const data = await getJSON(API('/vehicles')) as any;
            setVehicles(Array.isArray(data) ? data : []);
            setError('');
        } catch (err: any) {
            console.error('Erreur de chargement:', err);
            setError(err?.message || 'Erreur de chargement');
            setVehicles([]);
        }
    };

    const loadMaintenances = async () => {
        try {
            const data = await getJSON(API('/maintenances')) as any;
            setMaintenances(Array.isArray(data) ? data : []);
        } catch (err: any) {
            console.error('Erreur de chargement des maintenances:', err);
            setMaintenances([]);
        }
    };

    useEffect(() => {
        load();
        loadMaintenances();
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

    // Fonctions pour gérer les lignes de véhicules
    const addLine = () => {
        setVehicleRows([...vehicleRows, {
            type: '',
            designation: '',
            chassis_number: '',
            plate_number: '',
            acquisition_date: new Date().toISOString().slice(0, 10),
            acquirer: ''
        }]);
    };

    const updateLine = (i: number, patch: Partial<VehicleRow>) => {
        setVehicleRows(vehicleRows.map((row, idx) => idx === i ? { ...row, ...patch } : row));
    };

    const removeLine = (i: number) => {
        if (vehicleRows.length > 1) {
            setVehicleRows(vehicleRows.filter((_, idx) => idx !== i));
        } else {
            // Si c'est la dernière ligne, on la remet à vide
            setVehicleRows([{
                type: '',
                designation: '',
                chassis_number: '',
                plate_number: '',
                acquisition_date: new Date().toISOString().slice(0, 10),
                acquirer: ''
            }]);
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

    const formatDateLong = (dateStr: string | null | undefined) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'N/A';
            const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
            const day = date.getDate();
            const month = months[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        } catch {
            return 'N/A';
        }
    };

    const saveReception = async (e: FormEvent) => {
        e.preventDefault();
        try {
            // Filtrer les lignes valides (avec tous les champs obligatoires remplis)
            const validRows = vehicleRows.filter(row =>
                row.type &&
                row.designation.trim() &&
                row.chassis_number.trim() &&
                row.plate_number.trim() &&
                row.acquisition_date &&
                row.acquirer.trim()
            );

            if (validRows.length === 0) {
                setError('Veuillez remplir au moins une ligne avec tous les champs obligatoires');
                setSuccess('');
                return;
            }

            // Envoyer tous les véhicules avec les champs globaux
            const promises = validRows.map(row =>
                getJSON(API('/vehicles'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: row.type,
                        designation: row.designation.trim(),
                        chassis_number: row.chassis_number.trim(),
                        plate_number: row.plate_number.trim(),
                        acquisition_date: row.acquisition_date,
                        acquirer: row.acquirer.trim(),
                        reception_commission: receptionCommission.trim() || undefined,
                        observations: observations.trim() || undefined,
                    })
                })
            );

            await Promise.all(promises);

            // Réinitialiser le formulaire
            setVehicleRows([{
                type: '',
                designation: '',
                chassis_number: '',
                plate_number: '',
                acquisition_date: new Date().toISOString().slice(0, 10),
                acquirer: ''
            }]);
            setReceptionCommission('');
            setObservations('');
            setSuccess(`${validRows.length} véhicule(s) enregistré(s) avec succès!`);
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'enregistrement:', err);
            setError(err?.message || 'Erreur lors de l\'enregistrement de la réception');
            setSuccess('');
        }
    };

    const saveAssignment = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (!selectedVehicle || !assignmentRegion || !recipient) {
                setError('Veuillez remplir tous les champs obligatoires');
                setSuccess('');
                return;
            }

            const payload = {
                vehicle_id: Number(selectedVehicle),
                region: assignmentRegion,
                recipient,
                structure: structure || undefined,
                district: district || undefined,
            };

            await getJSON(API('/vehicles/assign'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Réinitialiser le formulaire
            setSelectedVehicle('');
            setAssignmentRegion('');
            setRecipient('');
            setStructure('');
            setDistrict('');
            setSuccess('Véhicule affecté avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de l\'affectation:', err);
            setError(err?.message || 'Erreur lors de l\'affectation du véhicule');
            setSuccess('');
        }
    };

    const openUnassignModal = (vehicle: Vehicle) => {
        setVehicleToUnassign(vehicle);
        setUnassignAgent('');
        setUnassignReason('');
        setIsUnassignModalOpen(true);
    };

    const closeUnassignModal = () => {
        setIsUnassignModalOpen(false);
        setVehicleToUnassign(null);
        setUnassignAgent('');
        setUnassignReason('');
    };

    const confirmUnassign = async () => {
        if (!vehicleToUnassign || !unassignAgent.trim() || !unassignReason.trim()) {
            setError('Veuillez remplir tous les champs obligatoires');
            return;
        }

        try {
            await getJSON(API(`/vehicles/${vehicleToUnassign.id}/unassign`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    agent: unassignAgent.trim(),
                    reason: unassignReason.trim(),
                })
            });
            setSuccess('Véhicule désaffecté avec succès!');
            closeUnassignModal();
            await load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la désaffectation');
        }
    };

    const openReformModal = (vehicle: Vehicle) => {
        setVehicleToReform(vehicle);
        setReformReason('');
        setReformAgent('');
        setReformDestination('');
        setReformNotes('');
        setIsReformModalOpen(true);
    };

    const closeReformModal = () => {
        setIsReformModalOpen(false);
        setVehicleToReform(null);
        setReformReason('');
        setReformAgent('');
        setReformDestination('');
        setReformNotes('');
    };

    const confirmReform = async () => {
        if (!vehicleToReform || !reformReason || !reformAgent.trim() || !reformDestination) {
            setError('Veuillez remplir tous les champs obligatoires');
            setSuccess('');
            return;
        }

        try {
            await getJSON(API(`/vehicles/${vehicleToReform.id}/reform`), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reform_reason: reformReason,
                    reform_agent: reformAgent.trim(),
                    reform_destination: reformDestination,
                    reform_notes: reformNotes.trim() || undefined
                })
            });

            closeReformModal();
            setSuccess('Véhicule réformé avec succès!');
            await load();
        } catch (err: any) {
            console.error('Erreur lors de la réforme:', err);
            setError(err?.message || 'Erreur lors de la réforme du véhicule');
            setSuccess('');
        }
    };

    const openDetailModal = (vehicle: Vehicle) => {
        setDetailVehicle(vehicle);
        setActiveTab('informations');
        setIsDetailModalOpen(true);
    };

    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setDetailVehicle(null);
        setActiveTab('informations');
    };

    const openMaintenanceModal = (vehicleId?: number) => {
        if (vehicleId) {
            setMaintenanceVehicleId(vehicleId.toString());
        }
        setMaintenanceDate(new Date().toISOString().slice(0, 10));
        setIsMaintenanceModalOpen(true);
    };

    const closeMaintenanceModal = () => {
        setIsMaintenanceModalOpen(false);
        setMaintenanceVehicleId('');
        setMaintenanceType('');
        setMaintenanceDate(new Date().toISOString().slice(0, 10));
        setMaintenanceMileage('');
        setMaintenanceCost('');
        setMaintenanceAgent('');
        setNextMaintenanceDate('');
        setNextMaintenanceMileage('');
        setMaintenanceObservations('');
    };

    const saveMaintenance = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (!maintenanceVehicleId || !maintenanceType || !maintenanceDate || !maintenanceCost || !maintenanceAgent) {
                setError('Veuillez remplir tous les champs obligatoires');
                setSuccess('');
                return;
            }

            const payload = {
                vehicle_id: Number(maintenanceVehicleId),
                type: maintenanceType,
                maintenance_date: maintenanceDate,
                mileage: maintenanceMileage ? Number(maintenanceMileage) : undefined,
                cost: Number(maintenanceCost),
                agent: maintenanceAgent,
                next_maintenance_date: nextMaintenanceDate || undefined,
                next_maintenance_mileage: nextMaintenanceMileage ? Number(nextMaintenanceMileage) : undefined,
                observations: maintenanceObservations || undefined,
            };

            await getJSON(API('/maintenances'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            closeMaintenanceModal();
            setSuccess('Maintenance enregistrée avec succès!');
            await loadMaintenances();
            setMaintenanceCurrentPage(1); // Retourner à la première page après ajout
        } catch (err: any) {
            console.error('Erreur lors de l\'enregistrement:', err);
            setError(err?.message || 'Erreur lors de l\'enregistrement de la maintenance');
            setSuccess('');
        }
    };

    // Calcul des alertes de maintenance
    const maintenanceAlertsCount = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const in7Days = new Date(today);
        in7Days.setDate(in7Days.getDate() + 7);

        return maintenances.filter(m => {
            if (!m.next_maintenance_date) return false;
            const nextDate = new Date(m.next_maintenance_date);
            nextDate.setHours(0, 0, 0, 0);
            return nextDate <= in7Days;
        }).length;
    }, [maintenances]);

    // Statistiques
    const stats = useMemo(() => {
        const total = vehicles.length;
        const assigned = vehicles.filter(v => v.status === 'assigned').length;
        const reformed = vehicles.filter(v => v.status === 'reformed').length;
        const assignmentRate = total > 0 ? Math.round((assigned / total) * 100) : 0;
        const reformRate = total > 0 ? Math.round((reformed / total) * 100) : 0;

        const byType = vehicles.reduce((acc, v) => {
            acc[v.type] = (acc[v.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const mostCommonType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0]?.[0] || 'moto';

        const regions = new Set(vehicles.filter(v => v.assignment?.region).map(v => v.assignment!.region));
        const regionsCount = regions.size;

        const byRegion = vehicles.reduce((acc, v) => {
            if (v.assignment?.region) {
                acc[v.assignment.region] = (acc[v.assignment.region] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        const byAcquirer = vehicles.reduce((acc, v) => {
            acc[v.acquirer] = (acc[v.acquirer] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            total,
            assigned,
            reformed,
            assignmentRate,
            reformRate,
            mostCommonType,
            regionsCount,
            byType,
            byRegion,
            byAcquirer
        };
    }, [vehicles]);

    // Filtres
    const filteredVehicles = vehicles.filter(vehicle => {
        const matchesSearch = searchQuery === '' ||
            vehicle.designation?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            vehicle.chassis_number?.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesType = typeFilter === '' || vehicle.type === typeFilter;
        const matchesAcquirer = acquirerFilter === '' || vehicle.acquirer === acquirerFilter;

        const matchesYear = yearFilter === '' ||
            (vehicle.acquisition_date && vehicle.acquisition_date.startsWith(yearFilter));

        return matchesSearch && matchesType && matchesAcquirer && matchesYear;
    });

    const pendingVehicles = filteredVehicles.filter(v => v.status === 'pending');
    const reformedVehicles = filteredVehicles.filter(v => v.status === 'reformed');
    const assignedVehicles = filteredVehicles.filter(v => v.status === 'assigned');

    const availableVehicles = vehicles.filter(v => v.status === 'pending');
    const uniqueAcquirers = Array.from(new Set(vehicles.map(v => v.acquirer))).filter(Boolean);
    const availableYears = Array.from(new Set(vehicles.map(v => v.acquisition_date?.slice(0, 4)))).filter(Boolean).sort().reverse();

    return (
        <Layout>
            <div className="pt-24 px-4 sm:px-6 pb-7 space-y-6 overflow-x-hidden max-w-full">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-4 sm:p-6 text-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold mb-2">Gestion du Parc de Automobiles</h1>
                            <p className="text-sm sm:text-base text-emerald-100">Gérez les réceptions, affectations et suivi des véhicules</p>
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <TruckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-l-4 border-red-500 px-4 sm:px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{error}</span>
                        <button type="button" onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-200 text-red-700 hover:text-red-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {success && (
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 text-emerald-700 border-l-4 border-emerald-500 px-4 sm:px-6 py-4 rounded-lg shadow-md flex items-center justify-between">
                        <span className="font-medium">{success}</span>
                        <button type="button" onClick={() => setSuccess('')} className="ml-4 p-1 rounded-full hover:bg-emerald-200 text-emerald-700 hover:text-emerald-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Statistiques */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">TOTAL VÉHICULES</p>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 ml-2">
                                <TruckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">TAUX D'AFFECTATION</p>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.assignmentRate}%</p>
                                <div className="mt-1 sm:mt-2">
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                        <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5 sm:mr-1" />
                                        {stats.assignmentRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 ml-2">
                                <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl hover:scale-105 hover:border-gray-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">VÉHICULES RÉFORMÉS</p>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.reformed}</p>
                                <div className="mt-1 sm:mt-2">
                                    <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                                        <ArrowTrendingUpIcon className="w-3 h-3 mr-0.5 sm:mr-1" />
                                        {stats.reformRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center flex-shrink-0 ml-2">
                                <TrashIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">PAR TYPE</p>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900 lowercase truncate">{stats.mostCommonType}</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 ml-2">
                                <ClipboardDocumentCheckIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-gray-600 mb-1 truncate">RÉGIONS COUVERTES</p>
                                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.regionsCount}</p>
                            </div>
                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 ml-2">
                                <MapPinIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Répartition */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Véhicules par Type</h3>
                        <div className="space-y-2">
                            {Object.entries(stats.byType).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between">
                                    <span className="text-gray-700 capitalize">{type}</span>
                                    <span className="text-lg font-bold text-emerald-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Répartition par Région</h3>
                        <div className="space-y-2">
                            {Object.entries(stats.byRegion).map(([region, count]) => (
                                <div key={region} className="flex items-center justify-between">
                                    <span className="text-gray-700">{region}</span>
                                    <span className="text-lg font-bold text-emerald-600">{count}</span>
                                </div>
                            ))}
                            {Object.keys(stats.byRegion).length === 0 && (
                                <p className="text-gray-500 text-sm">Aucune région</p>
                            )}
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Véhicules par Acquéreur</h3>
                        <div className="space-y-2">
                            {Object.entries(stats.byAcquirer).map(([acquirer, count]) => (
                                <div key={acquirer} className="flex items-center justify-between">
                                    <span className="text-gray-700">{acquirer}</span>
                                    <span className="text-lg font-bold text-emerald-600">{count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Formulaire de réception */}
                <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-4 sm:p-5 mb-4 sm:mb-5 -m-4 sm:-m-5 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <CheckCircleIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Réception de Véhicule</h2>
                        </div>
                    </div>

                    <form onSubmit={saveReception} className="space-y-6">
                        {/* Véhicules à recevoir */}
                        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-5 border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                        <TruckIcon className="w-5 h-5 text-white" />
                                    </div>
                                    <label className="text-lg font-bold text-gray-800">
                                        Véhicules à recevoir <span className="text-red-500">*</span>
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
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                        <tr>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs hidden sm:table-cell">Châssis</th>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Date d'acquisition</th>
                                            <th className="text-left px-2 sm:px-3 py-3 text-sm text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Acquéreur</th>
                                            <th className="w-10 sm:w-12"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {vehicleRows.map((row, idx) => (
                                            <tr key={idx} className="border-t">
                                                <td className="px-2 sm:px-3 py-3">
                                                    <select
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm bg-white"
                                                        value={row.type}
                                                        onChange={e => updateLine(idx, { type: e.target.value })}
                                                    >
                                                        <option value="">Sélectionnez un type</option>
                                                        {VEHICLE_TYPES.map(type => (
                                                            <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-2 sm:px-3 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        placeholder="Ex: Toyota Hilux"
                                                        value={row.designation}
                                                        onChange={e => updateLine(idx, { designation: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-3 hidden sm:table-cell">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm font-mono"
                                                        placeholder="Numéro de châssis"
                                                        value={row.chassis_number}
                                                        onChange={e => updateLine(idx, { chassis_number: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm font-mono"
                                                        placeholder="Numéro de plaque"
                                                        value={row.plate_number}
                                                        onChange={e => updateLine(idx, { plate_number: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-3 hidden md:table-cell">
                                                    <input
                                                        type="date"
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        value={row.acquisition_date}
                                                        onChange={e => updateLine(idx, { acquisition_date: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-3 hidden md:table-cell">
                                                    <input
                                                        type="text"
                                                        className="w-full border border-gray-300 rounded-lg px-2 sm:px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                                        placeholder="Acquéreur"
                                                        value={row.acquirer}
                                                        onChange={e => updateLine(idx, { acquirer: e.target.value })}
                                                    />
                                                </td>
                                                <td className="px-2 sm:px-3 py-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removeLine(idx)}
                                                        className="w-8 h-8 sm:w-10 sm:h-10 inline-flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
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

                        {/* Commission de réception */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                    <CheckCircleIcon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Informations de la réception</h3>
                            </div>
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Commission de réception
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    placeholder="Commission de réception"
                                    value={receptionCommission}
                                    onChange={e => setReceptionCommission(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Observations */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                                    </svg>
                                </div>
                                <label className="text-lg font-bold text-gray-800">Observations</label>
                            </div>
                            <textarea
                                rows={4}
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                placeholder="Ajouter des commentaires ou observations..."
                                value={observations}
                                onChange={e => setObservations(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                        >
                            <CheckCircleIcon className="w-5 h-5" />
                            Enregistrer la réception
                        </button>
                    </form>
                </div>

                {/* Formulaire d'affectation */}
                <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-4 sm:p-5 mb-4 sm:mb-5 -m-4 sm:-m-5 -mt-0">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <CalendarDaysIcon className="w-6 h-6 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Affectation de Véhicule</h2>
                        </div>
                    </div>

                    <form onSubmit={saveAssignment} className="space-y-4">
                        <div>
                            <label className="text-sm font-semibold mb-2 block">
                                Véhicule <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={selectedVehicle}
                                onChange={e => setSelectedVehicle(e.target.value)}
                                required
                            >
                                <option value="">Sélectionner un véhicule</option>
                                {availableVehicles.map(vehicle => (
                                    <option key={vehicle.id} value={vehicle.id}>
                                        {vehicle.plate_number} - {vehicle.designation}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-2 block">
                                Région <span className="text-red-500">*</span>
                            </label>
                            <select
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={assignmentRegion}
                                onChange={e => setAssignmentRegion(e.target.value)}
                                required
                            >
                                <option value="">Sélectionner une région</option>
                                {REGIONS.map(region => (
                                    <option key={region} value={region}>{region}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-2 block">
                                Destinataire <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                value={recipient}
                                onChange={e => setRecipient(e.target.value)}
                                required
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-2 block">Structure</label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder="Ex: Centre de Santé Communautaire"
                                value={structure}
                                onChange={e => setStructure(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-sm font-semibold mb-2 block">District</label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm"
                                placeholder="Ex: District Dakar Ouest"
                                value={district}
                                onChange={e => setDistrict(e.target.value)}
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-lg shadow-lg hover:from-blue-700 hover:to-indigo-800 transition-all transform hover:scale-105 font-medium"
                        >
                            <CalendarDaysIcon className="w-5 h-5" />
                            Affecter le véhicule
                        </button>
                    </form>
                </div>

                {/* Véhicules en attente d'affectation */}
                {pendingVehicles.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Véhicules en Attente d'Affectation ({pendingVehicles.length})</h2>
                                </div>
                            </div>
                            {pendingVehicles.length > vehiclesItemsPerPage && (
                                <p className="text-sm text-gray-600">
                                    {((pendingVehiclesCurrentPage - 1) * vehiclesItemsPerPage + 1)} - {Math.min(pendingVehiclesCurrentPage * vehiclesItemsPerPage, pendingVehicles.length)} sur {pendingVehicles.length}
                                </p>
                            )}
                        </div>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-md">
                                <thead className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-b-2 border-yellow-200">
                                    <tr>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Châssis</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Date d'acquisition</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Acquéreur</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVehicles
                                        .slice((pendingVehiclesCurrentPage - 1) * vehiclesItemsPerPage, pendingVehiclesCurrentPage * vehiclesItemsPerPage)
                                        .map(vehicle => (
                                            <tr key={vehicle.id} className="border-t hover:bg-yellow-50 transition-colors">
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 capitalize text-sm">{vehicle.type}</td>
                                                <td className="px-2 sm:px-3 py-5 font-semibold text-gray-900 text-sm break-words">{vehicle.designation}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 font-mono text-sm">{vehicle.plate_number}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 font-mono text-xs hidden md:table-cell">{vehicle.chassis_number}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell">{formatDate(vehicle.acquisition_date)}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell">{vehicle.acquirer}</td>
                                                <td className="px-2 sm:px-3 py-5">
                                                    <button
                                                        onClick={() => openDetailModal(vehicle)}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105 text-xs"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Détails</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination pour véhicules en attente */}
                        {pendingVehicles.length > vehiclesItemsPerPage && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPendingVehiclesCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={pendingVehiclesCurrentPage === 1}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                            }`}
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                        <span>Précédent</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.ceil(pendingVehicles.length / vehiclesItemsPerPage) }, (_, i) => i + 1)
                                            .filter(page => {
                                                const totalPages = Math.ceil(pendingVehicles.length / vehiclesItemsPerPage);
                                                if (totalPages <= 7) return true;
                                                if (page === 1 || page === totalPages) return true;
                                                if (Math.abs(page - pendingVehiclesCurrentPage) <= 1) return true;
                                                return false;
                                            })
                                            .map((page, index, array) => {
                                                const totalPages = Math.ceil(pendingVehicles.length / vehiclesItemsPerPage);
                                                const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                                const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                                return (
                                                    <React.Fragment key={page}>
                                                        {showEllipsis && (
                                                            <span className="px-2 text-gray-500">...</span>
                                                        )}
                                                        <button
                                                            onClick={() => setPendingVehiclesCurrentPage(page)}
                                                            className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage === page
                                                                ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg'
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
                                        onClick={() => setPendingVehiclesCurrentPage(prev => Math.min(Math.ceil(pendingVehicles.length / vehiclesItemsPerPage), prev + 1))}
                                        disabled={pendingVehiclesCurrentPage >= Math.ceil(pendingVehicles.length / vehiclesItemsPerPage)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage >= Math.ceil(pendingVehicles.length / vehiclesItemsPerPage)
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
                )}

                {/* Search and Filters */}
                <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Bar */}
                        <div className="flex-1 relative min-w-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par désignation, plaque, châssis..."
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    setAllVehiclesCurrentPage(1);
                                }}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                        </div>

                        {/* Year Filter */}
                        <select
                            value={yearFilter}
                            onChange={(e) => {
                                setYearFilter(e.target.value);
                                setAllVehiclesCurrentPage(1); // Réinitialiser la pagination lors du filtre
                            }}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Toutes les années</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => {
                                setTypeFilter(e.target.value);
                                setAllVehiclesCurrentPage(1);
                            }}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Tous les types</option>
                            {VEHICLE_TYPES.map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>

                        {/* Acquirer Filter */}
                        <select
                            value={acquirerFilter}
                            onChange={(e) => {
                                setAcquirerFilter(e.target.value);
                                setAllVehiclesCurrentPage(1); // Réinitialiser la pagination lors du filtre
                            }}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Tous les acquéreurs</option>
                            {uniqueAcquirers.map(acquirer => (
                                <option key={acquirer} value={acquirer}>{acquirer}</option>
                            ))}
                        </select>

                        {/* Reset Button */}
                        {(yearFilter || typeFilter || acquirerFilter || searchQuery) && (
                            <button
                                onClick={() => {
                                    setYearFilter('');
                                    setTypeFilter('');
                                    setAcquirerFilter('');
                                    setSearchQuery('');
                                    setAllVehiclesCurrentPage(1); // Réinitialiser la pagination
                                }}
                                className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors shadow-sm whitespace-nowrap"
                            >
                                Réinitialiser
                            </button>
                        )}

                        {/* Export Button */}
                        <button
                            className="inline-flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium whitespace-nowrap"
                        >
                            <DocumentArrowDownIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Exporter Excel</span>
                            <span className="sm:hidden">Excel</span>
                        </button>
                    </div>
                </div>

                {/* Tous les véhicules */}
                <div className="bg-white border rounded-xl shadow-lg p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <TruckIcon className="w-6 h-6 text-emerald-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Tous les Véhicules Acquis ({filteredVehicles.length})</h2>
                            </div>
                        </div>
                        {filteredVehicles.length > vehiclesItemsPerPage && (
                            <p className="text-sm text-gray-600">
                                {((allVehiclesCurrentPage - 1) * vehiclesItemsPerPage + 1)} - {Math.min(allVehiclesCurrentPage * vehiclesItemsPerPage, filteredVehicles.length)} sur {filteredVehicles.length}
                            </p>
                        )}
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-md">
                            <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                <tr>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Châssis</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Date</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Acquéreur</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden xl:table-cell">Destinataire</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden xl:table-cell">Région</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVehicles.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-2 sm:px-3 py-12 text-center text-gray-500">
                                            <TruckIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucun véhicule trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVehicles
                                        .slice((allVehiclesCurrentPage - 1) * vehiclesItemsPerPage, allVehiclesCurrentPage * vehiclesItemsPerPage)
                                        .map(vehicle => (
                                            <tr key={vehicle.id} className="border-t hover:bg-emerald-50 transition-colors">
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 capitalize text-sm">{vehicle.type}</td>
                                                <td className="px-2 sm:px-3 py-5 font-semibold text-gray-900 text-sm break-words">{vehicle.designation}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 font-mono text-xs hidden md:table-cell">{vehicle.chassis_number}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 font-mono text-sm">{vehicle.plate_number}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell">{formatDate(vehicle.acquisition_date)}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell">{vehicle.acquirer}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden xl:table-cell break-words">{vehicle.assignment?.recipient || 'ND'}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden xl:table-cell">{vehicle.assignment?.region || 'ND'}</td>
                                                <td className="px-2 sm:px-3 py-5">
                                                    {vehicle.status === 'assigned' ? (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold shadow-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                                                            Affecté
                                                        </span>
                                                    ) : vehicle.status === 'reformed' ? (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold shadow-sm bg-gradient-to-r from-gray-600 to-gray-700 text-white">
                                                            Réformé
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg text-xs font-semibold shadow-sm bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                                                            En attente
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-2 sm:px-3 py-5">
                                                    <div className="flex items-center gap-1 flex-wrap">
                                                        <button
                                                            onClick={() => openDetailModal(vehicle)}
                                                            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105 text-xs"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                            <span className="hidden sm:inline">Détails</span>
                                                        </button>
                                                        {vehicle.status === 'assigned' && (
                                                            <button
                                                                onClick={() => openUnassignModal(vehicle)}
                                                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-105 text-xs"
                                                            >
                                                                <XMarkIcon className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Désaffecter</span>
                                                            </button>
                                                        )}
                                                        {vehicle.status !== 'reformed' && (
                                                            <button
                                                                onClick={() => openReformModal(vehicle)}
                                                                className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 transition-all transform hover:scale-105 text-xs"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                                <span className="hidden sm:inline">Réformer</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination pour tous les véhicules */}
                    {filteredVehicles.length > vehiclesItemsPerPage && (
                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setAllVehiclesCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={allVehiclesCurrentPage === 1}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${allVehiclesCurrentPage === 1
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                        }`}
                                >
                                    <ChevronLeftIcon className="w-5 h-5" />
                                    <span>Précédent</span>
                                </button>
                                <div className="flex items-center gap-1">
                                    {Array.from({ length: Math.ceil(filteredVehicles.length / vehiclesItemsPerPage) }, (_, i) => i + 1)
                                        .filter(page => {
                                            const totalPages = Math.ceil(filteredVehicles.length / vehiclesItemsPerPage);
                                            if (totalPages <= 7) return true;
                                            if (page === 1 || page === totalPages) return true;
                                            if (Math.abs(page - allVehiclesCurrentPage) <= 1) return true;
                                            return false;
                                        })
                                        .map((page, index, array) => {
                                            const totalPages = Math.ceil(filteredVehicles.length / vehiclesItemsPerPage);
                                            const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                            const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                            return (
                                                <React.Fragment key={page}>
                                                    {showEllipsis && (
                                                        <span className="px-2 text-gray-500">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => setAllVehiclesCurrentPage(page)}
                                                        className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${allVehiclesCurrentPage === page
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
                                    onClick={() => setAllVehiclesCurrentPage(prev => Math.min(Math.ceil(filteredVehicles.length / vehiclesItemsPerPage), prev + 1))}
                                    disabled={allVehiclesCurrentPage >= Math.ceil(filteredVehicles.length / vehiclesItemsPerPage)}
                                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${allVehiclesCurrentPage >= Math.ceil(filteredVehicles.length / vehiclesItemsPerPage)
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

                {/* Véhicules réformés */}
                {reformedVehicles.length > 0 && (
                    <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                    <TrashIcon className="w-6 h-6 text-gray-600" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Véhicules Réformés ({reformedVehicles.length})</h2>
                                </div>
                            </div>
                            {reformedVehicles.length > vehiclesItemsPerPage && (
                                <p className="text-sm text-gray-600">
                                    {((pendingVehiclesCurrentPage - 1) * vehiclesItemsPerPage + 1)} - {Math.min(pendingVehiclesCurrentPage * vehiclesItemsPerPage, reformedVehicles.length)} sur {reformedVehicles.length}
                                </p>
                            )}
                        </div>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-md">
                                <thead className="bg-gradient-to-r from-gray-50 via-gray-50 to-gray-50 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Date réforme</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Motif</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Destination</th>
                                        <th className="text-left px-2 sm:px-3 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reformedVehicles
                                        .slice((pendingVehiclesCurrentPage - 1) * vehiclesItemsPerPage, pendingVehiclesCurrentPage * vehiclesItemsPerPage)
                                        .map((vehicle: Vehicle) => (
                                            <tr key={vehicle.id} className="border-t hover:bg-gray-50 transition-colors">
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 capitalize text-sm">{vehicle.type}</td>
                                                <td className="px-2 sm:px-3 py-5 font-semibold text-gray-900 text-sm break-words">{vehicle.designation}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 font-mono text-sm">{vehicle.plate_number}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden md:table-cell">{vehicle.reformed_at ? formatDate(vehicle.reformed_at) : 'N/A'}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell break-words">{vehicle.reform_reason || 'N/A'}</td>
                                                <td className="px-2 sm:px-3 py-5 text-gray-700 text-sm hidden lg:table-cell break-words">{vehicle.reform_destination || 'N/A'}</td>
                                                <td className="px-2 sm:px-3 py-5">
                                                    <button
                                                        onClick={() => openDetailModal(vehicle)}
                                                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105 text-xs"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                        <span className="hidden sm:inline">Détails</span>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination pour véhicules réformés */}
                        {reformedVehicles.length > vehiclesItemsPerPage && (
                            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setPendingVehiclesCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={pendingVehiclesCurrentPage === 1}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage === 1
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                            }`}
                                    >
                                        <ChevronLeftIcon className="w-5 h-5" />
                                        <span>Précédent</span>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        {Array.from({ length: Math.ceil(reformedVehicles.length / vehiclesItemsPerPage) }, (_, i) => i + 1)
                                            .filter(page => {
                                                const totalPages = Math.ceil(reformedVehicles.length / vehiclesItemsPerPage);
                                                if (totalPages <= 7) return true;
                                                if (page === 1 || page === totalPages) return true;
                                                if (Math.abs(page - pendingVehiclesCurrentPage) <= 1) return true;
                                                return false;
                                            })
                                            .map((page, index, array) => {
                                                const totalPages = Math.ceil(reformedVehicles.length / vehiclesItemsPerPage);
                                                const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                                const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                                return (
                                                    <React.Fragment key={page}>
                                                        {showEllipsis && (
                                                            <span className="px-2 text-gray-500">...</span>
                                                        )}
                                                        <button
                                                            onClick={() => setPendingVehiclesCurrentPage(page)}
                                                            className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage === page
                                                                ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white shadow-lg'
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
                                        onClick={() => setPendingVehiclesCurrentPage(prev => Math.min(Math.ceil(reformedVehicles.length / vehiclesItemsPerPage), prev + 1))}
                                        disabled={pendingVehiclesCurrentPage >= Math.ceil(reformedVehicles.length / vehiclesItemsPerPage)}
                                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${pendingVehiclesCurrentPage >= Math.ceil(reformedVehicles.length / vehiclesItemsPerPage)
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
                )}

                {/* Suivi des Maintenances */}
                <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                                <WrenchScrewdriverIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Suivi des Maintenances</h2>
                            </div>
                        </div>
                        <button
                            onClick={() => openMaintenanceModal()}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Nouvelle Maintenance</span>
                        </button>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">TOTAL MAINTENANCES</p>
                                    <p className="text-3xl font-bold text-gray-900">{maintenances.length}</p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                    <WrenchScrewdriverIcon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">COÛT TOTAL</p>
                                    <p className="text-3xl font-bold text-gray-900">
                                        {maintenances.reduce((sum, m) => sum + m.cost, 0).toLocaleString('fr-FR')} FCFA
                                    </p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    <DocumentArrowDownIcon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl p-6 border border-red-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">ALERTES</p>
                                    <p className="text-3xl font-bold text-gray-900">{maintenanceAlertsCount}</p>
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
                                    <ExclamationTriangleIcon className="w-6 h-6 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dernières Maintenances */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Dernières Maintenances</h3>
                            {maintenances.length > 0 && (
                                <p className="text-sm text-gray-600">
                                    {((maintenanceCurrentPage - 1) * maintenanceItemsPerPage + 1)} - {Math.min(maintenanceCurrentPage * maintenanceItemsPerPage, maintenances.length)} sur {maintenances.length}
                                </p>
                            )}
                        </div>
                        {maintenances.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <WrenchScrewdriverIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium">Aucune maintenance enregistrée</p>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-3 mb-4">
                                    {maintenances
                                        .slice((maintenanceCurrentPage - 1) * maintenanceItemsPerPage, maintenanceCurrentPage * maintenanceItemsPerPage)
                                        .map((maintenance) => (
                                            <div key={maintenance.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-105 hover:shadow-md hover:border hover:border-emerald-300 transition-all duration-300">
                                                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Véhicule</p>
                                                        <p className="font-semibold text-gray-900">
                                                            {maintenance.vehicle?.plate_number} - {maintenance.vehicle?.designation}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Type</p>
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${maintenance.type === 'Vidange' || maintenance.type === 'Entretien préventif'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : maintenance.type === 'Réparation'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {maintenance.type}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Date</p>
                                                        <p className="font-semibold text-gray-900">{formatDate(maintenance.maintenance_date)}</p>
                                                    </div>
                                                    {maintenance.mileage && (
                                                        <div>
                                                            <p className="text-xs text-gray-500 mb-1">KM</p>
                                                            <p className="font-semibold text-gray-900">{maintenance.mileage.toLocaleString('fr-FR')}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Coût</p>
                                                        <p className="font-semibold text-gray-900">{maintenance.cost.toLocaleString('fr-FR')} FCFA</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1">Agent</p>
                                                        <p className="font-semibold text-gray-900">{maintenance.agent}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const vehicle = vehicles.find(v => v.id === maintenance.vehicle_id);
                                                        if (vehicle) {
                                                            openDetailModal(vehicle);
                                                            setActiveTab('maintenances');
                                                        }
                                                    }}
                                                    className="ml-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105"
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                </div>

                                {/* Pagination */}
                                {maintenances.length > maintenanceItemsPerPage && (
                                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setMaintenanceCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={maintenanceCurrentPage === 1}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${maintenanceCurrentPage === 1
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
                                                    }`}
                                            >
                                                <ChevronLeftIcon className="w-5 h-5" />
                                                <span>Précédent</span>
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.ceil(maintenances.length / maintenanceItemsPerPage) }, (_, i) => i + 1)
                                                    .filter(page => {
                                                        const totalPages = Math.ceil(maintenances.length / maintenanceItemsPerPage);
                                                        if (totalPages <= 7) return true;
                                                        if (page === 1 || page === totalPages) return true;
                                                        if (Math.abs(page - maintenanceCurrentPage) <= 1) return true;
                                                        return false;
                                                    })
                                                    .map((page, index, array) => {
                                                        const totalPages = Math.ceil(maintenances.length / maintenanceItemsPerPage);
                                                        const showEllipsis = index > 0 && array[index - 1] !== page - 1;
                                                        const showEllipsisAfter = index < array.length - 1 && array[index + 1] !== page + 1 && page !== totalPages;

                                                        return (
                                                            <React.Fragment key={page}>
                                                                {showEllipsis && (
                                                                    <span className="px-2 text-gray-500">...</span>
                                                                )}
                                                                <button
                                                                    onClick={() => setMaintenanceCurrentPage(page)}
                                                                    className={`min-w-[40px] px-3 py-2 rounded-lg font-medium transition-all ${maintenanceCurrentPage === page
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
                                                onClick={() => setMaintenanceCurrentPage(prev => Math.min(Math.ceil(maintenances.length / maintenanceItemsPerPage), prev + 1))}
                                                disabled={maintenanceCurrentPage >= Math.ceil(maintenances.length / maintenanceItemsPerPage)}
                                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${maintenanceCurrentPage >= Math.ceil(maintenances.length / maintenanceItemsPerPage)
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
                            </>
                        )}
                    </div>
                </div>

                {/* Modal de détails */}
                {isDetailModalOpen && detailVehicle && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between p-6 border-b border-gray-200">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                        <TruckIcon className="w-6 h-6 text-emerald-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">{detailVehicle.plate_number}</h3>
                                        <p className="text-sm text-gray-600">{detailVehicle.designation} - {detailVehicle.type.charAt(0).toUpperCase() + detailVehicle.type.slice(1)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-semibold shadow-sm ${detailVehicle.status === 'assigned'
                                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white'
                                        : detailVehicle.status === 'reformed'
                                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white'
                                            : 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                                        }`}>
                                        {detailVehicle.status === 'assigned' ? 'Affecté' : detailVehicle.status === 'reformed' ? 'Réformé' : 'En attente'}
                                    </span>
                                    <button
                                        onClick={closeDetailModal}
                                        className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                    >
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setActiveTab('informations')}
                                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'informations'
                                        ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <DocumentTextIcon className="w-5 h-5" />
                                        <span>Informations</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('affectations')}
                                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'affectations'
                                        ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <MapPinIcon className="w-5 h-5" />
                                        <span>Affectations</span>
                                    </div>
                                </button>
                                <button
                                    onClick={() => setActiveTab('maintenances')}
                                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'maintenances'
                                        ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <WrenchScrewdriverIcon className="w-5 h-5" />
                                        <span>Maintenances</span>
                                    </div>
                                </button>
                                {detailVehicle.status === 'reformed' && (
                                    <button
                                        onClick={() => setActiveTab('reform')}
                                        className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'reform'
                                            ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <TrashIcon className="w-5 h-5" />
                                            <span>Réforme</span>
                                        </div>
                                    </button>
                                )}
                                <button
                                    onClick={() => setActiveTab('timeline')}
                                    className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${activeTab === 'timeline'
                                        ? 'bg-white text-emerald-600 border-b-2 border-emerald-600'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        <ClockIcon className="w-5 h-5" />
                                        <span>Timeline</span>
                                    </div>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                {activeTab === 'informations' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                                                <DocumentTextIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800">Informations générales</h4>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Type</p>
                                                <p className="text-base font-semibold text-gray-900 capitalize">{detailVehicle.type}</p>
                                            </div>
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Désignation</p>
                                                <p className="text-base font-semibold text-gray-900">{detailVehicle.designation}</p>
                                            </div>
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Numéro de châssis</p>
                                                <p className="text-base font-semibold text-gray-900 font-mono">{detailVehicle.chassis_number}</p>
                                            </div>
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Numéro de plaque</p>
                                                <p className="text-base font-semibold text-gray-900 font-mono">{detailVehicle.plate_number}</p>
                                            </div>
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Date d'acquisition</p>
                                                <p className="text-base font-semibold text-gray-900">{formatDateLong(detailVehicle.acquisition_date)}</p>
                                            </div>
                                            <div className="border-b border-gray-200 pb-4">
                                                <p className="text-sm text-gray-600 mb-1">Acquéreur</p>
                                                <p className="text-base font-semibold text-gray-900">{detailVehicle.acquirer}</p>
                                            </div>
                                            {detailVehicle.reception_commission && (
                                                <div className="border-b border-gray-200 pb-4">
                                                    <p className="text-sm text-gray-600 mb-1">Commission de réception</p>
                                                    <p className="text-base font-semibold text-gray-900">{detailVehicle.reception_commission}</p>
                                                </div>
                                            )}
                                            {detailVehicle.observations && (
                                                <div className="border-b border-gray-200 pb-4 col-span-2">
                                                    <p className="text-sm text-gray-600 mb-1">Observations</p>
                                                    <p className="text-base font-semibold text-gray-900">{detailVehicle.observations}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'affectations' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                <MapPinIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800">Historique des affectations</h4>
                                        </div>
                                        {detailVehicle.assignment ? (
                                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-sm text-gray-600 mb-1">Région</p>
                                                        <p className="text-base font-semibold text-gray-900">{detailVehicle.assignment.region}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-sm text-gray-600 mb-1">Destinataire</p>
                                                        <p className="text-base font-semibold text-gray-900">{detailVehicle.assignment.recipient}</p>
                                                    </div>
                                                    {detailVehicle.assignment.structure && (
                                                        <div>
                                                            <p className="text-sm text-gray-600 mb-1">Structure</p>
                                                            <p className="text-base font-semibold text-gray-900">{detailVehicle.assignment.structure}</p>
                                                        </div>
                                                    )}
                                                    {detailVehicle.assignment.district && (
                                                        <div>
                                                            <p className="text-sm text-gray-600 mb-1">District</p>
                                                            <p className="text-base font-semibold text-gray-900">{detailVehicle.assignment.district}</p>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <p className="text-sm text-gray-600 mb-1">Date d'affectation</p>
                                                        <p className="text-base font-semibold text-gray-900">{formatDateLong(detailVehicle.assignment.assigned_at)}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500">
                                                <MapPinIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                                <p className="text-lg font-medium">Aucune affectation</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'maintenances' && (
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center">
                                                    <WrenchScrewdriverIcon className="w-5 h-5 text-white" />
                                                </div>
                                                <h4 className="text-lg font-bold text-gray-800">Historique des maintenances</h4>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    closeDetailModal();
                                                    openMaintenanceModal(detailVehicle.id);
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                                            >
                                                <PlusIcon className="w-5 h-5" />
                                                <span>Nouvelle maintenance</span>
                                            </button>
                                        </div>
                                        {maintenances.filter(m => m.vehicle_id === detailVehicle.id).length === 0 ? (
                                            <div className="text-center py-12 text-gray-500">
                                                <WrenchScrewdriverIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                                <p className="text-lg font-medium">Aucune maintenance enregistrée</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {maintenances
                                                    .filter(m => m.vehicle_id === detailVehicle.id)
                                                    .map((maintenance) => (
                                                        <div key={maintenance.id} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                                                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Type</p>
                                                                    <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-semibold ${maintenance.type === 'Vidange' || maintenance.type === 'Entretien préventif'
                                                                        ? 'bg-emerald-100 text-emerald-700'
                                                                        : maintenance.type === 'Réparation'
                                                                            ? 'bg-red-100 text-red-700'
                                                                            : 'bg-blue-100 text-blue-700'
                                                                        }`}>
                                                                        {maintenance.type}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Date</p>
                                                                    <p className="text-sm font-semibold text-gray-900">{formatDate(maintenance.maintenance_date)}</p>
                                                                </div>
                                                                {maintenance.mileage && (
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 mb-1">Kilométrage</p>
                                                                        <p className="text-sm font-semibold text-gray-900">{maintenance.mileage.toLocaleString('fr-FR')} KM</p>
                                                                    </div>
                                                                )}
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Coût</p>
                                                                    <p className="text-sm font-semibold text-gray-900">{maintenance.cost.toLocaleString('fr-FR')} FCFA</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-600 mb-1">Agent / Mécanicien</p>
                                                                    <p className="text-sm font-semibold text-gray-900">{maintenance.agent}</p>
                                                                </div>
                                                                {maintenance.next_maintenance_date && (
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 mb-1">Prochain entretien (Date)</p>
                                                                        <p className="text-sm font-semibold text-gray-900">{formatDate(maintenance.next_maintenance_date)}</p>
                                                                    </div>
                                                                )}
                                                                {maintenance.next_maintenance_mileage && (
                                                                    <div>
                                                                        <p className="text-xs text-gray-600 mb-1">Prochain entretien (KM)</p>
                                                                        <p className="text-sm font-semibold text-gray-900">{maintenance.next_maintenance_mileage.toLocaleString('fr-FR')} KM</p>
                                                                    </div>
                                                                )}
                                                                {maintenance.observations && (
                                                                    <div className="col-span-2 md:col-span-3">
                                                                        <p className="text-xs text-gray-600 mb-1">Observations</p>
                                                                        <p className="text-sm text-gray-900">{maintenance.observations}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeTab === 'timeline' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
                                                <ClockIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800">Historique complet</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                                    <TruckIcon className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-semibold text-gray-900">Réception du véhicule</p>
                                                    <p className="text-sm text-gray-600">{formatDateLong(detailVehicle.acquisition_date)}</p>
                                                    <p className="text-sm text-gray-500">Acquis par {detailVehicle.acquirer}</p>
                                                </div>
                                            </div>
                                            {detailVehicle.assignment && (
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                                        <MapPinIcon className="w-5 h-5 text-blue-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">Affectation du véhicule</p>
                                                        <p className="text-sm text-gray-600">{formatDateLong(detailVehicle.assignment.assigned_at)}</p>
                                                        <p className="text-sm text-gray-500">Affecté à {detailVehicle.assignment.recipient} - {detailVehicle.assignment.region}</p>
                                                    </div>
                                                </div>
                                            )}
                                            {maintenances
                                                .filter(m => m.vehicle_id === detailVehicle.id)
                                                .sort((a, b) => new Date(b.maintenance_date).getTime() - new Date(a.maintenance_date).getTime())
                                                .map((maintenance) => (
                                                    <div key={maintenance.id} className="flex items-start gap-4">
                                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                                            <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-gray-900">Maintenance - {maintenance.type}</p>
                                                            <p className="text-sm text-gray-600">{formatDateLong(maintenance.maintenance_date)}</p>
                                                            <p className="text-sm text-gray-500">
                                                                {maintenance.mileage && `${maintenance.mileage.toLocaleString('fr-FR')} KM - `}
                                                                {maintenance.cost.toLocaleString('fr-FR')} FCFA - {maintenance.agent}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            {detailVehicle.status === 'reformed' && detailVehicle.reformed_at && (
                                                <div className="flex items-start gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                                        <TrashIcon className="w-5 h-5 text-gray-600" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="font-semibold text-gray-900">Réforme du véhicule</p>
                                                        <p className="text-sm text-gray-600">{formatDateLong(detailVehicle.reformed_at)}</p>
                                                        <p className="text-sm text-gray-500">
                                                            Motif: {detailVehicle.reform_reason} - Destination: {detailVehicle.reform_destination}
                                                            {detailVehicle.reform_agent && ` - Agent: ${detailVehicle.reform_agent}`}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'reform' && detailVehicle.status === 'reformed' && (
                                    <div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-lg bg-gray-500 flex items-center justify-center">
                                                <TrashIcon className="w-5 h-5 text-white" />
                                            </div>
                                            <h4 className="text-lg font-bold text-gray-800">Informations de réforme</h4>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Date de réforme</p>
                                                <p className="text-gray-900">{detailVehicle.reformed_at ? formatDateLong(detailVehicle.reformed_at) : 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Motif</p>
                                                <p className="text-gray-900">{detailVehicle.reform_reason || 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Agent responsable</p>
                                                <p className="text-gray-900">{detailVehicle.reform_agent || 'N/A'}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm font-semibold text-gray-700 mb-1">Destination finale</p>
                                                <p className="text-gray-900">{detailVehicle.reform_destination || 'N/A'}</p>
                                            </div>
                                            {detailVehicle.reform_notes && (
                                                <div className="bg-gray-50 rounded-lg p-4">
                                                    <p className="text-sm font-semibold text-gray-700 mb-1">Observations</p>
                                                    <p className="text-gray-900 whitespace-pre-wrap">{detailVehicle.reform_notes}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal de réforme */}
                {isReformModalOpen && vehicleToReform && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Réformer le véhicule</h3>
                                <button
                                    onClick={closeReformModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-gray-700 mb-6">
                                Vous êtes sur le point de réformer le véhicule <strong>{vehicleToReform.plate_number} - {vehicleToReform.designation}</strong>.
                                Cette action est irréversible.
                            </p>

                            <form onSubmit={(e) => { e.preventDefault(); confirmReform(); }} className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Motif de réforme <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
                                        value={reformReason}
                                        onChange={e => setReformReason(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un motif</option>
                                        {REFORM_REASONS.map(reason => (
                                            <option key={reason} value={reason}>{reason}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Agent responsable <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
                                        placeholder="Nom de l'agent"
                                        value={reformAgent}
                                        onChange={e => setReformAgent(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Destination finale <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm"
                                        value={reformDestination}
                                        onChange={e => setReformDestination(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner une destination</option>
                                        {REFORM_DESTINATIONS.map(dest => (
                                            <option key={dest} value={dest}>{dest}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Observations
                                    </label>
                                    <textarea
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all shadow-sm resize-none"
                                        rows={4}
                                        placeholder="Ajouter des commentaires ou observations..."
                                        value={reformNotes}
                                        onChange={e => setReformNotes(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={closeReformModal}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg shadow-lg hover:from-orange-700 hover:to-red-700 transition-all transform hover:scale-105 font-medium"
                                    >
                                        Confirmer la réforme
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Modal de désaffectation */}
                {isUnassignModalOpen && vehicleToUnassign && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Désaffecter le véhicule</h3>
                                <button
                                    onClick={closeUnassignModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-gray-700 mb-6">
                                Vous êtes sur le point de désaffecter le véhicule <strong>{vehicleToUnassign.plate_number} - {vehicleToUnassign.designation}</strong>
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Agent responsable <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm"
                                        placeholder="Nom de l'agent"
                                        value={unassignAgent}
                                        onChange={e => setUnassignAgent(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Motif de désaffectation <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        className="w-full bg-white border-2 border-emerald-500 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all shadow-sm resize-none"
                                        rows={4}
                                        placeholder="Expliquez la raison de la désaffectation..."
                                        value={unassignReason}
                                        onChange={e => setUnassignReason(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
                                <button
                                    onClick={closeUnassignModal}
                                    className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={confirmUnassign}
                                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-lg shadow-lg hover:from-red-700 hover:to-pink-700 transition-all transform hover:scale-105 font-medium"
                                >
                                    Confirmer la désaffectation
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Modal Nouvelle Maintenance */}
                {isMaintenanceModalOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold text-gray-900">Nouvelle Maintenance</h3>
                                <button
                                    onClick={closeMaintenanceModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={saveMaintenance} className="space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Véhicule <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        value={maintenanceVehicleId}
                                        onChange={e => setMaintenanceVehicleId(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un véhicule</option>
                                        {vehicles.map(vehicle => (
                                            <option key={vehicle.id} value={vehicle.id}>
                                                {vehicle.plate_number} - {vehicle.designation}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Type de maintenance <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        value={maintenanceType}
                                        onChange={e => setMaintenanceType(e.target.value)}
                                        required
                                    >
                                        <option value="">Sélectionner un type</option>
                                        {MAINTENANCE_TYPES.map(type => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Date de maintenance <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        value={maintenanceDate}
                                        onChange={e => setMaintenanceDate(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Kilométrage</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Ex: 50000"
                                        value={maintenanceMileage}
                                        onChange={e => setMaintenanceMileage(e.target.value)}
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Coût (FCFA) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Ex: 50000"
                                        value={maintenanceCost}
                                        onChange={e => setMaintenanceCost(e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Agent / Mécanicien <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                        placeholder="Nom de l'agent"
                                        value={maintenanceAgent}
                                        onChange={e => setMaintenanceAgent(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Prochain entretien (Date)</label>
                                        <input
                                            type="date"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                            value={nextMaintenanceDate}
                                            onChange={e => setNextMaintenanceDate(e.target.value)}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">Prochain entretien (KM)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                            placeholder="Ex: 60000"
                                            value={nextMaintenanceMileage}
                                            onChange={e => setNextMaintenanceMileage(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-semibold mb-2 block">Observations</label>
                                    <textarea
                                        rows={4}
                                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                        placeholder="Détails de la maintenance..."
                                        value={maintenanceObservations}
                                        onChange={e => setMaintenanceObservations(e.target.value)}
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                                    <button
                                        type="button"
                                        onClick={closeMaintenanceModal}
                                        className="px-6 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-lg shadow-lg hover:from-emerald-700 hover:to-teal-800 transition-all transform hover:scale-105 font-medium"
                                    >
                                        Enregistrer
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* 5 Dernières Acquisitions et 5 Dernières Affectations Actives */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 5 Dernières Acquisitions */}
                    <div className="bg-white border rounded-xl shadow-lg p-6 border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <TruckIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">5 Dernières Acquisitions</h2>
                        </div>
                        {vehicles.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>Aucune acquisition</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vehicles
                                    .sort((a, b) => new Date(b.acquisition_date).getTime() - new Date(a.acquisition_date).getTime())
                                    .slice(0, 5)
                                    .map((vehicle, index) => (
                                        <div key={vehicle.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-105 hover:shadow-md hover:border hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{vehicle.plate_number} - {vehicle.designation}</p>
                                                <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
                                                <p className="text-sm text-gray-500">Acquéreur: {vehicle.acquirer}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-emerald-600">{formatDate(vehicle.acquisition_date)}</p>
                                                {vehicle.status === 'assigned' ? (
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mt-1">
                                                        Affecté
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 mt-1">
                                                        En attente
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    {/* 5 Dernières Affectations Actives */}
                    <div className="bg-white border rounded-xl shadow-lg p-6 border-gray-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <MapPinIcon className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">5 Dernières Affectations Actives</h2>
                        </div>
                        {vehicles.filter(v => v.status === 'assigned').length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>Aucune affectation active</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {vehicles
                                    .filter(v => v.status === 'assigned' && v.assignment)
                                    .sort((a, b) => {
                                        const dateA = a.assignment?.assigned_at ? new Date(a.assignment.assigned_at).getTime() : 0;
                                        const dateB = b.assignment?.assigned_at ? new Date(b.assignment.assigned_at).getTime() : 0;
                                        return dateB - dateA;
                                    })
                                    .slice(0, 5)
                                    .map((vehicle, index) => (
                                        <div key={vehicle.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 hover:scale-105 hover:shadow-md hover:border hover:border-blue-300 transition-all duration-300 cursor-pointer">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900">{vehicle.plate_number} - {vehicle.designation}</p>
                                                <p className="text-sm text-gray-500">Région: {vehicle.assignment?.region || 'ND'}</p>
                                                {vehicle.assignment?.structure && (
                                                    <p className="text-sm text-gray-500">Structure: {vehicle.assignment.structure}</p>
                                                )}
                                                <p className="text-sm text-gray-500">Destinataire: {vehicle.assignment?.recipient || 'ND'}</p>
                                                {vehicle.assignment?.district && (
                                                    <p className="text-sm text-gray-500">District: {vehicle.assignment.district}</p>
                                                )}
                                            </div>
                                            <div className="text-right flex flex-col items-end gap-2">
                                                <p className="font-bold text-blue-600">{formatDate(vehicle.assignment?.assigned_at)}</p>
                                                <button
                                                    onClick={() => openUnassignModal(vehicle)}
                                                    className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-110"
                                                    title="Désaffecter"
                                                >
                                                    <XMarkIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

