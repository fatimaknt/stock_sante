<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PendingOperation;
use App\Models\{Receipt, ReceiptItem, StockMovement, Product, Vehicle};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ApprovalController extends Controller
{
    /**
     * Liste toutes les demandes en attente (pour les admins)
     */
    public function index()
    {
        $user = Auth::user();
        
        // Seuls les admins peuvent voir les demandes
        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        return PendingOperation::with(['user', 'approver'])
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(function ($op) {
                return [
                    'id' => $op->id,
                    'type' => $op->type,
                    'data' => $op->data,
                    'user' => [
                        'id' => $op->user->id,
                        'name' => $op->user->name,
                        'email' => $op->user->email,
                    ],
                    'created_at' => $op->created_at,
                ];
            });
    }

    /**
     * Affiche les détails d'une demande
     */
    public function show($id)
    {
        $user = Auth::user();
        
        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        $operation = PendingOperation::with(['user', 'approver'])->findOrFail($id);
        
        return [
            'id' => $operation->id,
            'type' => $operation->type,
            'data' => $operation->data,
            'user' => [
                'id' => $operation->user->id,
                'name' => $operation->user->name,
                'email' => $operation->user->email,
            ],
            'status' => $operation->status,
            'approved_by' => $operation->approver ? [
                'id' => $operation->approver->id,
                'name' => $operation->approver->name,
            ] : null,
            'rejection_reason' => $operation->rejection_reason,
            'approved_at' => $operation->approved_at,
            'created_at' => $operation->created_at,
        ];
    }

    /**
     * Approuve une demande et exécute l'opération
     */
    public function approve($id)
    {
        $user = Auth::user();
        
        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        $operation = PendingOperation::findOrFail($id);
        
        if ($operation->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée'], 400);
        }

        return DB::transaction(function () use ($operation, $user) {
            try {
                // Exécuter l'opération selon son type
                switch ($operation->type) {
                    case 'receipt':
                        $this->executeReceipt($operation->data);
                        break;
                    case 'stockout':
                        $this->executeStockOut($operation->data);
                        break;
                    case 'vehicle':
                        $this->executeVehicle($operation->data);
                        break;
                    default:
                        throw new \Exception("Type d'opération non supporté: " . $operation->type);
                }

                // Marquer comme approuvée
                $operation->update([
                    'status' => 'approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Opération approuvée et exécutée avec succès',
                    'operation_id' => $operation->id,
                ]);
            } catch (\Exception $e) {
                \Log::error('Erreur lors de l\'approbation: ' . $e->getMessage());
                throw $e;
            }
        });
    }

    /**
     * Rejette une demande
     */
    public function reject(Request $request, $id)
    {
        $user = Auth::user();
        
        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        $operation = PendingOperation::findOrFail($id);
        
        if ($operation->status !== 'pending') {
            return response()->json(['message' => 'Cette demande a déjà été traitée'], 400);
        }

        $rejectionReason = $request->input('reason', 'Demande rejetée par l\'administrateur');

        $operation->update([
            'status' => 'rejected',
            'approved_by' => $user->id,
            'rejection_reason' => $rejectionReason,
            'approved_at' => now(),
        ]);

        return response()->json([
            'message' => 'Demande rejetée avec succès',
            'operation_id' => $operation->id,
        ]);
    }

    /**
     * Exécute une réception
     */
    private function executeReceipt($data)
    {
        $user = Auth::user();
        
        // Vérifier l'unicité de la ref si elle est fournie
        if (!empty($data['ref'])) {
            $existingReceipt = Receipt::where('ref', $data['ref'])->first();
            if ($existingReceipt) {
                throw new \Exception("La référence de réception '{$data['ref']}' existe déjà");
            }
        }

        // Créer la réception avec status 'approved'
        $receipt = Receipt::create(array_merge(
            collect($data)->except('items')->toArray(),
            [
                'status' => 'approved',
                'approved_by' => $user->id,
                'approved_at' => now(),
            ]
        ));
        
        foreach ($data['items'] as $item) {
            $productId = $item['product_id'] ?? null;

            // Si product_name est fourni mais pas product_id, chercher ou créer le produit
            if (!$productId && isset($item['product_name']) && trim($item['product_name']) !== '') {
                $product = Product::where('name', trim($item['product_name']))->first();
                if (!$product) {
                    // Vérifier l'unicité de product_ref si fourni
                    if (!empty($item['product_ref'])) {
                        $existingProduct = Product::where('ref', trim($item['product_ref']))->first();
                        if ($existingProduct) {
                            throw new \Exception("La référence produit '{$item['product_ref']}' existe déjà");
                        }
                    }

                    $product = Product::create([
                        'ref' => !empty($item['product_ref']) ? trim($item['product_ref']) : null,
                        'name' => trim($item['product_name']),
                        'category' => $item['product_category'] ?? 'Non catégorisé',
                        'category_id' => $item['product_category_id'] ?? null,
                        'quantity' => 0,
                        'price' => $item['unit_price'] ?? 0,
                        'critical_level' => 10,
                    ]);
                }
                $productId = $product->id;
            }

            if ($productId) {
                ReceiptItem::create([
                    'receipt_id' => $receipt->id,
                    'product_id' => $productId,
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['unit_price'] ?? 0,
                ]);
                // Mettre à jour le stock
                Product::where('id', $productId)->increment('quantity', $item['quantity']);
            }
        }
    }

    /**
     * Exécute une sortie de stock
     */
    private function executeStockOut($data)
    {
        $defaultStatus = ($data['exit_type'] ?? null) === 'Provisoire' ? null : 'Complétée';
        
        $movement = StockMovement::create([
            'type' => 'stockout',
            'product_id' => $data['product_id'],
            'quantity' => $data['quantity'],
            'movement_date' => $data['movement_date'],
            'beneficiary' => $data['beneficiary'] ?? null,
            'agent' => $data['agent'] ?? null,
            'notes' => $data['notes'] ?? null,
            'exit_type' => $data['exit_type'] ?? null,
            'status' => $data['status'] ?? $defaultStatus,
        ]);

        Product::where('id', $data['product_id'])->decrement('quantity', $data['quantity']);
    }


    /**
     * Exécute la création d'un véhicule
     */
    private function executeVehicle($data)
    {
        Vehicle::create($data + ['status' => 'pending']);
    }
}

