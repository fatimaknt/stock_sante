<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Obtenir l'origine de la requête
        $origin = $request->headers->get('Origin');
        $allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:3001',
            'http://127.0.0.1:3001',
            'http://localhost:10000',
            'https://www.optimatech.pro',
            'https://optimatech.pro',
            'https://stock-sante.onrender.com',
            'https://stock-sante-backend.onrender.com',
        ];

        // Si l'origine est dans la liste autorisée, l'utiliser, sinon utiliser *
        $allowedOrigin = ($origin && in_array($origin, $allowedOrigins)) ? $origin : '*';
        $allowCredentials = ($allowedOrigin !== '*');

        // Gérer les requêtes OPTIONS (preflight) - DOIT être géré AVANT toute autre logique
        if ($request->getMethod() === 'OPTIONS') {
            $headers = [
                'Access-Control-Allow-Origin' => $allowedOrigin,
                'Access-Control-Allow-Methods' => 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
                'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
                'Access-Control-Expose-Headers' => 'Content-Length, Content-Type',
                'Access-Control-Max-Age' => '86400',
            ];

            if ($allowCredentials) {
                $headers['Access-Control-Allow-Credentials'] = 'true';
            }

            return response('', 200, $headers);
        }

        // Traiter la requête normale
        $response = $next($request);

        // Ajouter les headers CORS à toutes les réponses
        // Utiliser la méthode headers->set() pour chaque header individuellement
        $response->headers->set('Access-Control-Allow-Origin', $allowedOrigin);
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
        $response->headers->set('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
        $response->headers->set('Access-Control-Max-Age', '86400');

        if ($allowCredentials) {
            $response->headers->set('Access-Control-Allow-Credentials', 'true');
        }

        return $response;
    }
}
