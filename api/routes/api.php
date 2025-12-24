<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{ProductController,ReceiptController,StockOutController,InventoryController,StatsController,CategoryController,UserController,AuthController,UserActivationController,VehicleController,MaintenanceController,ApprovalController,NeedController};

// Route de test pour vérifier que Laravel fonctionne
Route::get('test', function () {
    return response()->json(['status' => 'ok', 'message' => 'API is working']);
});

// Route de test pour voir les users (sans auth pour le debug)
Route::get('test/users', function () {
    try {
        $users = \App\Models\User::limit(5)->get(['id', 'name', 'email', 'role']);
        return response()->json(['status' => 'ok', 'users' => $users]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Route de test pour voir les produits (sans auth pour le debug)
Route::get('test/products', function () {
    try {
        $count = \App\Models\Product::count();
        $products = \App\Models\Product::limit(5)->get();
        return response()->json(['status' => 'ok', 'total_count' => $count, 'products' => $products]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// Route de diagnostic - voir TOUS les produits avec tous les détails
Route::get('test/products-all', function () {
    try {
        $allProducts = \App\Models\Product::all();
        return response()->json([
            'status' => 'ok',
            'total_count' => $allProducts->count(),
            'products' => $allProducts,
            'database_info' => [
                'connection' => config('database.default'),
                'table_name' => 'products'
            ]
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage(), 'trace' => $e->getTraceAsString()], 500);
    }
});

// Route protégée simple pour les produits (alternative au ResourceController)
Route::middleware('auth:sanctum')->get('products-simple', function () {
    try {
        $products = \App\Models\Product::orderByDesc('id')->get();
        return response()->json(['items' => $products], 200);
    } catch (\Throwable $e) {
        \Log::error('ProductsSimple error: ' . $e->getMessage());
        return response()->json([
            'error' => 'Server error',
            'message' => $e->getMessage(),
        ], 500);
    }
});

// Route de test pour vérifier la connexion
Route::post('test/login', function (\Illuminate\Http\Request $request) {
    try {
        $email = $request->input('email', 'test@example.com');
        return response()->json([
            'status' => 'ok',
            'message' => 'Login test endpoint',
            'email' => $email,
            'hint' => 'Use /api/auth/login for real authentication'
        ]);
    } catch (\Exception $e) {
        return response()->json(['status' => 'error', 'message' => $e->getMessage()], 500);
    }
});

// REMOVED: Seeding routes are disabled in production
// They caused data duplication issues with firstOrCreate() logic
// To seed the database, use: php artisan db:seed --class=ProductSeeder
// Or run migrations only: php artisan migrate --force

// Routes publiques (pas d'authentification)
Route::post('auth/login', [AuthController::class,'login']);
// ENREGISTREMENT DÉSACTIVÉ - Seul l'admin peut créer des comptes
// Route::post('auth/register', [AuthController::class,'register']);

// Routes d'activation (publiques - pour les nouveaux utilisateurs invités)
Route::post('auth/validate-token', [UserActivationController::class,'validateToken']);
Route::post('auth/activate', [UserActivationController::class,'activate']);

Route::get('auth/google', [AuthController::class,'redirectToGoogle']);
Route::get('auth/google/callback', [AuthController::class,'handleGoogleCallback']);
Route::get('categories', [CategoryController::class,'index']); // Categories publiques

// Routes protégées (authentification requise)
Route::middleware('auth:sanctum')->group(function () {
    // Produits
    Route::apiResource('products', ProductController::class);

    // Réceptions
    Route::get('receipts', [ReceiptController::class,'index']);
    Route::post('receipts', [ReceiptController::class,'store']);
    Route::put('receipts/{id}', [ReceiptController::class,'update']);
    Route::delete('receipts/{id}', [ReceiptController::class,'destroy']);

    // Sorties
    Route::get('stockouts', [StockOutController::class,'index']);
    Route::post('stockouts', [StockOutController::class,'store']);
    Route::post('stockouts/{id}/validate', [StockOutController::class,'validate']);
    Route::post('stockouts/{id}/return', [StockOutController::class,'return']);

    // Inventaires
    Route::get('inventories', [InventoryController::class,'index']);
    Route::post('inventories', [InventoryController::class,'store']);

    // Statistiques
    Route::get('stats', [StatsController::class,'index']);

    // Utilisateurs
    Route::get('users', [UserController::class,'index']);
    Route::post('users', [UserController::class,'store']);
    Route::put('users/{user}', [UserController::class,'update']);
    Route::delete('users/{user}', [UserController::class,'destroy']);
    Route::post('users/invite', [UserController::class,'invite']);

    // Véhicules
    Route::get('vehicles', [VehicleController::class,'index']);
    Route::post('vehicles', [VehicleController::class,'store']);
    Route::post('vehicles/assign', [VehicleController::class,'assign']);
    Route::post('vehicles/{id}/unassign', [VehicleController::class,'unassign']);
Route::post('vehicles/{id}/reform', [VehicleController::class,'reform']);

    // Maintenances
    Route::get('maintenances', [MaintenanceController::class,'index']);
    Route::post('maintenances', [MaintenanceController::class,'store']);

    // Approbations (uniquement pour les admins)
    Route::get('approvals', [ApprovalController::class,'index']);
    Route::get('approvals/{id}', [ApprovalController::class,'show']);
    Route::post('approvals/{id}/approve', [ApprovalController::class,'approve']);
    Route::post('approvals/{id}/reject', [ApprovalController::class,'reject']);

    // Besoins
    Route::get('needs', [NeedController::class,'index']);
    Route::post('needs', [NeedController::class,'store']);
    Route::post('needs/{id}/approve', [NeedController::class,'approve']);
    Route::post('needs/{id}/reject', [NeedController::class,'reject']);

    // Authentification protégée
    Route::post('auth/logout', [AuthController::class,'logout']);
    Route::get('auth/user', [AuthController::class,'user']);
});
