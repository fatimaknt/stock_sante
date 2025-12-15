<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class HandleApiAuth
{
    public function handle(Request $request, Closure $next)
    {
        // Vérifier l'authentification pour les routes API
        if ($request->is('api/*')) {
            // Essayer d'authentifier l'utilisateur avec Sanctum
            $user = Auth::user();

            if (!$user) {
                // Pas authentifié, retourner JSON
                return response()->json(['error' => 'Unauthenticated'], 401);
            }
        }

        return $next($request);
    }
}
