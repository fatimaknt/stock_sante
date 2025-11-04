import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSettings } from './SettingsContext';

interface SidebarContextType {
    isCollapsed: boolean;
    toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
    const { settings, updateSetting } = useSettings();
    const [isCollapsed, setIsCollapsed] = useState(settings.sidebarCollapsed);

    // Synchroniser avec les paramètres
    useEffect(() => {
        setIsCollapsed(settings.sidebarCollapsed);
    }, [settings.sidebarCollapsed]);

    const toggle = () => {
        const newValue = !isCollapsed;
        setIsCollapsed(newValue);
        // Mettre à jour les paramètres
        updateSetting('sidebarCollapsed', newValue);
    };

    return (
        <SidebarContext.Provider value={{ isCollapsed, toggle }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function useSidebar() {
    const context = useContext(SidebarContext);
    if (context === undefined) {
        throw new Error('useSidebar must be used within a SidebarProvider');
    }
    return context;
}

