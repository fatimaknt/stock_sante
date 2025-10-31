import { ReactNode } from 'react';
// @ts-ignore - Next.js resolves TS/TSX without explicit extensions
import Sidebar from './Sidebar';
import { useSidebar } from '../contexts/SidebarContext';

export default function Layout({ children }: { children: ReactNode }) {
    const { isCollapsed, toggle } = useSidebar();
    return (
        <div className="flex min-h-screen bg-gray-50">
            <Sidebar isCollapsed={isCollapsed} onToggle={toggle} />
            <main className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-16' : 'ml-64'}`}>
                {children}
            </main>
        </div>
    );
}
