<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    use HasFactory;
    protected $fillable = ['product_id', 'type', 'exit_type', 'quantity', 'price', 'beneficiary', 'agent', 'notes', 'movement_date', 'status'];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
