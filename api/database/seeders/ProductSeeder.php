<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Get or create categories
        $medicaments = Category::firstOrCreate(['name' => 'Médicaments']);
        $fournitures = Category::firstOrCreate(['name' => 'Fournitures Médicales']);
        $equipements = Category::firstOrCreate(['name' => 'Équipements']);
        $consommables = Category::firstOrCreate(['name' => 'Consommables']);
        $vaccins = Category::firstOrCreate(['name' => 'Vaccins']);
        $tests = Category::firstOrCreate(['name' => 'Tests Diagnostiques']);
        $hygiene = Category::firstOrCreate(['name' => 'Produits d\'Hygiène']);

        $products = [
            // Médicaments
            [
                'name' => 'Paracétamol 500mg',
                'category_id' => $medicaments->id,
                'unit' => 'Boîte',
                'stock_quantity' => 150,
                'unit_price' => 2.50,
                'description' => 'Antalgique/Antipyrétique',
            ],
            [
                'name' => 'Amoxicilline 500mg',
                'category_id' => $medicaments->id,
                'unit' => 'Boîte',
                'stock_quantity' => 80,
                'unit_price' => 5.00,
                'description' => 'Antibiotique',
            ],
            [
                'name' => 'Ibuprofène 200mg',
                'category_id' => $medicaments->id,
                'unit' => 'Boîte',
                'stock_quantity' => 100,
                'unit_price' => 3.75,
                'description' => 'Anti-inflammatoire',
            ],

            // Fournitures Médicales
            [
                'name' => 'Gants d\'examen latex L',
                'category_id' => $fournitures->id,
                'unit' => 'Boîte',
                'stock_quantity' => 500,
                'unit_price' => 1.20,
                'description' => 'Gants stériles',
            ],
            [
                'name' => 'Seringues 10ml',
                'category_id' => $fournitures->id,
                'unit' => 'Boîte',
                'stock_quantity' => 300,
                'unit_price' => 0.50,
                'description' => 'Seringues stériles',
            ],
            [
                'name' => 'Aiguilles 23G',
                'category_id' => $fournitures->id,
                'unit' => 'Boîte',
                'stock_quantity' => 400,
                'unit_price' => 0.30,
                'description' => 'Aiguilles stériles',
            ],

            // Équipements
            [
                'name' => 'Tensiomètre électronique',
                'category_id' => $equipements->id,
                'unit' => 'Unité',
                'stock_quantity' => 5,
                'unit_price' => 45.00,
                'description' => 'Appareil de mesure tension artérielle',
            ],
            [
                'name' => 'Thermomètre numérique',
                'category_id' => $equipements->id,
                'unit' => 'Unité',
                'stock_quantity' => 10,
                'unit_price' => 12.00,
                'description' => 'Thermomètre sans contact',
            ],

            // Consommables
            [
                'name' => 'Alcool 70%',
                'category_id' => $consommables->id,
                'unit' => 'Litre',
                'stock_quantity' => 50,
                'unit_price' => 4.50,
                'description' => 'Désinfectant',
            ],
            [
                'name' => 'Coton hydrophile',
                'category_id' => $consommables->id,
                'unit' => 'Paquet',
                'stock_quantity' => 100,
                'unit_price' => 2.00,
                'description' => 'Coton pour pansement',
            ],

            // Vaccins
            [
                'name' => 'Vaccin RRO',
                'category_id' => $vaccins->id,
                'unit' => 'Dose',
                'stock_quantity' => 75,
                'unit_price' => 8.50,
                'description' => 'Rougeole-Rubéole-Oreillons',
            ],
            [
                'name' => 'Vaccin DTP',
                'category_id' => $vaccins->id,
                'unit' => 'Dose',
                'stock_quantity' => 120,
                'unit_price' => 6.00,
                'description' => 'Diphtérie-Tétanos-Poliomyélite',
            ],

            // Tests Diagnostiques
            [
                'name' => 'Test COVID-19 Antigénique',
                'category_id' => $tests->id,
                'unit' => 'Test',
                'stock_quantity' => 200,
                'unit_price' => 3.00,
                'description' => 'Test rapide COVID-19',
            ],
            [
                'name' => 'Test Grippe A/B',
                'category_id' => $tests->id,
                'unit' => 'Test',
                'stock_quantity' => 150,
                'unit_price' => 2.50,
                'description' => 'Test rapide grippe',
            ],

            // Produits d'Hygiène
            [
                'name' => 'Savon antibactérien',
                'category_id' => $hygiene->id,
                'unit' => 'Litre',
                'stock_quantity' => 80,
                'unit_price' => 3.25,
                'description' => 'Savon liquide antiseptique',
            ],
            [
                'name' => 'Désinfectant surface',
                'category_id' => $hygiene->id,
                'unit' => 'Litre',
                'stock_quantity' => 60,
                'unit_price' => 5.50,
                'description' => 'Produit nettoyant désinfectant',
            ],
        ];

        foreach ($products as $product) {
            Product::firstOrCreate(
                ['name' => $product['name']],
                $product
            );
        }
    }
}
