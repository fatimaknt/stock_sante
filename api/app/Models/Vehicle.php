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
        'reformed_at',
        'reform_reason',
        'reform_agent',
        'reform_destination',
        'reform_notes',
    ];

    protected $casts = [
        'acquisition_date' => 'date',
        'reformed_at' => 'date',
    ];

    public function assignment(): HasOne
    {
        return $this->hasOne(VehicleAssignment::class);
    }

    public function maintenances()
    {
        return $this->hasMany(Maintenance::class);
    }
}
