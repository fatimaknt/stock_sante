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
        Schema::create('vehicles', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // moto, voiture, ambulance, camion, autres
            $table->string('designation');
            $table->string('chassis_number');
            $table->string('plate_number');
            $table->date('acquisition_date');
            $table->string('acquirer');
            $table->string('reception_commission')->nullable();
            $table->text('observations')->nullable();
            $table->string('status')->default('pending'); // pending, assigned
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicles');
    }
};
