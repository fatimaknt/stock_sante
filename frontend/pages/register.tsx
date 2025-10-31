import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { API, getJSONPublic } from '../utils/api';

export default function RegisterPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Vérifier si l'utilisateur est déjà connecté
        const token = localStorage.getItem('auth_token');
        if (token) {
            router.push('/');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (form.password !== form.password_confirmation) {
            setError('Les mots de passe ne correspondent pas');
            setLoading(false);
            return;
        }

        if (form.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(API('/auth/register'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                    role: 'Utilisateur',
                    status: 'Actif',
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Erreur lors de la création du compte');
            }

            const data = await response.json() as any;

            if (data.token) {
                localStorage.setItem('auth_token', data.token);
                router.push('/');
            } else {
                // Si pas de token, rediriger vers login
                router.push('/login?registered=true');
            }
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la création du compte');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="#10b981" fillOpacity="1" />
                            <path d="M3 7V17L12 22L21 17V7L12 12L3 7Z" fill="#10b981" fillOpacity="0.85" />
                            <path d="M12 12V22L21 17V7L12 12Z" fill="#10b981" fillOpacity="0.7" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">StockPro</h1>
                    <p className="text-gray-600">Créez votre compte</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Nom complet <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            required
                            placeholder="Votre nom complet"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Email <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required
                            placeholder="votre@email.com"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="w-full border rounded-lg px-3 py-2 pr-10"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                required
                                minLength={8}
                                placeholder="Minimum 8 caractères"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPassword ? (
                                    <EyeSlashIcon className="w-5 h-5" />
                                ) : (
                                    <EyeIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Confirmer le mot de passe <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showPasswordConfirmation ? 'text' : 'password'}
                                className="w-full border rounded-lg px-3 py-2 pr-10"
                                value={form.password_confirmation}
                                onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                required
                                minLength={8}
                                placeholder="Confirmez votre mot de passe"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                            >
                                {showPasswordConfirmation ? (
                                    <EyeSlashIcon className="w-5 h-5" />
                                ) : (
                                    <EyeIcon className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Création en cours...' : 'Créer mon compte'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Vous avez déjà un compte ?{' '}
                        <a href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Se connecter
                        </a>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Vous avez reçu une invitation ?{' '}
                        <a href="/auth/activate" className="text-emerald-600 hover:text-emerald-700 font-medium">
                            Activer mon compte
                        </a>
                    </p>
                </div>
            </div>
        </div>
    );
}

