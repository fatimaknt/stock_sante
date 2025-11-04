import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { CheckCircleIcon, XCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { getJSONPublic, API } from '../../utils/api';

type InvitationData = {
    name: string;
    email: string;
    role: string;
};

export default function ActivatePage() {
    const router = useRouter();
    const { token } = router.query;
    const [invitation, setInvitation] = useState<InvitationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({
        password: '',
        password_confirmation: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (token && typeof token === 'string') {
            validateToken(token);
        }
    }, [token]);

    const validateToken = async (tokenValue: string) => {
        try {
            setLoading(true);
            setError('');
            const data = await getJSONPublic(API(`/auth/validate-token?token=${tokenValue}`)) as any;
            if (data.valid && data.invitation) {
                setInvitation(data.invitation);
            } else {
                setError('Token invalide ou expiré');
            }
        } catch (err: any) {
            setError(err?.message || 'Token invalide ou expiré');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        if (form.password !== form.password_confirmation) {
            setError('Les mots de passe ne correspondent pas');
            setSubmitting(false);
            return;
        }

        if (form.password.length < 8) {
            setError('Le mot de passe doit contenir au moins 8 caractères');
            setSubmitting(false);
            return;
        }

        try {
            const response = await fetch(API('/auth/activate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: token,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || data.message || 'Erreur lors de l\'activation du compte');
            }

            // Si un token est retourné, le stocker pour connecter automatiquement l'utilisateur
            if (data.token) {
                localStorage.setItem('auth_token', data.token);
            }

            setSuccess(true);
            setTimeout(() => {
                router.push('/');
            }, 2000);
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de l\'activation du compte');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Vérification du lien d'activation...</p>
                </div>
            </div>
        );
    }

    if (error && !invitation) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                        <XCircleIcon className="w-10 h-10 text-red-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Lien invalide</h1>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <p className="text-sm text-gray-500">
                        Ce lien d'activation a peut-être expiré ou a déjà été utilisé.
                    </p>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
                    <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                        <CheckCircleIcon className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h1>
                    <p className="text-gray-600 mb-6">
                        Votre compte a été activé avec succès. Vous allez être redirigé vers le tableau de bord...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Activer mon compte</h1>
                    <p className="text-gray-600">
                        Bonjour <strong>{invitation?.name}</strong>
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                        Définissez votre mot de passe pour finaliser l'activation
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Email
                        </label>
                        <input
                            type="email"
                            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                            value={invitation?.email || ''}
                            disabled
                        />
                    </div>

                    <div>
                        <label className="text-sm font-semibold mb-2 block text-gray-700">
                            Rôle
                        </label>
                        <input
                            type="text"
                            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
                            value={invitation?.role || ''}
                            disabled
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
                        disabled={submitting}
                        className="w-full px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? 'Activation en cours...' : 'Activer mon compte'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-gray-500">
                        Ce lien est valide pendant 24 heures
                    </p>
                </div>
            </div>
        </div>
    );
}

