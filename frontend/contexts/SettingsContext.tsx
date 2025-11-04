import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const DEFAULT_SETTINGS = {
    // Paramètres généraux
    organizationName: 'StockPro',
    organizationEmail: 'contact@stockpro.com',
    defaultCurrency: 'EUR',
    language: 'fr',

    // Notifications
    emailNotifications: true,
    lowStockAlerts: true,
    outOfStockAlerts: true,
    receiptNotifications: true,
    stockoutNotifications: true,

    // Affichage
    theme: 'light', // light, dark, auto
    sidebarCollapsed: false,
    itemsPerPage: 20,

    // Sécurité
    sessionTimeout: 30, // minutes
    requirePasswordChange: false,
    twoFactorAuth: false,

    // Export/Import
    autoBackup: true,
    backupFrequency: 'daily', // daily, weekly, monthly
};

type Settings = typeof DEFAULT_SETTINGS;

interface SettingsContextType {
    settings: Settings;
    updateSetting: (key: keyof Settings, value: any) => void;
    updateSettings: (newSettings: Partial<Settings>) => void;
    resetSettings: () => void;
}

const STORAGE_KEY = 'stockpro_settings';

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
    const [loaded, setLoaded] = useState(false);

    // Charger les paramètres depuis localStorage au démarrage
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(STORAGE_KEY);
            if (savedSettings) {
                const parsed = JSON.parse(savedSettings);
                const mergedSettings = { ...DEFAULT_SETTINGS, ...parsed };
                setSettings(mergedSettings);

                // Appliquer le thème immédiatement après le chargement
                if (typeof document !== 'undefined') {
                    const root = document.documentElement;
                    if (mergedSettings.theme === 'dark') {
                        root.classList.add('dark');
                    } else if (mergedSettings.theme === 'light') {
                        root.classList.remove('dark');
                    } else {
                        // Auto: suivre les préférences du système
                        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                        if (mediaQuery.matches) {
                            root.classList.add('dark');
                        } else {
                            root.classList.remove('dark');
                        }
                    }
                    // Appliquer la langue au document HTML
                    const localeMap: { [key: string]: string } = {
                        'fr': 'fr',
                        'en': 'en',
                        'es': 'es'
                    };
                    const lang = localeMap[mergedSettings.language] || 'fr';
                    root.setAttribute('lang', lang);
                }
            } else {
                // Appliquer le thème par défaut même sans settings sauvegardés
                if (typeof document !== 'undefined') {
                    const root = document.documentElement;
                    root.classList.remove('dark');
                    // Appliquer la langue par défaut
                    root.setAttribute('lang', 'fr');
                }
            }
        } catch (err) {
            console.error('Erreur lors du chargement des paramètres:', err);
        } finally {
            setLoaded(true);
        }
    }, []);

    // Appliquer le thème immédiatement quand il change (même avant loaded)
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const root = document.documentElement;
            if (settings.theme === 'dark') {
                root.classList.add('dark');
            } else if (settings.theme === 'light') {
                root.classList.remove('dark');
            } else {
                // Auto: suivre les préférences du système
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                const updateTheme = () => {
                    if (mediaQuery.matches) {
                        root.classList.add('dark');
                    } else {
                        root.classList.remove('dark');
                    }
                };
                updateTheme();
                // Ajouter un listener pour les changements de préférence système
                if (settings.theme === 'auto') {
                    mediaQuery.addEventListener('change', updateTheme);
                    return () => mediaQuery.removeEventListener('change', updateTheme);
                }
            }
        }
    }, [settings.theme]);

    // Appliquer la langue au document HTML quand elle change
    useEffect(() => {
        if (typeof document !== 'undefined') {
            const html = document.documentElement;
            const localeMap: { [key: string]: string } = {
                'fr': 'fr',
                'en': 'en',
                'es': 'es'
            };
            const lang = localeMap[settings.language] || 'fr';
            html.setAttribute('lang', lang);
        }
    }, [settings.language]);

    // Sauvegarder dans localStorage quand les settings changent
    useEffect(() => {
        if (loaded) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
            } catch (err) {
                console.error('Erreur lors de la sauvegarde des paramètres:', err);
            }
        }
    }, [settings, loaded]);

    const updateSetting = (key: keyof Settings, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const updateSettings = (newSettings: Partial<Settings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(DEFAULT_SETTINGS);
        localStorage.removeItem(STORAGE_KEY);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSetting, updateSettings, resetSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

