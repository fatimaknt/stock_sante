<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('inventories',function(Blueprint $table){$table->id();$table->string('agent');$table->date('counted_at');$table->text('notes')->nullable();$table->timestamps();});}public function down():void{Schema::dropIfExists('inventories');}};
