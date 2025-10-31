#!/usr/bin/env bash
set -euo pipefail
ROOT="/Users/pro/projet_personnel/stock_sante"
API_DIR="$ROOT/api"

# 1) Create Laravel project if missing
if [ ! -d "$API_DIR" ]; then
  composer create-project laravel/laravel "$API_DIR"
fi

# 2) Dependencies (Sanctum only; Laravel 12 already has CORS middleware)
composer --working-dir="$API_DIR" require laravel/sanctum

# 3) .env setup (MAMP creds)
cp -n "$API_DIR/.env.example" "$API_DIR/.env" || true
php -r '
$p="/Users/pro/projet_personnel/stock_sante/api/.env";
$e=file_get_contents($p);
$e=preg_replace("/^DB_CONNECTION=.*/m","DB_CONNECTION=mysql",$e);
$e=preg_replace("/^DB_HOST=.*/m","DB_HOST=127.0.0.1",$e);
$e=preg_replace("/^DB_PORT=.*/m","DB_PORT=8889",$e);
$e=preg_replace("/^DB_DATABASE=.*/m","DB_DATABASE=stock_sante",$e);
$e=preg_replace("/^DB_USERNAME=.*/m","DB_USERNAME=root",$e);
$e=preg_replace("/^DB_PASSWORD=.*/m","DB_PASSWORD=root",$e);
file_put_contents($p,$e);
'
php "$API_DIR/artisan" key:generate

# 4) Publish Sanctum
php "$API_DIR/artisan" vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --force || true

# 5) Make models & controllers
php "$API_DIR/artisan" make:model Supplier -m || true
php "$API_DIR/artisan" make:model Product -m || true
php "$API_DIR/artisan" make:model Receipt -m || true
php "$API_DIR/artisan" make:model ReceiptItem -m || true
php "$API_DIR/artisan" make:model StockMovement -m || true
php "$API_DIR/artisan" make:model Inventory -m || true
php "$API_DIR/artisan" make:model InventoryItem -m || true

php "$API_DIR/artisan" make:controller Api/ProductController --api || true
php "$API_DIR/artisan" make:controller Api/ReceiptController --api || true
php "$API_DIR/artisan" make:controller Api/StockOutController --api || true
php "$API_DIR/artisan" make:controller Api/InventoryController --api || true
php "$API_DIR/artisan" make:controller Api/StatsController || true

# Helper to get latest migration by pattern
latest() { ls -t "$API_DIR"/database/migrations/*"$1"* 2>/dev/null | head -n1; }

# 6) Write migrations content
cat > "$(latest create_suppliers_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('suppliers',function(Blueprint $table){$table->id();$table->string('name');$table->timestamps();});}public function down():void{Schema::dropIfExists('suppliers');}};
PHP

cat > "$(latest create_products_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('products',function(Blueprint $table){$table->id();$table->string('name');$table->string('category')->default('Non catégorisé');$table->integer('quantity')->default(0);$table->decimal('price',12,2)->default(0);$table->integer('critical_level')->default(10);$table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();$table->string('acquirer')->nullable();$table->string('beneficiary')->nullable();$table->date('acquired_at')->nullable();$table->timestamps();});}public function down():void{Schema::dropIfExists('products');}};
PHP

cat > "$(latest create_receipts_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('receipts',function(Blueprint $table){$table->id();$table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();$table->string('agent');$table->date('received_at');$table->text('notes')->nullable();$table->timestamps();});}public function down():void{Schema::dropIfExists('receipts');}};
PHP

cat > "$(latest create_receipt_items_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('receipt_items',function(Blueprint $table){$table->id();$table->foreignId('receipt_id')->constrained('receipts')->cascadeOnDelete();$table->foreignId('product_id')->constrained('products')->cascadeOnDelete();$table->integer('quantity');$table->decimal('unit_price',12,2)->default(0);$table->timestamps();});}public function down():void{Schema::dropIfExists('receipt_items');}};
PHP

cat > "$(latest create_stock_movements_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('stock_movements',function(Blueprint $table){$table->id();$table->foreignId('product_id')->constrained('products')->cascadeOnDelete();$table->enum('type',['receipt','stockout','adjustment']);$table->integer('quantity');$table->string('beneficiary')->nullable();$table->string('agent')->nullable();$table->text('notes')->nullable();$table->date('movement_date');$table->string('status')->default('Complétée');$table->timestamps();});}public function down():void{Schema::dropIfExists('stock_movements');}};
PHP

cat > "$(latest create_inventories_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('inventories',function(Blueprint $table){$table->id();$table->string('agent');$table->date('counted_at');$table->text('notes')->nullable();$table->timestamps();});}public function down():void{Schema::dropIfExists('inventories');}};
PHP

cat > "$(latest create_inventory_items_table)" <<'PHP'
<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('inventory_items',function(Blueprint $table){$table->id();$table->foreignId('inventory_id')->constrained('inventories')->cascadeOnDelete();$table->foreignId('product_id')->constrained('products')->cascadeOnDelete();$table->integer('theoretical_qty');$table->integer('counted_qty');$table->integer('variance');$table->timestamps();});}public function down():void{Schema::dropIfExists('inventory_items');}};
PHP

# 7) Routes API
cat > "$API_DIR/routes/api.php" <<'PHP'
<?php
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{ProductController,ReceiptController,StockOutController,InventoryController,StatsController};
Route::apiResource('products', ProductController::class);
Route::get('receipts', [ReceiptController::class,'index']);
Route::post('receipts', [ReceiptController::class,'store']);
Route::get('stockouts', [StockOutController::class,'index']);
Route::post('stockouts', [StockOutController::class,'store']);
Route::get('inventories', [InventoryController::class,'index']);
Route::post('inventories', [InventoryController::class,'store']);
Route::get('stats', [StatsController::class,'index']);
PHP

# 8) Controllers content
cat > "$API_DIR/app/Http/Controllers/Api/ProductController.php" <<'PHP'
<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\Product;use Illuminate\Http\Request;
class ProductController extends Controller{public function index(){return ['items'=>Product::orderByDesc('id')->get()];}public function store(Request $r){$d=$r->validate(['name'=>'required|string','category'=>'nullable|string','quantity'=>'integer','price'=>'numeric','critical_level'=>'integer']);$p=Product::create($d+['category'=>$d['category']??'Non catégorisé']);return response()->json(['id'=>$p->id],201);}public function update(Request $r, Product $product){$d=$r->validate(['name'=>'sometimes|string','category'=>'sometimes|string','quantity'=>'sometimes|integer','price'=>'sometimes|numeric','critical_level'=>'sometimes|integer']);$product->update($d);return ['updated'=>true];}public function destroy(Product $product){$product->delete();return ['deleted'=>true];}}
PHP

cat > "$API_DIR/app/Http/Controllers/Api/ReceiptController.php" <<'PHP'
<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\{Receipt,ReceiptItem,Product};use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;
class ReceiptController extends Controller{public function index(){return Receipt::withCount('items')->latest()->get();}public function store(Request $r){$v=$r->validate(['supplier_id'=>'nullable|integer|exists:suppliers,id','agent'=>'required|string','received_at'=>'required|date','notes'=>'nullable|string','items'=>'required|array|min:1','items.*.product_id'=>'required|integer|exists:products,id','items.*.quantity'=>'required|integer|min:1','items.*.unit_price'=>'nullable|numeric',]);return DB::transaction(function() use($v){$rec=Receipt::create(collect($v)->except('items')->toArray());foreach($v['items'] as $it){ReceiptItem::create($it+['receipt_id'=>$rec->id]);Product::where('id',$it['product_id'])->increment('quantity',$it['quantity']);}return response()->json(['id'=>$rec->id],201);});}}
PHP

cat > "$API_DIR/app/Http/Controllers/Api/StockOutController.php" <<'PHP'
<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\{StockMovement,Product};use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;
class StockOutController extends Controller{public function index(){return StockMovement::where('type','stockout')->latest()->get();}public function store(Request $r){$v=$r->validate(['product_id'=>'required|exists:products,id','quantity'=>'required|integer|min:1','beneficiary'=>'nullable|string','agent'=>'nullable|string','notes'=>'nullable|string','movement_date'=>'required|date','status'=>'nullable|string',]);return DB::transaction(function() use($v){$m=StockMovement::create(['type'=>'stockout']+$v);Product::where('id',$v['product_id'])->decrement('quantity',$v['quantity']);return response()->json(['id'=>$m->id],201);});}}
PHP

cat > "$API_DIR/app/Http/Controllers/Api/InventoryController.php" <<'PHP'
<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\{Inventory,InventoryItem,Product,StockMovement};use Illuminate\Http\Request;use Illuminate\Support\Facades\DB;
class InventoryController extends Controller{public function index(){return Inventory::with('items')->latest()->get();}public function store(Request $r){$v=$r->validate(['agent'=>'required|string','counted_at'=>'required|date','notes'=>'nullable|string','items'=>'required|array|min:1','items.*.product_id'=>'required|exists:products,id','items.*.counted_qty'=>'required|integer|min:0',]);return DB::transaction(function() use($v){$inv=Inventory::create(collect($v)->except('items')->toArray());foreach($v['items'] as $it){$p=Product::findOrFail($it['product_id']);$var=$it['counted_qty']-$p->quantity;InventoryItem::create(['inventory_id'=>$inv->id,'product_id'=>$p->id,'theoretical_qty'=>$p->quantity,'counted_qty'=>$it['counted_qty'],'variance'=>$var,]);if($var!==0){StockMovement::create(['product_id'=>$p->id,'type'=>'adjustment','quantity'=>abs($var),'movement_date'=>$v['counted_at'],'status'=>'Complétée',]);$p->update(['quantity'=>$it['counted_qty']]);}}return response()->json(['id'=>$inv->id],201);});}}
PHP

cat > "$API_DIR/app/Http/Controllers/Api/StatsController.php" <<'PHP'
<?php
namespace App\Http\Controllers\Api;use App\Http\Controllers\Controller;use App\Models\Product;
class StatsController extends Controller{public function index(){ $total=Product::count(); $low=Product::whereColumn('quantity','<=','critical_level')->where('quantity','>',0)->count(); $oos=Product::where('quantity','<=',0)->count(); $val=Product::selectRaw('SUM(quantity*price) v')->value('v')??0; return ['totalProducts'=>$total,'stockValue'=>(float)$val,'lowStock'=>$low,'outOfStock'=>$oos]; }}
PHP

# 9) Fillable & relations models (overwrites minimal content)
cat > "$API_DIR/app/Models/Product.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Product extends Model{use HasFactory;protected $fillable=['name','category','quantity','price','critical_level','supplier_id','acquirer','beneficiary','acquired_at'];}
PHP

cat > "$API_DIR/app/Models/Receipt.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Receipt extends Model{use HasFactory;protected $fillable=['supplier_id','agent','received_at','notes'];public function items(){return $this->hasMany(ReceiptItem::class);} }
PHP

cat > "$API_DIR/app/Models/ReceiptItem.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class ReceiptItem extends Model{use HasFactory;protected $fillable=['receipt_id','product_id','quantity','unit_price'];}
PHP

cat > "$API_DIR/app/Models/Inventory.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Inventory extends Model{use HasFactory;protected $fillable=['agent','counted_at','notes'];public function items(){return $this->hasMany(InventoryItem::class);} }
PHP

cat > "$API_DIR/app/Models/InventoryItem.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class InventoryItem extends Model{use HasFactory;protected $fillable=['inventory_id','product_id','theoretical_qty','counted_qty','variance'];}
PHP

cat > "$API_DIR/app/Models/StockMovement.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class StockMovement extends Model{use HasFactory;protected $fillable=['product_id','type','quantity','beneficiary','agent','notes','movement_date','status'];}
PHP

cat > "$API_DIR/app/Models/Supplier.php" <<'PHP'
<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Supplier extends Model{use HasFactory;protected $fillable=['name'];}
PHP

# 10) Migrate
php "$API_DIR/artisan" migrate

echo "\nAPI Laravel prête. Démarrer: php $API_DIR/artisan serve --host=127.0.0.1 --port=8000\nBase API: http://127.0.0.1:8000/api\n"
