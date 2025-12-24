<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Maintenance, Vehicle};
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function index(Request $r)
    {
        $perPage = (int)$r->get('per_page', 15);
        $page = (int)$r->get('page', 1);

        $query = Maintenance::with('vehicle')->latest('maintenance_date');

        if ($r->has('vehicle_id')) {
            $query->where('vehicle_id', $r->vehicle_id);
        }

        $allMaintenances = $query->get()->map(function($m) {
            return [
                'id' => $m->id,
                'vehicle_id' => $m->vehicle_id,
                'vehicle' => [
                    'id' => $m->vehicle->id,
                    'plate_number' => $m->vehicle->plate_number,
                    'designation' => $m->vehicle->designation,
                ],
                'type' => $m->type,
                'maintenance_date' => $m->maintenance_date->format('Y-m-d'),
                'mileage' => $m->mileage,
                'cost' => (float) $m->cost,
                'agent' => $m->agent,
                'next_maintenance_date' => $m->next_maintenance_date ? $m->next_maintenance_date->format('Y-m-d') : null,
                'next_maintenance_mileage' => $m->next_maintenance_mileage,
                'observations' => $m->observations,
                'created_at' => $m->created_at->format('Y-m-d H:i:s'),
            ];
        });

        // Paginer les résultats
        $total = $allMaintenances->count();
        $lastPage = ceil($total / $perPage);
        $offset = ($page - 1) * $perPage;
        $items = $allMaintenances->slice($offset, $perPage)->values();

        return response()->json([
            'items' => $items,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'last_page' => $lastPage,
        ], 200);
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
            'type' => 'required|string',
            'maintenance_date' => 'required|date',
            'mileage' => 'nullable|integer|min:0',
            'cost' => 'required|numeric|min:0',
            'agent' => 'required|string',
            'next_maintenance_date' => 'nullable|date',
            'next_maintenance_mileage' => 'nullable|integer|min:0',
            'observations' => 'nullable|string',
        ]);

        $maintenance = Maintenance::create($v);
        return response()->json(['id' => $maintenance->id], 201);
    }
}
