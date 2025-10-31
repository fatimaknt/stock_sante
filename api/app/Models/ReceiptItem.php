<?php
namespace App\Models;use Illuminate\Database\Eloquent\Factories\HasFactory;use Illuminate\Database\Eloquent\Model;
class ReceiptItem extends Model{use HasFactory;protected $fillable=['receipt_id','product_id','quantity','unit_price'];}
