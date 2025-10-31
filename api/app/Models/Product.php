<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class Product extends Model{use HasFactory;protected $fillable=['name','category','category_id','quantity','price','critical_level','supplier','supplier_id','acquirer','beneficiary','acquired_at'];}
