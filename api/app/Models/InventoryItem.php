<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;
    protected $fillable = ['inventory_id', 'product_id', 'theoretical_qty', 'counted_qty', 'variance'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
