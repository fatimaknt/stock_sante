<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserInvitation;
use App\Mail\UserInvitationMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index()
    {
        return User::orderByDesc('id')->get()->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role ?? 'Utilisateur',
                'status' => $user->status ?? 'Actif',
                'last_login' => $user->last_login?->toDateTimeString(),
                'permissions' => $user->permissions ?? [],
            ];
        });
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:Utilisateur,Administrateur,Gestionnaire',
            'status' => 'required|string|in:Actif,Inactif',
            'permissions' => 'sometimes|array',
        ]);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $data['role'],
            'status' => $data['status'],
            'permissions' => $data['permissions'] ?? $this->getDefaultPermissions($data['role']),
        ]);

        return response()->json(['id' => $user->id], 201);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'sometimes|string|min:8',
            'role' => 'sometimes|string|in:Utilisateur,Administrateur,Gestionnaire',
            'status' => 'sometimes|string|in:Actif,Inactif',
            'permissions' => 'sometimes|array',
        ]);

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        // Si permissions sont fournies, utiliser celles-ci, sinon utiliser les permissions par défaut du rôle
        if (isset($data['permissions'])) {
            // Utiliser les permissions fournies
        } elseif (isset($data['role']) && $data['role'] !== $user->role) {
            $data['permissions'] = $this->getDefaultPermissions($data['role']);
        }

        $user->update($data);

        return ['updated' => true];
    }

    public function destroy(User $user)
    {
        $user->delete();
        return ['deleted' => true];
    }

    public function invite(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'role' => 'required|string|in:Utilisateur,Administrateur,Gestionnaire',
            'permissions' => 'sometimes|array',
        ]);

        // Vérifier si une invitation existe déjà pour cet email
        $existingInvitation = UserInvitation::where('email', $data['email'])
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if ($existingInvitation) {
            return response()->json([
                'error' => 'Une invitation est déjà en cours pour cet email',
                'message' => 'Un email d\'invitation a déjà été envoyé à cette adresse et n\'a pas encore été utilisé.',
            ], 422);
        }

        // Si une invitation expirée ou utilisée existe, la supprimer avant d'en créer une nouvelle
        UserInvitation::where('email', $data['email'])
            ->where(function ($query) {
                $query->where('used', true)
                      ->orWhere('expires_at', '<=', now());
            })
            ->delete();

        $token = Str::random(64);
        $expiresAt = now()->addHours(24);

        $invitation = UserInvitation::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'role' => $data['role'],
            'permissions' => $request->input('permissions', $this->getDefaultPermissions($data['role'])),
            'token' => $token,
            'expires_at' => $expiresAt,
        ]);

        // Envoyer l'email d'invitation
        try {
            Mail::to($data['email'])->send(new UserInvitationMail($invitation));
            \Log::info("Invitation email sent successfully to {$data['email']}");
        } catch (\Exception $e) {
            \Log::error("Failed to send invitation email to {$data['email']}: " . $e->getMessage());
            // On continue quand même car l'invitation est créée
        }

        return response()->json([
            'message' => 'Invitation envoyée avec succès',
            'invitation_id' => $invitation->id,
        ], 201);
    }

    private function getDefaultPermissions($role)
    {
        $permissions = ['Gestion complète'];

        switch ($role) {
            case 'Administrateur':
                $permissions = ['Gestion complète', 'Rapports', 'Gestion stock'];
                break;
            case 'Gestionnaire':
                $permissions = ['Gestion complète', 'Gestion stock'];
                break;
            default:
                $permissions = ['Gestion complète'];
        }

        return $permissions;
    }
}

