<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('receipts',function(Blueprint $table){$table->id();$table->foreignId('supplier_id')->nullable()->constrained('suppliers')->nullOnDelete();$table->string('agent');$table->date('received_at');$table->text('notes')->nullable();$table->timestamps();});}public function down():void{Schema::dropIfExists('receipts');}};
