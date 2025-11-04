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
                // S'assurer que status a une valeur par défaut si null
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
                    'status' => $v['status'] ?? 'Complétée',
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
}
