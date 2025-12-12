<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            'Médicaments',
            'Fournitures Médicales',
            'Équipements',
            'Consommables',
            'Vaccins',
            'Tests Diagnostiques',
            'Produits d\'Hygiène',
            'Autres',
        ];

        foreach ($categories as $name) {
            Category::firstOrCreate(['name' => $name]);
        }
    }
}
