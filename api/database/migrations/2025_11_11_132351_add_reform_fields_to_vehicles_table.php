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
        Schema::table('vehicles', function (Blueprint $table) {
            $table->date('reformed_at')->nullable()->after('status');
            $table->string('reform_reason')->nullable()->after('reformed_at'); // Vétusté, Accident majeur, Coûts élevés, Fin de vie, Autre
            $table->string('reform_agent')->nullable()->after('reform_reason');
            $table->string('reform_destination')->nullable()->after('reform_agent'); // Vente, Don, Destruction, Stockage
            $table->text('reform_notes')->nullable()->after('reform_destination');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicles', function (Blueprint $table) {
            $table->dropColumn(['reformed_at', 'reform_reason', 'reform_agent', 'reform_destination', 'reform_notes']);
        });
    }
};
