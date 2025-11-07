<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Vehicle, VehicleAssignment};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VehicleController extends Controller
{
    public function index()
    {
        return Vehicle::with(['assignment'])->latest()->get()->map(function($v) {
            return [
                'id' => $v->id,
                'type' => $v->type,
                'designation' => $v->designation,
                'chassis_number' => $v->chassis_number,
                'plate_number' => $v->plate_number,
                'acquisition_date' => $v->acquisition_date->format('Y-m-d'),
                'acquirer' => $v->acquirer,
                'reception_commission' => $v->reception_commission,
                'observations' => $v->observations,
                'status' => $v->status,
                'assignment' => $v->assignment ? [
                    'id' => $v->assignment->id,
                    'region' => $v->assignment->region,
                    'recipient' => $v->assignment->recipient,
                    'structure' => $v->assignment->structure,
                    'district' => $v->assignment->district,
                    'assigned_at' => $v->assignment->assigned_at->format('Y-m-d'),
                ] : null,
            ];
        });
    }

    public function store(Request $r)
    {
        $v = $r->validate([
            'type' => 'required|string|in:moto,voiture,ambulance,camion,autres',
            'designation' => 'required|string',
            'chassis_number' => 'required|string',
            'plate_number' => 'required|string',
            'acquisition_date' => 'required|date',
            'acquirer' => 'required|string',
            'reception_commission' => 'nullable|string',
            'observations' => 'nullable|string',
        ]);

        $vehicle = Vehicle::create($v + ['status' => 'pending']);
        return response()->json(['id' => $vehicle->id], 201);
    }

    public function assign(Request $r)
    {
        $v = $r->validate([
            'vehicle_id' => 'required|integer|exists:vehicles,id',
            'region' => 'required|string|in:Dakar,Diourbel,Kaolack,Louga,Saint-Louis,Tambacounda,Ziguinchor,Thiès',
            'recipient' => 'required|string',
            'structure' => 'nullable|string',
            'district' => 'nullable|string',
        ]);

        return DB::transaction(function() use($v) {
            $vehicle = Vehicle::findOrFail($v['vehicle_id']);

            if ($vehicle->status === 'assigned') {
                return response()->json(['error' => 'Ce véhicule est déjà affecté'], 400);
            }

            VehicleAssignment::create([
                'vehicle_id' => $v['vehicle_id'],
                'region' => $v['region'],
                'recipient' => $v['recipient'],
                'structure' => $v['structure'] ?? null,
                'district' => $v['district'] ?? null,
                'assigned_at' => now(),
            ]);

            $vehicle->update(['status' => 'assigned']);
            return response()->json(['success' => true], 201);
        });
    }

    public function unassign(Request $r, $id)
    {
        $v = $r->validate([
            'agent' => 'required|string',
            'reason' => 'required|string',
        ]);

        return DB::transaction(function() use($id, $v) {
            $vehicle = Vehicle::findOrFail($id);

            if ($vehicle->status !== 'assigned') {
                return response()->json(['error' => 'Ce véhicule n\'est pas affecté'], 400);
            }

            // Ici vous pouvez enregistrer l'historique de désaffectation si nécessaire
            // Par exemple dans une table vehicle_unassignments avec agent, reason, unassigned_at

            $vehicle->assignment()->delete();
            $vehicle->update(['status' => 'pending']);
            return response()->json(['success' => true]);
        });
    }
}
