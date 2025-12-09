<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{ProductController,ReceiptController,StockOutController,InventoryController,StatsController,CategoryController,UserController,AuthController,UserActivationController,VehicleController,MaintenanceController,ApprovalController,NeedController};

// Routes publiques (pas d'authentification)
Route::post('auth/login', [AuthController::class,'login']);
Route::post('auth/register', [AuthController::class,'register']);
Route::get('auth/validate-token', [UserActivationController::class,'validateToken']);
Route::post('auth/activate', [UserActivationController::class,'activate']);
Route::get('auth/google', [AuthController::class,'redirectToGoogle']);
Route::get('auth/google/callback', [AuthController::class,'handleGoogleCallback']);

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

    // Catégories
    Route::get('categories', [CategoryController::class,'index']);

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
