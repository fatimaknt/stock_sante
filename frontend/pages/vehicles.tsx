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
    ExclamationTriangleIcon
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
    status: 'pending' | 'assigned';
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

export default function VehiclesPage() {
    const { settings } = useSettings();
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // États pour le formulaire de réception
    const [vehicleType, setVehicleType] = useState<string>('');
    const [designation, setDesignation] = useState<string>('');
    const [chassisNumber, setChassisNumber] = useState<string>('');
    const [plateNumber, setPlateNumber] = useState<string>('');
    const [acquisitionDate, setAcquisitionDate] = useState<string>('');
    const [acquirer, setAcquirer] = useState<string>('');
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

    // États pour les modals
    const [detailVehicle, setDetailVehicle] = useState<Vehicle | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [vehicleToUnassign, setVehicleToUnassign] = useState<Vehicle | null>(null);
    const [isUnassignModalOpen, setIsUnassignModalOpen] = useState(false);
    const [unassignAgent, setUnassignAgent] = useState<string>('');
    const [unassignReason, setUnassignReason] = useState<string>('');

    // Initialize date on client side only
    useEffect(() => {
        if (!acquisitionDate) {
            setAcquisitionDate(new Date().toISOString().slice(0, 10));
        }
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

    const saveReception = async (e: FormEvent) => {
        e.preventDefault();
        try {
            if (!vehicleType || !designation || !chassisNumber || !plateNumber || !acquisitionDate || !acquirer) {
                setError('Veuillez remplir tous les champs obligatoires');
                setSuccess('');
                return;
            }

            const payload = {
                type: vehicleType,
                designation,
                chassis_number: chassisNumber,
                plate_number: plateNumber,
                acquisition_date: acquisitionDate,
                acquirer,
                reception_commission: receptionCommission || undefined,
                observations: observations || undefined,
            };

            await getJSON(API('/vehicles'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Réinitialiser le formulaire
            setVehicleType('');
            setDesignation('');
            setChassisNumber('');
            setPlateNumber('');
            setAcquisitionDate(new Date().toISOString().slice(0, 10));
            setAcquirer('');
            setReceptionCommission('');
            setObservations('');
            setSuccess('Réception de véhicule enregistrée avec succès!');
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

    const openDetailModal = (vehicle: Vehicle) => {
        setDetailVehicle(vehicle);
        setIsDetailModalOpen(true);
    };

    const closeDetailModal = () => {
        setIsDetailModalOpen(false);
        setDetailVehicle(null);
    };

    // Statistiques
    const stats = useMemo(() => {
        const total = vehicles.length;
        const assigned = vehicles.filter(v => v.status === 'assigned').length;
        const assignmentRate = total > 0 ? Math.round((assigned / total) * 100) : 0;

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
            assignmentRate,
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
    const assignedVehicles = filteredVehicles.filter(v => v.status === 'assigned');

    const availableVehicles = vehicles.filter(v => v.status === 'pending');
    const uniqueAcquirers = Array.from(new Set(vehicles.map(v => v.acquirer))).filter(Boolean);
    const availableYears = Array.from(new Set(vehicles.map(v => v.acquisition_date?.slice(0, 4)))).filter(Boolean).sort().reverse();

    return (
        <Layout>
            <div className="pt-24 px-4 sm:px-7 pb-7 space-y-6 overflow-x-hidden">
                <TopBar />

                {/* Header avec gradient */}
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl shadow-lg p-4 sm:p-8 text-white">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl sm:text-4xl font-bold mb-2">Gestion du Parc de Véhicules</h1>
                            <p className="text-sm sm:text-base text-emerald-100">Gérez les réceptions, affectations et suivi des véhicules</p>
                        </div>
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <TruckIcon className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
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

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border rounded-xl shadow-lg p-6 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">TOTAL VÉHICULES</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <TruckIcon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-6 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">TAUX D'AFFECTATION</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.assignmentRate}%</p>
                                <div className="mt-2">
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                        <ArrowTrendingUpIcon className="w-3 h-3 mr-1" />
                                        {stats.assignmentRate}%
                                    </span>
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <ArrowTrendingUpIcon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-6 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">PAR TYPE</p>
                                <p className="text-3xl font-bold text-gray-900 lowercase">{stats.mostCommonType}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <ClipboardDocumentCheckIcon className="w-6 h-6 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border rounded-xl shadow-lg p-6 hover:shadow-xl hover:scale-105 hover:border-emerald-300 transition-all duration-300 cursor-pointer">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">RÉGIONS COUVERTES</p>
                                <p className="text-3xl font-bold text-gray-900">{stats.regionsCount}</p>
                            </div>
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                                <MapPinIcon className="w-6 h-6 text-white" />
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

                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Répartition par Région</h3>
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

                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Véhicules par Acquéreur</h3>
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

                {/* Formulaires */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Formulaire de réception */}
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 mb-6 -m-6 -mt-0">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                    <CheckCircleIcon className="w-6 h-6 text-white" />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Réception de Véhicule</h2>
                            </div>
                        </div>

                        <form onSubmit={saveReception} className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Type de véhicule <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={vehicleType}
                                    onChange={e => setVehicleType(e.target.value)}
                                    required
                                >
                                    <option value="">Sélectionner un type</option>
                                    {VEHICLE_TYPES.map(type => (
                                        <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Désignation <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    placeholder="Ex: Toyota Hilux, Yamaha DT125, etc."
                                    value={designation}
                                    onChange={e => setDesignation(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Numéro de châssis <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={chassisNumber}
                                    onChange={e => setChassisNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Numéro de plaque <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={plateNumber}
                                    onChange={e => setPlateNumber(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Date d'acquisition <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={acquisitionDate}
                                    onChange={e => setAcquisitionDate(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">
                                    Acquéreur <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={acquirer}
                                    onChange={e => setAcquirer(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">Commission de réception</label>
                                <input
                                    type="text"
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm"
                                    value={receptionCommission}
                                    onChange={e => setReceptionCommission(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold mb-2 block">Observations</label>
                                <textarea
                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all shadow-sm resize-none"
                                    rows={4}
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
                    <div className="bg-white border rounded-xl shadow-lg p-6">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 mb-6 -m-6 -mt-0">
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
                        </div>
                        <div className="border rounded-xl overflow-hidden">
                            <table className="w-full text-md">
                                <thead className="bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 border-b-2 border-yellow-200">
                                    <tr>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Châssis</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Date d'acquisition</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Acquéreur</th>
                                        <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pendingVehicles.map(vehicle => (
                                        <tr key={vehicle.id} className="border-t hover:bg-yellow-50 transition-colors">
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 capitalize">{vehicle.type}</td>
                                            <td className="px-3 sm:px-4 py-5 font-semibold text-gray-900">{vehicle.designation}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 font-mono">{vehicle.plate_number}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 font-mono text-xs sm:text-sm hidden md:table-cell">{vehicle.chassis_number}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden lg:table-cell">{formatDate(vehicle.acquisition_date)}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden lg:table-cell">{vehicle.acquirer}</td>
                                            <td className="px-3 sm:px-4 py-5">
                                                <button
                                                    onClick={() => openDetailModal(vehicle)}
                                                    className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105 text-xs sm:text-sm"
                                                >
                                                    <EyeIcon className="w-3 h-3 sm:w-5 sm:h-5" />
                                                    <span className="hidden sm:inline">Détails</span>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Search and Filters */}
                <div className="bg-white border rounded-xl shadow-lg p-4 sm:p-6">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Search Bar */}
                        <div className="flex-1 relative min-w-0">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par désignation, plaque, châssis..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                        </div>

                        {/* Year Filter */}
                        <select
                            value={yearFilter}
                            onChange={(e) => setYearFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto sm:min-w-[140px] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Toutes les années</option>
                            {availableYears.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>

                        {/* Type Filter */}
                        <select
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto sm:min-w-[140px] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        >
                            <option value="">Tous les types</option>
                            {VEHICLE_TYPES.map(type => (
                                <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                            ))}
                        </select>

                        {/* Acquirer Filter */}
                        <select
                            value={acquirerFilter}
                            onChange={(e) => setAcquirerFilter(e.target.value)}
                            className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto sm:min-w-[140px] shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    </div>
                    <div className="border rounded-xl overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b-2 border-emerald-200">
                                <tr>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Type</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Désignation</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden md:table-cell">Châssis</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Plaque</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Date</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden lg:table-cell">Acquéreur</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden xl:table-cell">Destinataire</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs hidden xl:table-cell">Région</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Statut</th>
                                    <th className="text-left px-3 sm:px-4 py-4 text-gray-800 font-bold uppercase tracking-wide text-xs">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredVehicles.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="px-3 sm:px-4 py-12 text-center text-gray-500">
                                            <TruckIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p className="font-medium">Aucun véhicule trouvé</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVehicles.map(vehicle => (
                                        <tr key={vehicle.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 capitalize">{vehicle.type}</td>
                                            <td className="px-3 sm:px-4 py-5 font-semibold text-gray-900">{vehicle.designation}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 font-mono text-xs sm:text-sm hidden md:table-cell">{vehicle.chassis_number}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 font-mono">{vehicle.plate_number}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden lg:table-cell">{formatDate(vehicle.acquisition_date)}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden lg:table-cell">{vehicle.acquirer}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden xl:table-cell">{vehicle.assignment?.recipient || 'ND'}</td>
                                            <td className="px-3 sm:px-4 py-5 text-gray-700 hidden xl:table-cell">{vehicle.assignment?.region || 'ND'}</td>
                                            <td className="px-3 sm:px-4 py-5">
                                                {vehicle.status === 'assigned' ? (
                                                    <span className="inline-flex items-center justify-center px-2 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm bg-gradient-to-r from-emerald-600 to-emerald-700 text-white">
                                                        Affecté
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-sm bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                                                        En attente
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 sm:px-4 py-5">
                                                <div className="flex items-center gap-1 sm:gap-2">
                                                    <button
                                                        onClick={() => openDetailModal(vehicle)}
                                                        className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all transform hover:scale-105 text-xs sm:text-sm"
                                                    >
                                                        <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                        <span className="hidden sm:inline">Détails</span>
                                                    </button>
                                                    {vehicle.status === 'assigned' && (
                                                        <button
                                                            onClick={() => openUnassignModal(vehicle)}
                                                            className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-all transform hover:scale-105 text-xs sm:text-sm"
                                                        >
                                                            <XMarkIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                                                            <span className="hidden sm:inline">Désaffecter</span>
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
                </div>

                {/* Modal de détails */}
                {isDetailModalOpen && detailVehicle && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                        <EyeIcon className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900">Détails du Véhicule</h3>
                                </div>
                                <button
                                    onClick={closeDetailModal}
                                    className="w-10 h-10 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                                    <h4 className="text-lg font-bold text-gray-800 mb-4">Informations générales</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Type</p>
                                            <p className="text-base font-semibold text-gray-900 capitalize">{detailVehicle.type}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Désignation</p>
                                            <p className="text-base font-semibold text-gray-900">{detailVehicle.designation}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Numéro de châssis</p>
                                            <p className="text-base font-semibold text-gray-900 font-mono">{detailVehicle.chassis_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Numéro de plaque</p>
                                            <p className="text-base font-semibold text-gray-900 font-mono">{detailVehicle.plate_number}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Date d'acquisition</p>
                                            <p className="text-base font-semibold text-gray-900">{formatDate(detailVehicle.acquisition_date)}</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-gray-600 mb-1">Acquéreur</p>
                                            <p className="text-base font-semibold text-gray-900">{detailVehicle.acquirer}</p>
                                        </div>
                                        {detailVehicle.reception_commission && (
                                            <div>
                                                <p className="text-sm text-gray-600 mb-1">Commission de réception</p>
                                                <p className="text-base font-semibold text-gray-900">{detailVehicle.reception_commission}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {detailVehicle.assignment && (
                                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-4">Affectation</h4>
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
                                                <p className="text-base font-semibold text-gray-900">{formatDate(detailVehicle.assignment.assigned_at)}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {detailVehicle.observations && (
                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                        <h4 className="text-lg font-bold text-gray-800 mb-3">Observations</h4>
                                        <p className="text-base text-gray-700 whitespace-pre-wrap">{detailVehicle.observations}</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t">
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

