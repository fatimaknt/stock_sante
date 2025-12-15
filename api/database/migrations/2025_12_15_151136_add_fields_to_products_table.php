<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Add unit column if it doesn't exist
            if (!Schema::hasColumn('products', 'unit')) {
                $table->string('unit')->default('Unité')->after('name');
            }
            // Add stock_quantity column if it doesn't exist
            if (!Schema::hasColumn('products', 'stock_quantity')) {
                $table->integer('stock_quantity')->default(0)->after('quantity');
            }
            // Add unit_price column if it doesn't exist
            if (!Schema::hasColumn('products', 'unit_price')) {
                $table->decimal('unit_price', 12, 2)->default(0)->after('price');
            }
            // Add description column if it doesn't exist
            if (!Schema::hasColumn('products', 'description')) {
                $table->text('description')->nullable()->after('critical_level');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumnIfExists(['unit', 'stock_quantity', 'unit_price', 'description']);
        });
    }
};
