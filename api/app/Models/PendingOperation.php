<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PendingOperation extends Model
{
    use HasFactory;

    protected $fillable = [
        'type',
        'data',
        'user_id',
        'status',
        'approved_by',
        'rejection_reason',
        'approved_at',
    ];

    protected $casts = [
        'data' => 'array',
        'approved_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }
}

