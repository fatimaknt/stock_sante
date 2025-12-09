<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Need, Product};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class NeedController extends Controller
{
    /**
     * Liste tous les besoins
     * - Admins : voient tous les besoins
     * - Autres utilisateurs : voient seulement leurs besoins
     */
    public function index()
    {
        $user = Auth::user();

        $query = Need::with(['product', 'user', 'approver']);

        // Si l'utilisateur n'est pas admin, filtrer par user_id
        if ($user->role !== 'Administrateur') {
            $query->where('user_id', $user->id);
        }

        return $query->latest()->get()->map(function ($need) {
            return [
                'id' => $need->id,
                'product_id' => $need->product_id,
                'product' => $need->product ? [
                    'id' => $need->product->id,
                    'name' => $need->product->name,
                ] : null,
                'quantity' => $need->quantity,
                'reason' => $need->reason,
                'user' => $need->user ? [
                    'id' => $need->user->id,
                    'name' => $need->user->name,
                    'email' => $need->user->email,
                ] : null,
                'status' => $need->status,
                'approved_by' => $need->approved_by,
                'approver' => $need->approver ? [
                    'id' => $need->approver->id,
                    'name' => $need->approver->name,
                ] : null,
                'rejection_reason' => $need->rejection_reason,
                'approved_at' => $need->approved_at ? $need->approved_at->toDateTimeString() : null,
                'created_at' => $need->created_at->toDateTimeString(),
                'updated_at' => $need->updated_at->toDateTimeString(),
            ];
        });
    }

    /**
     * Crée un nouveau besoin
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'product_id' => 'required|exists:products,id',
                'quantity' => 'required|integer|min:1',
                'reason' => 'required|string|max:1000',
            ]);

            $user = Auth::user();

            $need = Need::create([
                'product_id' => $validated['product_id'],
                'quantity' => $validated['quantity'],
                'reason' => $validated['reason'],
                'user_id' => $user->id,
                'status' => 'pending',
            ]);

            return response()->json([
                'message' => 'Votre demande de besoin a été créée avec succès',
                'need' => [
                    'id' => $need->id,
                    'product_id' => $need->product_id,
                    'quantity' => $need->quantity,
                    'reason' => $need->reason,
                    'status' => $need->status,
                ],
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Erreur NeedController store: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la création du besoin: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approuve un besoin (admin seulement)
     */
    public function approve($id)
    {
        $user = Auth::user();

        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        try {
            return DB::transaction(function () use ($id, $user) {
                $need = Need::findOrFail($id);

                if ($need->status !== 'pending') {
                    return response()->json([
                        'message' => 'Ce besoin a déjà été traité'
                    ], 400);
                }

                // Marquer comme approuvé
                $need->update([
                    'status' => 'approved',
                    'approved_by' => $user->id,
                    'approved_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Besoin approuvé avec succès',
                    'need_id' => $need->id,
                ]);
            });
        } catch (\Exception $e) {
            \Log::error('Erreur NeedController approve: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de l\'approbation: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rejette un besoin (admin seulement)
     */
    public function reject(Request $request, $id)
    {
        $user = Auth::user();

        if ($user->role !== 'Administrateur') {
            return response()->json(['message' => 'Accès non autorisé'], 403);
        }

        try {
            $validated = $request->validate([
                'rejection_reason' => 'nullable|string|max:500',
            ]);

            return DB::transaction(function () use ($id, $user, $validated) {
                $need = Need::findOrFail($id);

                if ($need->status !== 'pending') {
                    return response()->json([
                        'message' => 'Ce besoin a déjà été traité'
                    ], 400);
                }

                // Marquer comme rejeté
                $need->update([
                    'status' => 'rejected',
                    'approved_by' => $user->id,
                    'rejection_reason' => $validated['rejection_reason'] ?? null,
                    'approved_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Besoin rejeté',
                    'need_id' => $need->id,
                ]);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Erreur NeedController reject: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors du rejet: ' . $e->getMessage()
            ], 500);
        }
    }
}

