<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Vehicle extends Model
{
    protected $fillable = [
        'type',
        'designation',
        'chassis_number',
        'plate_number',
        'acquisition_date',
        'acquirer',
        'reception_commission',
        'observations',
        'status',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
    ];

    public function assignment(): HasOne
    {
        return $this->hasOne(VehicleAssignment::class);
    }
}
