import React, { useState } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { useSettings } from '../contexts/SettingsContext';
import {
    Cog6ToothIcon,
    BellIcon,
    SunIcon,
    MoonIcon,
    ShieldCheckIcon,
    DocumentArrowDownIcon,
    DocumentArrowUpIcon,
    CircleStackIcon,
    TrashIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';

export default function SettingsPage() {
    const { settings, updateSetting, updateSettings, resetSettings } = useSettings();
    const [activeTab, setActiveTab] = useState('general');
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (key: string, value: any) => {
        updateSetting(key as keyof typeof settings, value);
        setSaveSuccess(false);
        setError('');
    };

    const handleSave = () => {
        try {
            // Les paramètres sont déjà sauvegardés automatiquement dans le contexte
            setSaveSuccess(true);
            setError('');
            setTimeout(() => setSaveSuccess(false), 3000);

            // Ici vous pourriez aussi appeler une API pour sauvegarder côté serveur
            // await getJSON(API('/settings'), { 
            //     method: 'PUT', 
            //     body: JSON.stringify(settings) 
            // });

            console.log('Paramètres sauvegardés avec succès:', settings);
        } catch (err: any) {
            console.error('Erreur lors de la sauvegarde:', err);
            setError(err?.message || 'Erreur lors de la sauvegarde des paramètres');
            setSaveSuccess(false);
        }
    };

    const handleExportData = () => {
        try {
            const dataStr = JSON.stringify(settings, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `stockpro-settings-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err: any) {
            setError('Erreur lors de l\'export des paramètres');
            console.error('Erreur export:', err);
        }
    };

    const handleImportData = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: any) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event: any) => {
                    try {
                        const importedSettings = JSON.parse(event.target.result);
                        updateSettings(importedSettings);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 3000);
                        setError('');
                    } catch (err: any) {
                        setError('Fichier invalide. Veuillez sélectionner un fichier JSON valide.');
                        console.error('Erreur import:', err);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    };

    const handleClearCache = () => {
        if (confirm('Êtes-vous sûr de vouloir vider le cache ? Cette action supprimera tous les paramètres sauvegardés.')) {
            try {
                resetSettings();
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
                setError('');
            } catch (err: any) {
                setError('Erreur lors du vidage du cache');
                console.error('Erreur clear cache:', err);
            }
        }
    };

    const tabs = [
        { id: 'general', label: 'Général', icon: Cog6ToothIcon },
        { id: 'notifications', label: 'Notifications', icon: BellIcon },
        { id: 'display', label: 'Affichage', icon: SunIcon },
        { id: 'security', label: 'Sécurité', icon: ShieldCheckIcon },
        { id: 'data', label: 'Données', icon: CircleStackIcon },
    ];

    return (
        <Layout>
            <div className="pt-24 px-7 pb-7 space-y-6">
                <TopBar />

                {/* Header */}
                <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl shadow-lg p-8 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-4xl font-bold mb-2">Paramètres</h1>
                            <p className="text-emerald-100">Gérez les paramètres de votre application</p>
                        </div>
                        <div className="flex items-center gap-3">
                            {saveSuccess && (
                                <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span className="text-sm font-medium">Enregistré !</span>
                                </div>
                            )}
                            <button
                                onClick={handleSave}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-700 rounded-lg font-semibold hover:bg-emerald-50 transition-colors shadow-md hover:shadow-lg"
                            >
                                <CheckCircleIcon className="w-5 h-5" />
                                Enregistrer
                            </button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-l-4 border-red-500 px-6 py-4 rounded-lg shadow-md">
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                                        ? 'bg-emerald-600 dark:bg-emerald-700 text-white shadow-md'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* General Settings */}
                {activeTab === 'general' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
                            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                                <Cog6ToothIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Paramètres Généraux</h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Informations de base de l'organisation</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Nom de l'organisation
                                </label>
                                <input
                                    type="text"
                                    value={settings.organizationName}
                                    onChange={(e) => handleInputChange('organizationName', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="StockPro"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Email de l'organisation
                                </label>
                                <input
                                    type="email"
                                    value={settings.organizationEmail}
                                    onChange={(e) => handleInputChange('organizationEmail', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    placeholder="contact@stockpro.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Devise par défaut
                                </label>
                                <select
                                    value={settings.defaultCurrency}
                                    onChange={(e) => handleInputChange('defaultCurrency', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                >
                                    <option value="EUR">EUR (€)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="XOF">XOF (CFA)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Langue
                                </label>
                                <select
                                    value={settings.language}
                                    onChange={(e) => handleInputChange('language', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                >
                                    <option value="fr">Français</option>
                                    <option value="en">English</option>
                                    <option value="es">Español</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notifications Settings */}
                {activeTab === 'notifications' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <BellIcon className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                                <p className="text-sm text-gray-500">Gérez vos préférences de notifications</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {[
                                { key: 'emailNotifications', label: 'Notifications par email', description: 'Recevoir des notifications par email' },
                                { key: 'lowStockAlerts', label: 'Alertes stock faible', description: 'Notifier lorsque le stock est faible' },
                                { key: 'outOfStockAlerts', label: 'Alertes rupture de stock', description: 'Notifier en cas de rupture de stock' },
                                { key: 'receiptNotifications', label: 'Notifications de réception', description: 'Notifier lors de nouvelles réceptions' },
                                { key: 'stockoutNotifications', label: 'Notifications de sortie', description: 'Notifier lors de sorties de stock' },
                            ].map((notification) => (
                                <div key={notification.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-900">{notification.label}</h3>
                                        <p className="text-sm text-gray-500 mt-1">{notification.description}</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={settings[notification.key as keyof typeof settings] as boolean}
                                            onChange={(e) => handleInputChange(notification.key, e.target.checked)}
                                            className="sr-only peer"
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Display Settings */}
                {activeTab === 'display' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                                <SunIcon className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Affichage</h2>
                                <p className="text-sm text-gray-500">Personnalisez l'apparence de l'application</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Thème
                                </label>
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { value: 'light', label: 'Clair', icon: SunIcon },
                                        { value: 'dark', label: 'Sombre', icon: MoonIcon },
                                        { value: 'auto', label: 'Auto', icon: Cog6ToothIcon },
                                    ].map((theme) => {
                                        const Icon = theme.icon;
                                        return (
                                            <button
                                                key={theme.value}
                                                onClick={() => handleInputChange('theme', theme.value)}
                                                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${settings.theme === theme.value
                                                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                                    : 'border-gray-200 hover:border-emerald-300 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <Icon className="w-6 h-6" />
                                                <span className="font-medium">{theme.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Éléments par page
                                </label>
                                <select
                                    value={settings.itemsPerPage}
                                    onChange={(e) => handleInputChange('itemsPerPage', parseInt(e.target.value))}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                >
                                    <option value="10">10</option>
                                    <option value="20">20</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Sidebar repliée par défaut</h3>
                                    <p className="text-sm text-gray-500 mt-1">Afficher la sidebar en mode compact au démarrage</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.sidebarCollapsed}
                                        onChange={(e) => handleInputChange('sidebarCollapsed', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Security Settings */}
                {activeTab === 'security' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                                <ShieldCheckIcon className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Sécurité</h2>
                                <p className="text-sm text-gray-500">Paramètres de sécurité et authentification</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Délai d'expiration de session (minutes)
                                </label>
                                <input
                                    type="number"
                                    value={settings.sessionTimeout}
                                    onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value))}
                                    min="5"
                                    max="480"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-1">Recommandé : 30 minutes</p>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Changement de mot de passe requis</h3>
                                    <p className="text-sm text-gray-500 mt-1">Forcer le changement de mot de passe périodique</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.requirePasswordChange}
                                        onChange={(e) => handleInputChange('requirePasswordChange', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Authentification à deux facteurs (2FA)</h3>
                                    <p className="text-sm text-gray-500 mt-1">Activer la double authentification pour plus de sécurité</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.twoFactorAuth}
                                        onChange={(e) => handleInputChange('twoFactorAuth', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Data Settings */}
                {activeTab === 'data' && (
                    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 space-y-6">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
                            <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                                <CircleStackIcon className="w-6 h-6 text-indigo-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Données</h2>
                                <p className="text-sm text-gray-500">Gestion des données et sauvegardes</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <h3 className="font-semibold text-gray-900">Sauvegarde automatique</h3>
                                    <p className="text-sm text-gray-500 mt-1">Créer des sauvegardes automatiques de la base de données</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.autoBackup}
                                        onChange={(e) => handleInputChange('autoBackup', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>

                            {settings.autoBackup && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Fréquence de sauvegarde
                                    </label>
                                    <select
                                        value={settings.backupFrequency}
                                        onChange={(e) => handleInputChange('backupFrequency', e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    >
                                        <option value="daily">Quotidienne</option>
                                        <option value="weekly">Hebdomadaire</option>
                                        <option value="monthly">Mensuelle</option>
                                    </select>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <button
                                    onClick={handleExportData}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
                                >
                                    <DocumentArrowDownIcon className="w-5 h-5" />
                                    Exporter les données
                                </button>

                                <button
                                    onClick={handleImportData}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
                                >
                                    <DocumentArrowUpIcon className="w-5 h-5" />
                                    Importer les données
                                </button>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Zone de danger</h3>
                                <button
                                    onClick={handleClearCache}
                                    className="flex items-center justify-center gap-3 px-6 py-4 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                                >
                                    <TrashIcon className="w-5 h-5" />
                                    Vider le cache
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
