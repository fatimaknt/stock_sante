import React, { useEffect, useState, useRef } from 'react';
import Layout from '../components/Layout';
import TopBar from '../components/TopBar';
import { UserPlusIcon, EnvelopeIcon, XMarkIcon, EyeIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, UserIcon, ShieldCheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { getJSON, API } from '../utils/api';

type User = {
    id: number;
    name: string;
    email: string;
    role: string;
    status: string;
    last_login?: string;
    permissions?: string[];
};

export default function UserPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [error, setError] = useState<string>('');
    const [success, setSuccess] = useState<string>('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isInviteOpen, setIsInviteOpen] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [invitedEmail, setInvitedEmail] = useState<string>('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const allPermissions = [
        'Gestion complète',
        'Gestion stock',
        'Réceptions',
        'Sorties',
        'Inventaire',
        'Rapports',
        'Alertes',
        'Consultation',
        'Traçabilité',
        'Administration'
    ];

    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'Utilisateur',
        status: 'Actif',
        permissions: [] as string[]
    });
    const [editForm, setEditForm] = useState({
        id: 0,
        name: '',
        email: '',
        password: '',
        role: 'Utilisateur',
        status: 'Actif',
        permissions: [] as string[]
    });
    const [inviteForm, setInviteForm] = useState({
        name: '',
        email: '',
        role: 'Utilisateur',
        permissions: [] as string[]
    });

    // Filtres et recherche
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<string>('Tous');
    const [selectedStatus, setSelectedStatus] = useState<string>('Tous');
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
    const roleDropdownRef = useRef<HTMLDivElement>(null);
    const statusDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 5000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    // Fermer les dropdowns quand on clique en dehors
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
                setIsRoleDropdownOpen(false);
            }
            if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
                setIsStatusDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const load = async () => {
        try {
            const data = await getJSON(API('/users')) as User[];
            setUsers(Array.isArray(data) ? data : []);
            setError('');
        } catch (err: any) {
            setError(err?.message || 'Erreur de chargement');
            setUsers([]);
        }
    };

    const togglePermission = (permission: string, formType: 'create' | 'edit' | 'invite') => {
        if (formType === 'create') {
            setForm(prev => ({
                ...prev,
                permissions: prev.permissions.includes(permission)
                    ? prev.permissions.filter(p => p !== permission)
                    : [...prev.permissions, permission]
            }));
        } else if (formType === 'edit') {
            setEditForm(prev => ({
                ...prev,
                permissions: prev.permissions.includes(permission)
                    ? prev.permissions.filter(p => p !== permission)
                    : [...prev.permissions, permission]
            }));
        } else {
            setInviteForm(prev => ({
                ...prev,
                permissions: prev.permissions.includes(permission)
                    ? prev.permissions.filter(p => p !== permission)
                    : [...prev.permissions, permission]
            }));
        }
    };

    const openCreate = () => {
        setForm({ name: '', email: '', password: '', role: 'Utilisateur', status: 'Actif', permissions: [] });
        setIsCreateOpen(true);
    };

    const closeCreate = () => {
        setIsCreateOpen(false);
        setForm({ name: '', email: '', password: '', role: 'Utilisateur', status: 'Actif', permissions: [] });
    };

    const openInvite = () => {
        setInviteForm({ name: '', email: '', role: 'Utilisateur', permissions: [] });
        setIsInviteOpen(true);
    };

    const closeInvite = () => {
        setIsInviteOpen(false);
        setInviteForm({ name: '', email: '', role: 'Utilisateur', permissions: [] });
    };

    const createUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await getJSON(API('/users'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    permissions: form.permissions.length > 0 ? form.permissions : ['Gestion complète']
                })
            });
            setSuccess('Utilisateur créé avec succès!');
            closeCreate();
            load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la création');
            setSuccess('');
        }
    };

    const inviteUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await getJSON(API('/users/invite'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...inviteForm,
                    permissions: inviteForm.permissions.length > 0 ? inviteForm.permissions : ['Gestion complète']
                })
            });
            setInvitedEmail(inviteForm.email);
            setShowSuccessModal(true);
            closeInvite();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de l\'envoi de l\'invitation');
            setSuccess('');
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Administrateur':
                return 'bg-red-100 text-red-700';
            case 'Gestionnaire':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStatusColor = (status: string) => {
        return status === 'Actif' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700';
    };

    const formatDate = (date?: string) => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString('fr-FR');
        } catch {
            return 'N/A';
        }
    };

    const getUserInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    // Filtrer les utilisateurs
    const filteredUsers = users.filter(user => {
        // Filtre par recherche
        const matchesSearch = searchQuery === '' ||
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.role.toLowerCase().includes(searchQuery.toLowerCase());

        // Filtre par rôle
        const matchesRole = selectedRole === 'Tous' || user.role === selectedRole;

        // Filtre par statut
        const matchesStatus = selectedStatus === 'Tous' || user.status === selectedStatus;

        return matchesSearch && matchesRole && matchesStatus;
    });

    const openView = (user: User) => {
        setSelectedUser(user);
        setIsViewOpen(true);
    };

    const closeView = () => {
        setIsViewOpen(false);
        setSelectedUser(null);
    };

    const openEdit = (user: User) => {
        setEditForm({
            id: user.id,
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            status: user.status,
            permissions: user.permissions || []
        });
        setIsEditOpen(true);
    };

    const closeEdit = () => {
        setIsEditOpen(false);
        setEditForm({
            id: 0,
            name: '',
            email: '',
            password: '',
            role: 'Utilisateur',
            status: 'Actif',
            permissions: []
        });
    };

    const updateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await getJSON(API(`/users/${editForm.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: editForm.name,
                    email: editForm.email,
                    password: editForm.password || undefined,
                    role: editForm.role,
                    status: editForm.status,
                    permissions: editForm.permissions
                })
            });
            setSuccess('Utilisateur modifié avec succès!');
            closeEdit();
            load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la modification');
        }
    };

    const openDelete = (user: User) => {
        setSelectedUser(user);
        setIsDeleteOpen(true);
    };

    const closeDelete = () => {
        setIsDeleteOpen(false);
        setSelectedUser(null);
    };

    const deleteUser = async () => {
        if (!selectedUser) return;
        try {
            await getJSON(API(`/users/${selectedUser.id}`), {
                method: 'DELETE'
            });
            setSuccess('Utilisateur supprimé avec succès!');
            closeDelete();
            load();
        } catch (err: any) {
            setError(err?.message || 'Erreur lors de la suppression');
            closeDelete();
        }
    };

    return (
        <Layout>
            <div className="p-7 space-y-9">
                {/* Top header bar */}
                <TopBar />

                {/* Page header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold mb-2">Gestion des Utilisateurs</h1>
                        <p className="text-gray-500">Gérer les utilisateurs, rôles et permissions du système</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={openCreate}
                            className="inline-flex items-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg shadow hover:bg-gray-50 transition-colors"
                        >
                            <UserPlusIcon className="w-5 h-5" />
                            <span className="font-medium">Créer un utilisateur</span>
                        </button>
                        <button
                            onClick={openInvite}
                            className="inline-flex items-center gap-2 px-4 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors"
                        >
                            <EnvelopeIcon className="w-5 h-5" />
                            <span className="font-medium">Inviter un utilisateur</span>
                        </button>
                    </div>
                </div>

                {/* Error/Success alerts */}
                {error && (
                    <div className="bg-red-50 text-red-700 border border-red-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{error}</span>
                        <button onClick={() => setError('')} className="ml-4 p-1 rounded-full hover:bg-red-100 text-red-700 hover:text-red-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
                {success && (
                    <div className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-3 rounded-lg flex items-center justify-between">
                        <span>{success}</span>
                        <button onClick={() => setSuccess('')} className="ml-4 p-1 rounded-full hover:bg-emerald-100 text-emerald-700 hover:text-emerald-900 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-6">
                    {/* Total Users */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Total utilisateurs</p>
                                <p className="text-3xl font-bold text-gray-900">{users.length}</p>
                                <p className="text-sm text-gray-500 mt-1">Inscrits</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Active Users */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Utilisateurs actifs</p>
                                <p className="text-3xl font-bold text-emerald-600">{users.filter(u => u.status === 'Actif').length}</p>
                                <p className="text-sm text-gray-500 mt-1">En ligne</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <UserIcon className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </div>

                    {/* Administrators */}
                    <div className="bg-white border rounded-lg shadow-sm p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600 mb-1">Administrateurs</p>
                                <p className="text-3xl font-bold text-red-600">{users.filter(u => u.role === 'Administrateur').length}</p>
                                <p className="text-sm text-gray-500 mt-1">Privilégiés</p>
                            </div>
                            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                                <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filters */}
                <div className="bg-white border rounded-lg shadow-sm p-6">
                    <div className="flex items-center gap-4">
                        {/* Search Bar */}
                        <div className="flex-1 relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher par nom, email ou rôle..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>

                        {/* Role Filter */}
                        <div className="relative" ref={roleDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsRoleDropdownOpen(!isRoleDropdownOpen);
                                    setIsStatusDropdownOpen(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
                            >
                                <span>{selectedRole === 'Tous' ? 'Tous les rôles' : selectedRole}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {isRoleDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRole('Tous');
                                            setIsRoleDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedRole === 'Tous' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Tous les rôles
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRole('Administrateur');
                                            setIsRoleDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedRole === 'Administrateur' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Administrateur
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRole('Gestionnaire');
                                            setIsRoleDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedRole === 'Gestionnaire' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Gestionnaire
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedRole('Utilisateur');
                                            setIsRoleDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedRole === 'Utilisateur' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Utilisateur
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Status Filter */}
                        <div className="relative" ref={statusDropdownRef}>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsStatusDropdownOpen(!isStatusDropdownOpen);
                                    setIsRoleDropdownOpen(false);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors min-w-[150px] justify-between"
                            >
                                <span>{selectedStatus === 'Tous' ? 'Tous les statuts' : selectedStatus}</span>
                                <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                            </button>
                            {isStatusDropdownOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('Tous');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedStatus === 'Tous' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Tous les statuts
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('Actif');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedStatus === 'Actif' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Actif
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedStatus('Inactif');
                                            setIsStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${selectedStatus === 'Inactif' ? 'bg-emerald-50 text-emerald-700' : ''}`}
                                    >
                                        Inactif
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* User list table */}
                <div className="bg-white border rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-bold mb-6">Liste des Utilisateurs ({filteredUsers.length})</h2>
                    <div className="border rounded-lg overflow-hidden">
                        <table className="min-w-full text-md">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Utilisateur</th>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Rôle</th>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Statut</th>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Dernière connexion</th>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Permissions</th>
                                    <th className="text-left px-4 py-4 text-gray-600 font-semibold">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                            Aucun utilisateur trouvé
                                        </td>
                                    </tr>
                                ) : (
                                    filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-t hover:bg-emerald-50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                                                        {getUserInitials(user.name)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{user.name}</div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(user.status)}`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-gray-700">{formatDate(user.last_login)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-2">
                                                    {user.permissions && user.permissions.length > 0 ? (
                                                        user.permissions.map((perm, idx) => (
                                                            <span key={idx} className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                                {perm}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => openView(user)}
                                                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 transition-colors"
                                                        aria-label="voir"
                                                    >
                                                        <EyeIcon className="w-4 h-4 text-slate-700" />
                                                    </button>
                                                    <button
                                                        onClick={() => openEdit(user)}
                                                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white shadow-sm hover:bg-gray-50 transition-colors"
                                                        aria-label="éditer"
                                                    >
                                                        <PencilIcon className="w-4 h-4 text-slate-700" />
                                                    </button>
                                                    <button
                                                        onClick={() => openDelete(user)}
                                                        className="w-9 h-9 inline-flex items-center justify-center rounded-lg border border-red-200 bg-white shadow-sm hover:bg-red-50 transition-colors"
                                                        aria-label="supprimer"
                                                    >
                                                        <TrashIcon className="w-4 h-4 text-red-600" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Create User Modal */}
                {isCreateOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Créer un utilisateur</h2>
                                    <button onClick={closeCreate} className="text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={createUser} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Nom complet <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Mot de passe <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={form.password}
                                        onChange={e => setForm({ ...form, password: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">
                                            Rôle <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={form.role}
                                            onChange={e => setForm({ ...form, role: e.target.value })}
                                            required
                                        >
                                            <option value="Utilisateur">Utilisateur</option>
                                            <option value="Administrateur">Administrateur</option>
                                            <option value="Gestionnaire">Gestionnaire</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">
                                            Statut <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={form.status}
                                            onChange={e => setForm({ ...form, status: e.target.value })}
                                            required
                                        >
                                            <option value="Actif">Actif</option>
                                            <option value="Inactif">Inactif</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Permissions Section */}
                                <div>
                                    <label className="text-sm font-semibold mb-3 block">
                                        Permissions
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {allPermissions.map((permission) => (
                                            <button
                                                key={permission}
                                                type="button"
                                                onClick={() => togglePermission(permission, 'create')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${form.permissions.includes(permission)
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {permission}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeCreate}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors"
                                    >
                                        <UserPlusIcon className="w-5 h-5" />
                                        <span className="font-medium">Créer</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Invite User Modal */}
                {isInviteOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Inviter un utilisateur</h2>
                                    <button onClick={closeInvite} className="text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={inviteUser} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Nom complet <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={inviteForm.name}
                                        onChange={e => setInviteForm({ ...inviteForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={inviteForm.email}
                                        onChange={e => setInviteForm({ ...inviteForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Rôle <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={inviteForm.role}
                                        onChange={e => setInviteForm({ ...inviteForm, role: e.target.value })}
                                        required
                                    >
                                        <option value="Utilisateur">Utilisateur</option>
                                        <option value="Administrateur">Administrateur</option>
                                        <option value="Gestionnaire">Gestionnaire</option>
                                    </select>
                                </div>

                                {/* Permissions Section */}
                                <div>
                                    <label className="text-sm font-semibold mb-3 block">
                                        Permissions
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {allPermissions.map((permission) => (
                                            <button
                                                key={permission}
                                                type="button"
                                                onClick={() => togglePermission(permission, 'invite')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${inviteForm.permissions.includes(permission)
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {permission}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Processus d'invitation */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                                    <div className="flex items-start gap-3">
                                        <EnvelopeIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-gray-900 mb-3">Processus d'invitation</h3>
                                            <ul className="space-y-2 text-sm text-gray-700">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-blue-600 mt-1">•</span>
                                                    <span>Un email sera envoyé à l'utilisateur avec un lien d'activation</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-blue-600 mt-1">•</span>
                                                    <span>Le lien est valide 24 heures</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-blue-600 mt-1">•</span>
                                                    <span>L'utilisateur devra définir son mot de passe lors de l'activation</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeInvite}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors"
                                    >
                                        <EnvelopeIcon className="w-5 h-5" />
                                        <span className="font-medium">Envoyer une invitation</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* View User Modal */}
                {isViewOpen && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Détails de l'utilisateur</h2>
                                    <button onClick={closeView} className="text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">
                                        {getUserInitials(selectedUser.name)}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                                        <p className="text-gray-600">{selectedUser.email}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Rôle</label>
                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getRoleColor(selectedUser.role)}`}>
                                            {selectedUser.role}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Statut</label>
                                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedUser.status)}`}>
                                            {selectedUser.status}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Dernière connexion</label>
                                        <p className="text-gray-600">{formatDate(selectedUser.last_login)}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 mb-1 block">Permissions</label>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedUser.permissions && selectedUser.permissions.length > 0 ? (
                                                selectedUser.permissions.map((perm, idx) => (
                                                    <span key={idx} className="inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                                        {perm}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-gray-400">Aucune</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        onClick={closeView}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit User Modal */}
                {isEditOpen && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-2xl font-bold">Modifier l'utilisateur</h2>
                                    <button onClick={closeEdit} className="text-gray-400 hover:text-gray-600">
                                        <XMarkIcon className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={updateUser} className="p-6 space-y-4">
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Nom complet <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={editForm.name}
                                        onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={editForm.email}
                                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-semibold mb-2 block">
                                        Nouveau mot de passe <span className="text-gray-500 text-xs">(laisser vide pour ne pas changer)</span>
                                    </label>
                                    <input
                                        type="password"
                                        className="w-full border rounded-lg px-3 py-2"
                                        value={editForm.password}
                                        onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                        placeholder="Laissez vide pour ne pas changer"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">
                                            Rôle <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.role}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                            required
                                        >
                                            <option value="Utilisateur">Utilisateur</option>
                                            <option value="Administrateur">Administrateur</option>
                                            <option value="Gestionnaire">Gestionnaire</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-semibold mb-2 block">
                                            Statut <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            className="w-full border rounded-lg px-3 py-2"
                                            value={editForm.status}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                            required
                                        >
                                            <option value="Actif">Actif</option>
                                            <option value="Inactif">Inactif</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Permissions Section */}
                                <div>
                                    <label className="text-sm font-semibold mb-3 block">
                                        Permissions
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {allPermissions.map((permission) => (
                                            <button
                                                key={permission}
                                                type="button"
                                                onClick={() => togglePermission(permission, 'edit')}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${editForm.permissions.includes(permission)
                                                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {permission}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={closeEdit}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        type="submit"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                        <span className="font-medium">Enregistrer</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete User Modal */}
                {isDeleteOpen && selectedUser && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="p-6">
                                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mx-auto mb-4">
                                    <TrashIcon className="w-8 h-8 text-red-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-center mb-2">Supprimer l'utilisateur</h2>
                                <p className="text-gray-600 text-center mb-6">
                                    Êtes-vous sûr de vouloir supprimer <span className="font-semibold">{selectedUser.name}</span> ({selectedUser.email}) ?
                                    Cette action est irréversible.
                                </p>
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        onClick={closeDelete}
                                        className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={deleteUser}
                                        className="px-6 py-2 bg-red-600 text-white rounded-lg shadow hover:bg-red-700 transition-colors font-medium"
                                    >
                                        Supprimer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success Modal */}
                {showSuccessModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                            <div className="p-6 text-center">
                                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                                </div>
                                <h2 className="text-2xl font-bold mb-2">Invitation envoyée !</h2>
                                <p className="text-gray-600 mb-1">
                                    Un email d'invitation a été envoyé à <span className="font-semibold">{invitedEmail}</span>
                                </p>
                                <p className="text-gray-600 mb-6">
                                    L'utilisateur recevra un lien pour activer son compte et définir son mot de passe.
                                </p>
                                <button
                                    onClick={() => setShowSuccessModal(false)}
                                    className="w-full px-6 py-3 bg-emerald-700 text-white rounded-lg shadow hover:bg-emerald-800 transition-colors font-medium"
                                >
                                    Fermer
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
