<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Receipt,ReceiptItem,Product};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ReceiptController extends Controller
{
    public function index()
    {
        return Receipt::with(['items'])->withCount('items')->latest()->get()->map(function($r) {
            return [
                'id' => $r->id,
                'ref' => $r->ref,
                'supplier' => $r->supplier ?? ($r->supplier_id ? 'ID: ' . $r->supplier_id : null),
                'agent' => $r->agent,
                'received_at' => $r->received_at,
                'notes' => $r->notes,
                'items_count' => $r->items_count ?? 0,
                'items' => $r->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => (float)$item->unit_price,
                    ];
                })
            ];
        });
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'ref' => 'nullable|string|unique:receipts',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'supplier' => 'nullable|string',
            'agent' => 'required|string',
            'received_at' => 'required|date',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|integer|exists:products,id',
            'items.*.product_name' => 'nullable|string',
            'items.*.product_ref' => 'nullable|string|unique:products,ref',
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
                            'ref' => !empty($it['product_ref']) ? trim($it['product_ref']) : null,
                            'name' => trim($it['product_name']),
                            'category' => 'Non catégorisé',
                            'quantity' => 0,
                            'price' => $it['unit_price'] ?? 0,
                            'critical_level' => 10,
                        ]);
                    }
                    $productId = $product->id;
                }

                // Si un produit existe et qu'une réf est fournie, la définir si absente
                if ($productId && !empty($it['product_ref'])) {
                    $p = Product::find($productId);
                    if ($p && empty($p->ref)) {
                        $p->update(['ref' => trim($it['product_ref'])]);
                    }
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
