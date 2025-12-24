<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('ref')->nullable()->unique();
            $table->string('category')->default('Non catégorisé');
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->integer('quantity')->default(0);
            $table->integer('stock_quantity')->default(0);
            $table->decimal('price', 12, 2)->default(0);
            $table->decimal('unit_price', 12, 2)->nullable();
            $table->string('unit')->nullable();
            $table->integer('critical_level')->default(10);
            $table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();
            $table->string('acquirer')->nullable();
            $table->string('beneficiary')->nullable();
            $table->date('acquired_at')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
