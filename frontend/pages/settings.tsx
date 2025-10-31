import Layout from '../components/Layout';
import TopBar from '../components/TopBar';

export default function SettingsPage() {
    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />
                <div>
                    <h2 className="text-xl font-semibold">Paramètres</h2>
                    <p className="text-gray-600 mt-2">Page de paramètres (à implémenter).</p>
                </div>
            </div>
        </Layout>
    );
}

