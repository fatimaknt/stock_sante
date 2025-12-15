<?php
namespace App\Http\Controllers\Api;
use App\Http\Controllers\Controller;
use App\Models\{Receipt,ReceiptItem,Product,Category,PendingOperation};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class ReceiptController extends Controller
{
    public function index()
    {
        // Récupérer les réceptions approuvées de la table receipts
        $approvedReceipts = Receipt::with(['items', 'approver'])->withCount('items')->latest()->get()->map(function($r) {
            return [
                'id' => $r->id,
                'ref' => $r->ref,
                'supplier' => $r->supplier ?? ($r->supplier_id ? 'ID: ' . $r->supplier_id : null),
                'agent' => $r->agent,
                'acquirer' => $r->acquirer,
                'persons_present' => $r->persons_present,
                'received_at' => $r->received_at,
                'notes' => $r->notes,
                'status' => 'approved',
                'approved_by' => $r->approver ? $r->approver->name : null,
                'approved_at' => $r->approved_at,
                'items_count' => $r->items_count ?? 0,
                'items' => $r->items->map(function($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'quantity' => $item->quantity,
                        'unit_price' => (float)$item->unit_price,
                    ];
                }),
                'pending_operation_id' => null,
            ];
        });

        // Récupérer les réceptions en attente/rejetées de pending_operations
        $pendingReceipts = PendingOperation::with(['user', 'approver'])
            ->where('type', 'receipt')
            ->whereIn('status', ['pending', 'rejected'])
            ->latest()
            ->get()
            ->map(function($op) {
                $data = $op->data;
                $items = $data['items'] ?? [];
                return [
                    'id' => 'pending_' . $op->id, // Préfixe pour éviter les conflits
                    'ref' => $data['ref'] ?? null,
                    'supplier' => $data['supplier'] ?? ($data['supplier_id'] ? 'ID: ' . $data['supplier_id'] : null),
                    'agent' => $data['agent'] ?? '',
                    'acquirer' => $data['acquirer'] ?? null,
                    'persons_present' => $data['persons_present'] ?? null,
                    'received_at' => $data['received_at'] ?? null,
                    'notes' => $data['notes'] ?? null,
                    'status' => $op->status,
                    'approved_by' => $op->approver ? $op->approver->name : null,
                    'approved_at' => $op->approved_at,
                    'items_count' => count($items),
                    'items' => $items,
                    'pending_operation_id' => $op->id,
                    'created_at' => $op->created_at ? $op->created_at->toDateTimeString() : null,
                ];
            });

        // Combiner et trier par date (plus récent en premier)
        return $approvedReceipts->concat($pendingReceipts)->sortByDesc(function($r) {
            // Utiliser received_at pour les réceptions approuvées, created_at pour les pending
            if (isset($r['created_at'])) {
                return $r['created_at'];
            }
            return $r['received_at'] ?? '1970-01-01';
        })->values();
    }

    public function store(Request $r)
    {
        try {
            $user = Auth::user();

            // Log pour déboguer
            \Log::info('ReceiptController::store - User ID: ' . $user->id . ', Role: ' . ($user->role ?? 'null'));

            // Règles de validation de base
            $rules = [
                'supplier_id' => 'nullable|integer|exists:suppliers,id',
                'supplier' => 'nullable|string',
                'agent' => 'required|string',
                'acquirer' => 'nullable|string',
                'persons_present' => 'nullable|string',
                'received_at' => 'required|date',
                'notes' => 'nullable|string',
                'items' => 'required|array|min:1',
                'items.*.product_id' => 'nullable|integer|exists:products,id',
                'items.*.product_name' => 'nullable|string',
                'items.*.product_category_id' => 'nullable|integer',  // Don't validate exists, just integer
                'items.*.product_category' => 'nullable|string',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.unit_price' => 'nullable|numeric',
            ];

            // Check if user is admin (more flexible check)
            $isAdmin = strtolower($user->role ?? '') === 'administrateur' ||
                       in_array('Gestion complète', (array)($user->permissions ?? []));

            // Si admin, validation stricte avec unicité
            if ($isAdmin) {
                $rules['ref'] = 'nullable|string|unique:receipts';
                $rules['items.*.product_ref'] = 'nullable|string|unique:products,ref';
            } else {
                // Pour les non-admins, validation plus souple (l'unicité sera vérifiée à l'approbation)
                $rules['ref'] = 'nullable|string';
                $rules['items.*.product_ref'] = 'nullable|string';
            }

            $v = $r->validate($rules);

            // Si l'utilisateur est admin, exécuter directement
            if ($isAdmin) {
                \Log::info('ReceiptController::store - Admin user, creating receipt directly');
                return DB::transaction(function() use($v, $user) {
                    $rec = Receipt::create(array_merge(
                        collect($v)->except('items')->toArray(),
                        ['status' => 'approved', 'approved_by' => $user->id, 'approved_at' => now()]
                    ));
                    \Log::info('ReceiptController::store - Receipt created with ID: ' . $rec->id);
                    foreach($v['items'] as $it) {
                        $productId = $it['product_id'] ?? null;

                        // Si product_name est fourni mais pas product_id, chercher ou créer le produit
                        if (!$productId && isset($it['product_name']) && trim($it['product_name']) !== '') {
                            $product = Product::where('name', trim($it['product_name']))->first();
                            if (!$product) {
                                // Déterminer la catégorie
                                $categoryName = 'Non catégorisé';
                                $categoryId = null;

                                if (!empty($it['product_category_id'])) {
                                    // Si category_id est fourni, chercher la catégorie
                                    $category = Category::find($it['product_category_id']);
                                    if ($category) {
                                        $categoryName = $category->name;
                                        $categoryId = $category->id;
                                    }
                                } elseif (!empty($it['product_category'])) {
                                    // Si category name est fourni directement
                                    $categoryName = trim($it['product_category']);
                                }

                                // Créer un nouveau produit si il n'existe pas
                                $product = Product::create([
                                    'ref' => !empty($it['product_ref']) ? trim($it['product_ref']) : null,
                                    'name' => trim($it['product_name']),
                                    'category' => $categoryName,
                                    'category_id' => $categoryId,
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

            // Sinon, créer une PendingOperation (pas dans receipts, pas de stock mis à jour)
            \Log::info('ReceiptController::store - Non-admin user, creating pending operation');

            $pendingOp = PendingOperation::create([
                'type' => 'receipt',
                'data' => $v, // Stocker toutes les données de la réception
                'user_id' => $user->id,
                'status' => 'pending',
            ]);

            \Log::info('ReceiptController::store - PendingOperation created with ID: ' . $pendingOp->id);

            return response()->json([
                'message' => 'Votre réception a été créée et est en attente d\'approbation',
                'id' => $pendingOp->id,
                'status' => 'pending',
                'pending_operation_id' => $pendingOp->id,
            ], 201);
        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('ReceiptController::store Validation error: ' . json_encode($e->errors()));
            return response()->json(['error' => 'Validation error', 'details' => $e->errors()], 422);
        } catch (\Exception $e) {
            \Log::error('ReceiptController::store error: ' . $e->getMessage(), ['file' => $e->getFile(), 'line' => $e->getLine(), 'trace' => $e->getTraceAsString()]);
            return response()->json(['error' => 'Erreur serveur', 'message' => $e->getMessage()], 500);
        }
    }


    public function update(Request $r, $id)
    {
        $v = $r->validate([
            'supplier' => 'nullable|string',
            'agent' => 'sometimes|required|string',
            'acquirer' => 'nullable|string',
            'persons_present' => 'nullable|string',
            'received_at' => 'sometimes|required|date',
            'notes' => 'nullable|string',
        ]);

        // Vérifier si c'est une réception en attente (ID commence par "pending_")
        if (is_string($id) && strpos($id, 'pending_') === 0) {
            $pendingId = (int) str_replace('pending_', '', $id);
            $pendingOp = PendingOperation::findOrFail($pendingId);

            // Vérifier que c'est bien une réception et qu'elle est en attente
            if ($pendingOp->type !== 'receipt' || $pendingOp->status !== 'pending') {
                return response()->json(['message' => 'Cette réception ne peut pas être modifiée'], 400);
            }

            // Vérifier que l'utilisateur est le créateur ou un admin
            $user = Auth::user();
            if ($pendingOp->user_id !== $user->id && $user->role !== 'Administrateur') {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }

            // Mettre à jour les données de la pending operation
            $data = $pendingOp->data;
            $data = array_merge($data, $v);
            $pendingOp->update(['data' => $data]);

            return response()->json(['message' => 'Réception mise à jour avec succès'], 200);
        }

        // Sinon, c'est une réception approuvée normale
        $receiptModel = Receipt::findOrFail($id);
        $receiptModel->update($v);
        return response()->json(['message' => 'Réception mise à jour avec succès', 'receipt' => $receiptModel], 200);
    }

    public function destroy($id)
    {
        // Vérifier si c'est une réception en attente (ID commence par "pending_")
        if (is_string($id) && strpos($id, 'pending_') === 0) {
            $pendingId = (int) str_replace('pending_', '', $id);
            $pendingOp = PendingOperation::findOrFail($pendingId);

            // Vérifier que c'est bien une réception
            if ($pendingOp->type !== 'receipt') {
                return response()->json(['message' => 'Opération invalide'], 400);
            }

            // Vérifier que l'utilisateur est le créateur ou un admin
            $user = Auth::user();
            if ($pendingOp->user_id !== $user->id && $user->role !== 'Administrateur') {
                return response()->json(['message' => 'Accès non autorisé'], 403);
            }

            // Supprimer la pending operation
            $pendingOp->delete();

            return response()->json(['message' => 'Réception supprimée avec succès'], 200);
        }

        // Sinon, c'est une réception approuvée normale
        return DB::transaction(function() use($id) {
            $receiptModel = Receipt::findOrFail($id);

            // Annuler les quantités ajoutées aux produits
            foreach($receiptModel->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->decrement('quantity', $item->quantity);
                }
            }

            // Supprimer les items de la réception
            $receiptModel->items()->delete();

            // Supprimer la réception
            $receiptModel->delete();

            return response()->json(['message' => 'Réception supprimée avec succès'], 200);
        });
    }
}
