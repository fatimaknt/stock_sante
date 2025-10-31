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
            $m = StockMovement::create(['type' => 'stockout'] + $v);
            Product::where('id', $v['product_id'])->decrement('quantity', $v['quantity']);
            return response()->json(['id' => $m->id], 201);
        });
    }
}
