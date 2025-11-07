<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleAssignment extends Model
{
    protected $fillable = [
        'vehicle_id',
        'region',
        'recipient',
        'structure',
        'district',
        'assigned_at',
    ];

    protected $casts = [
        'assigned_at' => 'date',
    ];

    public function vehicle(): BelongsTo
    {
        return $this->belongsTo(Vehicle::class);
    }
}
