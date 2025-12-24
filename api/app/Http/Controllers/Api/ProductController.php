<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    public function index()
    {
        try {
            \Log::info('ProductController::index called');
            // Optimisation: paginer les résultats (15 par page)
            $per_page = request()->query('per_page', 15);
            $page = request()->query('page', 1);

            $products = Product::orderByDesc('id')
                ->paginate($per_page)
                ->items();

            \Log::info('Retrieved ' . count($products) . ' products');
            return response()->json(['items' => $products], 200);
        } catch (\Throwable $e) {
            \Log::error('ProductController::index error: ' . $e->getMessage());
            \Log::error('Stack: ' . $e->getTraceAsString());
            return response()->json([
                'error' => 'Server error',
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ], 500);
        }
    }

    public function store(Request $r)
    {
        $d = $r->validate([
            'ref' => 'nullable|string|unique:products,ref',
            'name' => 'required|string',
            'category' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'quantity' => 'integer',
            'price' => 'numeric',
            'critical_level' => 'integer',
            'supplier' => 'nullable|string',
            'supplier_id' => 'nullable|integer|exists:suppliers,id',
            'acquirer' => 'nullable|string',
            'beneficiary' => 'nullable|string',
            'acquired_at' => 'nullable|date',
        ]);

        if (isset($d['category_id'])) {
            $cat = Category::find($d['category_id']);
            if ($cat) {
                $d['category'] = $cat->name;
            }
        }

        $p = Product::create($d + ['category' => $d['category'] ?? 'Non catégorisé']);
        return response()->json(['id' => $p->id], 201);
    }

    public function update(Request $r, Product $product)
    {
        $d = $r->validate([
            'ref' => 'sometimes|nullable|string|unique:products,ref,' . $product->id,
            'name' => 'sometimes|string',
            'category' => 'sometimes|string',
            'category_id' => 'sometimes|nullable|integer|exists:categories,id',
            'quantity' => 'sometimes|integer',
            'price' => 'sometimes|numeric',
            'critical_level' => 'sometimes|integer',
            'supplier' => 'sometimes|nullable|string',
            'supplier_id' => 'sometimes|nullable|integer|exists:suppliers,id',
            'acquirer' => 'sometimes|nullable|string',
            'beneficiary' => 'sometimes|nullable|string',
            'acquired_at' => 'sometimes|nullable|date',
        ]);

        if (array_key_exists('category_id', $d)) {
            $cat = $d['category_id'] ? Category::find($d['category_id']) : null;
            $d['category'] = $cat ? $cat->name : ($d['category'] ?? $product->category);
        }

        $product->update($d);
        return ['updated' => true];
    }

    public function destroy(Product $product)
    {
        $product->delete();
        return ['deleted' => true];
    }
}
