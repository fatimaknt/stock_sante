<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Receipt extends Model{use HasFactory;protected $fillable=['supplier_id','supplier','agent','received_at','notes'];public function items(){return $this->hasMany(ReceiptItem::class);} }
