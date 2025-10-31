<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Inventory extends Model{use HasFactory;protected $fillable=['agent','counted_at','notes'];public function items(){return $this->hasMany(InventoryItem::class);} }
