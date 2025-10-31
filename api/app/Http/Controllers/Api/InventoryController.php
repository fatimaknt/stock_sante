<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Inventory,InventoryItem,Product,StockMovement};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class InventoryController extends Controller
{
    public function index()
    {
        return Inventory::with(['items.product'])->latest()->get();
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'agent' => 'required|string',
            'counted_at' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'required|exists:products,id',
            'items.*.counted_qty' => 'required|integer|min:0',
        ]);

        return DB::transaction(function() use($v) {
            $inv = Inventory::create(collect($v)->except('items')->toArray());
            foreach($v['items'] as $it) {
                $p = Product::findOrFail($it['product_id']);
                $var = $it['counted_qty'] - $p->quantity;
                InventoryItem::create([
                    'inventory_id' => $inv->id,
                    'product_id' => $p->id,
                    'theoretical_qty' => $p->quantity,
                    'counted_qty' => $it['counted_qty'],
                    'variance' => $var,
                ]);
                if ($var !== 0) {
                    StockMovement::create([
                        'product_id' => $p->id,
                        'type' => 'adjustment',
                        'quantity' => abs($var),
                        'movement_date' => $v['counted_at'],
                        'status' => 'Complétée',
                    ]);
                    $p->update(['quantity' => $it['counted_qty']]);
                }
            }
            return response()->json(['id' => $inv->id], 201);
        });
    }
}
