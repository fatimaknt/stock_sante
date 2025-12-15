<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer tous les produits de test
        DB::table('products')->delete();
    }

    public function down(): void
    {
        // Ne rien faire en rollback
    }
};
