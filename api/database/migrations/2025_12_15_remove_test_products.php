<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Supprimer uniquement les produits de test du seeder
        $testProductNames = [
            'Paracétamol 500mg',
            'Amoxicilline 500mg',
            'Ibuprofène 200mg',
            'Gants d\'examen latex L',
            'Seringues 10ml',
            'Aiguilles 23G',
            'Tensiomètre électronique',
            'Thermomètre numérique',
            'Alcool 70%',
            'Spray antiseptique',
            'Pansements stériles 10x10',
            'Coton hydrophile',
            'Glucosamine',
            'Aspirine 500mg',
            'Vitamine C 1000mg',
            'Vaccin DTP',
            'Vaccin RRO',
            'Test COVID-19 Antigénique',
            'Test Grippe A/B',
            'Test Sérologique VIH',
            'Savon antibactérien',
            'Gel hydroalcoolique',
            'Masques chirurgicaux',
            'Désinfectant surface',
        ];

        DB::table('products')
            ->whereIn('name', $testProductNames)
            ->delete();
    }

    public function down(): void
    {
        // Ne rien faire en rollback
    }
};
