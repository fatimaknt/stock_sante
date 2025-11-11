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
        Schema::create('maintenances', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicles')->cascadeOnDelete();
            $table->string('type'); // Entretien préventif, Vidange, Réparation, etc.
            $table->date('maintenance_date');
            $table->integer('mileage')->nullable(); // Kilométrage
            $table->decimal('cost', 12, 2); // Coût en FCFA
            $table->string('agent'); // Agent / Mécanicien
            $table->date('next_maintenance_date')->nullable(); // Prochain entretien (Date)
            $table->integer('next_maintenance_mileage')->nullable(); // Prochain entretien (KM)
            $table->text('observations')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('maintenances');
    }
};
