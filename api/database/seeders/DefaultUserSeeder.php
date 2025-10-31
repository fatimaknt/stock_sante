<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DefaultUserSeeder extends Seeder
{
    public function run(): void
    {
        // Créer un utilisateur admin par défaut
        User::firstOrCreate(
            ['email' => 'admin@stockpro.com'],
            [
                'name' => 'Administrateur',
                'password' => Hash::make('admin123'),
                'role' => 'Administrateur',
                'status' => 'Actif',
                'permissions' => ['Gestion complète', 'Rapports', 'Gestion stock'],
                'email_verified_at' => now(),
            ]
        );

        $this->command->info('Utilisateur admin créé :');
        $this->command->info('Email: admin@stockpro.com');
        $this->command->info('Mot de passe: admin123');
    }
}

