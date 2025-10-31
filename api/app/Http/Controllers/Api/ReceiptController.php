<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Receipt,ReceiptItem,Product};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReceiptController extends Controller
{
    public function index()
    {
        return Receipt::withCount('items')->latest()->get()->map(function($r) {
            return [
                'id' => $r->id,
                'supplier' => $r->supplier ?? ($r->supplier_id ? 'ID: ' . $r->supplier_id : null),
                'agent' => $r->agent,
                'received_at' => $r->received_at,
                'notes' => $r->notes,
                'items_count' => $r->items_count ?? 0
            ];
        });
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'supplier' => 'nullable|string',
            'agent' => 'required|string',
            'received_at' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.product_name' => 'nullable|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.unit_price' => 'nullable|numeric',
        ]);

        return DB::transaction(function() use($v) {
            $rec = Receipt::create(collect($v)->except('items')->toArray());
            foreach($v['items'] as $it) {
                $productId = $it['product_id'] ?? null;

                // Si product_name est fourni mais pas product_id, chercher ou créer le produit
                if (!$productId && isset($it['product_name']) && trim($it['product_name']) !== '') {
                    $product = Product::where('name', trim($it['product_name']))->first();
                    if (!$product) {
                        // Créer un nouveau produit si il n'existe pas
                        $product = Product::create([
                            'name' => trim($it['product_name']),
                            'category' => 'Non catégorisé',
                            'quantity' => 0,
                            'price' => $it['unit_price'] ?? 0,
                            'critical_level' => 10,
                        ]);
                    }
                    $productId = $product->id;
                }

                if ($productId) {
                    ReceiptItem::create([
                        'receipt_id' => $rec->id,
                        'product_id' => $productId,
                        'quantity' => $it['quantity'],
                        'unit_price' => $it['unit_price'] ?? 0,
                    ]);
                    Product::where('id', $productId)->increment('quantity', $it['quantity']);
                }
            }
            return response()->json(['id' => $rec->id], 201);
        });
    }
}
