<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('role')->default('Utilisateur')->after('email');
            $table->string('status')->default('Actif')->after('role');
            $table->timestamp('last_login')->nullable()->after('status');
            $table->json('permissions')->nullable()->after('last_login');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'status', 'last_login', 'permissions']);
        });
    }
};

