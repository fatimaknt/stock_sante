<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to add indexes for performance optimization.
     */
    public function up(): void
    {
        // Add indexes to frequently queried columns
        Schema::table('products', function (Blueprint $table) {
            $table->index('category_id', 'idx_products_category_id');
            $table->index('name', 'idx_products_name');
            $table->index('supplier_id', 'idx_products_supplier_id');
            $table->index('created_at', 'idx_products_created_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('email', 'idx_users_email');
            $table->index('role', 'idx_users_role');
            $table->index('status', 'idx_users_status');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->index('created_at', 'idx_receipts_created_at');
            $table->index('user_id', 'idx_receipts_user_id');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index('product_id', 'idx_stock_movements_product_id');
            $table->index('created_at', 'idx_stock_movements_created_at');
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->index('created_at', 'idx_inventories_created_at');
            $table->index('user_id', 'idx_inventories_user_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index('name', 'idx_categories_name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_category_id');
            $table->dropIndex('idx_products_name');
            $table->dropIndex('idx_products_supplier_id');
            $table->dropIndex('idx_products_created_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex('idx_users_email');
            $table->dropIndex('idx_users_role');
            $table->dropIndex('idx_users_status');
        });

        Schema::table('receipts', function (Blueprint $table) {
            $table->dropIndex('idx_receipts_created_at');
            $table->dropIndex('idx_receipts_user_id');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('idx_stock_movements_product_id');
            $table->dropIndex('idx_stock_movements_created_at');
        });

        Schema::table('inventories', function (Blueprint $table) {
            $table->dropIndex('idx_inventories_created_at');
            $table->dropIndex('idx_inventories_user_id');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex('idx_categories_name');
        });
    }
};
