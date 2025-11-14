<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserInvitation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserActivationController extends Controller
{
    public function validateToken(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
        ]);

        $invitation = UserInvitation::where('token', $request->token)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$invitation) {
            return response()->json([
                'error' => 'Token invalide ou expiré',
            ], 404);
        }

        return response()->json([
            'valid' => true,
            'invitation' => [
                'name' => $invitation->name,
                'email' => $invitation->email,
                'role' => $invitation->role,
            ],
        ]);
    }

    public function activate(Request $request)
    {
        $request->validate([
            'token' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $invitation = UserInvitation::where('token', $request->token)
            ->where('used', false)
            ->where('expires_at', '>', now())
            ->first();

        if (!$invitation) {
            return response()->json([
                'error' => 'Token invalide ou expiré',
            ], 404);
        }

        // Vérifier si l'utilisateur existe déjà
        if (User::where('email', $invitation->email)->exists()) {
            return response()->json([
                'error' => 'Un compte existe déjà avec cet email',
            ], 422);
        }

        // Créer l'utilisateur
        // TOUJOURS utiliser les permissions par défaut basées sur le rôle pour garantir la sécurité
        $user = User::create([
            'name' => $invitation->name,
            'email' => $invitation->email,
            'password' => Hash::make($request->password),
            'role' => $invitation->role,
            'status' => 'Actif',
            'permissions' => $this->getDefaultPermissions($invitation->role),
            'email_verified_at' => now(),
            'last_login' => now(),
        ]);

        // Marquer l'invitation comme utilisée
        $invitation->update(['used' => true]);

        // Générer un token Sanctum pour connecter automatiquement l'utilisateur
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Compte activé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
            'token' => $token,
        ], 201);
    }

    private function getDefaultPermissions($role)
    {
        switch ($role) {
            case 'Administrateur':
                return ['Gestion complète', 'Rapports', 'Gestion stock', 'Réceptions', 'Sorties', 'Inventaire', 'Alertes', 'Administration'];
            case 'Gestionnaire':
                return ['Gestion stock', 'Réceptions', 'Sorties', 'Inventaire', 'Rapports'];
            default: // Utilisateur
                return ['Gestion stock', 'Réceptions', 'Sorties', 'Inventaire'];
        }
    }
}

