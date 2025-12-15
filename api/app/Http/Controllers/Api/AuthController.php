<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Facades\Socialite;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function redirectToGoogle()
    {
        return Socialite::driver('google')
            ->redirect();
    }

    public function handleGoogleCallback(Request $request)
    {
        try {
            $googleUser = Socialite::driver('google')->user();

            // Chercher ou créer l'utilisateur
            $user = User::where('email', $googleUser->email)->first();

            if (!$user) {
                // Créer un nouvel utilisateur avec Google
                $user = User::create([
                    'name' => $googleUser->name,
                    'email' => $googleUser->email,
                    'google_id' => $googleUser->id,
                    'password' => Hash::make(Str::random(32)), // Mot de passe aléatoire car authentification Google
                    'role' => 'Utilisateur',
                    'status' => 'Actif',
                    'permissions' => $this->getDefaultPermissions('Utilisateur'),
                    'email_verified_at' => now(),
                ]);
            } else {
                // Mettre à jour google_id si l'utilisateur existe déjà
                if (!$user->google_id) {
                    $user->update(['google_id' => $googleUser->id]);
                }
            }

            // Mettre à jour la dernière connexion
            $user->update(['last_login' => now()]);

            // Générer un token Sanctum pour l'API
            $token = $user->createToken('auth-token')->plainTextToken;

            // Retourner les informations utilisateur et le token
            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                ],
                'token' => $token,
                'redirect' => env('FRONTEND_URL', 'http://localhost:3000') . '/auth/callback?token=' . $token,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de l\'authentification Google',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        if (Auth::attempt($credentials)) {
            $user = Auth::user();
            $user->update(['last_login' => now()]);

            $token = $user->createToken('auth-token')->plainTextToken;

            return response()->json([
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'status' => $user->status,
                ],
                'token' => $token,
            ]);
        }

        return response()->json([
            'error' => 'Email ou mot de passe incorrect',
        ], 401);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnexion réussie']);
    }

    public function user(Request $request)
    {
        try {
            $user = $request->user();
            
            if (!$user) {
                return response()->json(['error' => 'Utilisateur non authentifié'], 401);
            }
            
            // S'assurer que le rôle existe et est valide
            $role = $user->role ?? 'Utilisateur';
            if (!in_array($role, ['Administrateur', 'Gestionnaire', 'Utilisateur'])) {
                $role = 'Utilisateur';
                $user->update(['role' => 'Utilisateur']);
            }
            
            $currentPermissions = $user->permissions ?? [];
            $expectedPermissions = $this->getDefaultPermissions($role);
            
            // Vérifier si l'utilisateur a "Gestion complète" mais n'est pas Administrateur
            $hasGestionComplete = false;
            foreach ($currentPermissions as $perm) {
                if (strtolower(trim($perm)) === 'gestion complète') {
                    $hasGestionComplete = true;
                    break;
                }
            }
            
            // Si l'utilisateur a "Gestion complète" mais n'est pas Administrateur, corriger automatiquement
            if ($hasGestionComplete && $role !== 'Administrateur') {
                $user->update(['permissions' => $expectedPermissions]);
                $currentPermissions = $expectedPermissions;
            }
            
            // S'assurer que les permissions correspondent au rôle
            if ($currentPermissions !== $expectedPermissions && $role !== 'Administrateur') {
                $user->update(['permissions' => $expectedPermissions]);
                $currentPermissions = $expectedPermissions;
            }
            
            return response()->json([
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $role,
                'status' => $user->status,
                'permissions' => $currentPermissions,
            ]);
        } catch (\Exception $e) {
            \Log::error('AuthController::user error: ' . $e->getMessage(), ['exception' => $e]);
            return response()->json(['error' => 'Erreur serveur', 'message' => $e->getMessage()], 500);
        }
    }

    public function register(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
        ]);

        $role = $request->input('role', 'Utilisateur');
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => $role,
            'status' => $request->input('status', 'Actif'),
            'permissions' => $this->getDefaultPermissions($role),
            'email_verified_at' => now(),
        ]);

        // Connecter automatiquement l'utilisateur après inscription
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'message' => 'Compte créé avec succès',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
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

