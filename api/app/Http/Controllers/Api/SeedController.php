<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class SeedController extends Controller
{
    /**
     * Run database seeds
     */
    public function seed(Request $request)
    {
        // Only allow in non-production or with a secret token
        $secret = env('SEED_SECRET_TOKEN', 'dev_seed_token');

        if ($request->header('X-Seed-Token') !== $secret) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        try {
            Artisan::call('db:seed');
            return response()->json(['message' => 'Database seeded successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
