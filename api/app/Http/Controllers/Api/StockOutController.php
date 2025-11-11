<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{StockMovement,Product};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockOutController extends Controller
{
    public function index()
    {
        return StockMovement::where('type', 'stockout')
            ->with('product')
            ->latest()
            ->get()
            ->map(function($m) {
                return [
                    'id' => $m->id,
                    'product_id' => $m->product_id,
                    'product' => $m->product ? ['name' => $m->product->name] : null,
                    'quantity' => $m->quantity,
                    'price' => 0, // Les sorties n'ont pas de prix
                    'beneficiary' => $m->beneficiary,
                    'agent' => $m->agent,
                    'notes' => $m->notes,
                    'movement_date' => $m->movement_date,
                    'exit_type' => $m->exit_type,
                    'status' => $m->status,
                ];
            });
    }

    public function store(Request $r)
    {
        try {
            $v = $r->validate([
                'product_id' => 'required|exists:products,id',
                'quantity' => 'required|integer|min:1',
                'beneficiary' => 'nullable|string',
                'agent' => 'nullable|string',
                'notes' => 'nullable|string',
                'movement_date' => 'required|date',
                'exit_type' => 'nullable|string|in:Définitive,Affectation,Provisoire',
                'status' => 'nullable|string',
            ]);

            return DB::transaction(function() use($v) {
                // Pour les sorties provisoires, le status doit être null
                // Pour les autres, le status par défaut est 'Complétée'
                $defaultStatus = ($v['exit_type'] ?? null) === 'Provisoire' ? null : 'Complétée';
                
                // Les sorties n'ont pas de prix, donc on ne l'inclut pas
                $data = [
                    'type' => 'stockout',
                    'product_id' => $v['product_id'],
                    'quantity' => $v['quantity'],
                    'movement_date' => $v['movement_date'],
                    'beneficiary' => $v['beneficiary'] ?? null,
                    'agent' => $v['agent'] ?? null,
                    'notes' => $v['notes'] ?? null,
                    'exit_type' => $v['exit_type'] ?? null,
                    'status' => $v['status'] ?? $defaultStatus,
                ];

                $m = StockMovement::create($data);

                Product::where('id', $v['product_id'])->decrement('quantity', $v['quantity']);
                return response()->json(['id' => $m->id], 201);
            });
        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            \Log::error('Erreur StockOutController store: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Erreur lors de la création de la sortie: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Transformer une sortie provisoire en sortie définitive
     */
    public function validate(Request $r, $id)
    {
        try {
            return DB::transaction(function() use($id) {
                $movement = StockMovement::where('type', 'stockout')->findOrFail($id);

                // Vérifier que c'est bien une sortie provisoire
                if ($movement->exit_type !== 'Provisoire') {
                    return response()->json([
                        'error' => 'Cette sortie n\'est pas provisoire'
                    ], 400);
                }

                // Vérifier qu'elle n'est pas déjà retournée
                if ($movement->status === 'Retournée') {
                    return response()->json([
                        'error' => 'Cette sortie a déjà été retournée'
                    ], 400);
                }

                // Transformer en définitive
                $movement->update([
                    'exit_type' => 'Définitive',
                    'status' => 'Complétée'
                ]);

                return response()->json(['success' => true, 'message' => 'Sortie validée avec succès']);
            });
        } catch (\Exception $e) {
            \Log::error('Erreur StockOutController validate: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors de la validation: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Retourner une sortie provisoire (réintégrer le stock)
     */
    public function return(Request $r, $id)
    {
        try {
            return DB::transaction(function() use($id) {
                $movement = StockMovement::where('type', 'stockout')->findOrFail($id);

                // Vérifier que c'est bien une sortie provisoire
                if ($movement->exit_type !== 'Provisoire') {
                    return response()->json([
                        'error' => 'Seules les sorties provisoires peuvent être retournées'
                    ], 400);
                }

                // Vérifier qu'elle n'est pas déjà retournée
                if ($movement->status === 'Retournée') {
                    return response()->json([
                        'error' => 'Cette sortie a déjà été retournée'
                    ], 400);
                }

                // Réintégrer le stock
                Product::where('id', $movement->product_id)->increment('quantity', $movement->quantity);

                // Marquer comme retournée
                $movement->update([
                    'status' => 'Retournée'
                ]);

                return response()->json(['success' => true, 'message' => 'Sortie retournée avec succès, stock réintégré']);
            });
        } catch (\Exception $e) {
            \Log::error('Erreur StockOutController return: ' . $e->getMessage());
            return response()->json([
                'message' => 'Erreur lors du retour: ' . $e->getMessage()
            ], 500);
        }
    }
}
