<?php
use Illuminate\Database\Migrations\Migration;use Illuminate\Database\Schema\Blueprint;use Illuminate\Support\Facades\Schema;
return new class extends Migration{public function up():void{Schema::create('receipt_items',function(Blueprint $table){$table->id();$table->foreignId('receipt_id')->constrained('receipts')->cascadeOnDelete();$table->foreignId('product_id')->constrained('products')->cascadeOnDelete();$table->integer('quantity');$table->decimal('unit_price',12,2)->default(0);$table->timestamps();});}public function down():void{Schema::dropIfExists('receipt_items');}};
