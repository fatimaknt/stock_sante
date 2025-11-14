<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\{Vehicle, VehicleAssignment, PendingOperation};
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class VehicleController extends Controller
{
    public function index()
    {
        // Récupérer les véhicules approuvés de la table vehicles
        $approvedVehicles = Vehicle::with(['assignment'])->latest()->get()->map(function($v) {
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
                'reformed_at' => $v->reformed_at ? $v->reformed_at->format('Y-m-d') : null,
                'reform_reason' => $v->reform_reason,
                'reform_agent' => $v->reform_agent,
                'reform_destination' => $v->reform_destination,
                'reform_notes' => $v->reform_notes,
                'assignment' => $v->assignment ? [
                    'id' => $v->assignment->id,
                    'region' => $v->assignment->region,
                    'recipient' => $v->assignment->recipient,
                    'structure' => $v->assignment->structure,
                    'district' => $v->assignment->district,
                    'assigned_at' => $v->assignment->assigned_at->format('Y-m-d'),
                ] : null,
                'pending_operation_id' => null,
            ];
        });

        // Récupérer les véhicules en attente/rejetés de pending_operations
        $pendingVehicles = PendingOperation::with(['user', 'approver'])
            ->where('type', 'vehicle')
            ->whereIn('status', ['pending', 'rejected'])
            ->latest()
            ->get()
            ->map(function($op) {
                $data = $op->data;
                return [
                    'id' => 'pending_' . $op->id,
                    'type' => $data['type'] ?? null,
                    'designation' => $data['designation'] ?? '',
                    'chassis_number' => $data['chassis_number'] ?? null,
                    'plate_number' => $data['plate_number'] ?? null,
                    'acquisition_date' => $data['acquisition_date'] ?? null,
                    'acquirer' => $data['acquirer'] ?? null,
                    'reception_commission' => $data['reception_commission'] ?? null,
                    'observations' => $data['observations'] ?? null,
                    'status' => $op->status,
                    'assignment' => null,
                    'pending_operation_id' => $op->id,
                    'created_at' => $op->created_at ? $op->created_at->toDateTimeString() : null,
                ];
            });

        // Combiner et trier par date
        return $approvedVehicles->concat($pendingVehicles)->sortByDesc(function($r) {
            if (isset($r['created_at'])) {
                return $r['created_at'];
            }
            return $r['acquisition_date'] ?? '1970-01-01';
        })->values();
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

        $user = Auth::user();

        // Si l'utilisateur est admin, créer directement
        if ($user->role === 'Administrateur') {
            $vehicle = Vehicle::create($v + ['status' => 'pending']);
            return response()->json(['id' => $vehicle->id], 201);
        }

        // Sinon, créer une demande en attente
        $pendingOperation = PendingOperation::create([
            'type' => 'vehicle',
            'data' => $v,
            'user_id' => $user->id,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Votre demande de véhicule a été créée et est en attente d\'approbation',
            'pending_operation_id' => $pendingOperation->id,
        ], 202);
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

    public function reform(Request $r, $id)
    {
        $v = $r->validate([
            'reform_reason' => 'required|string|in:Vétusté,Accident majeur,Coûts élevés,Fin de vie,Autre',
            'reform_agent' => 'required|string',
            'reform_destination' => 'required|string|in:Vente,Don,Destruction,Stockage',
            'reform_notes' => 'nullable|string',
        ]);

        return DB::transaction(function() use($id, $v) {
            $vehicle = Vehicle::findOrFail($id);

            if ($vehicle->status === 'reformed') {
                return response()->json(['error' => 'Ce véhicule est déjà réformé'], 400);
            }

            // Si le véhicule est affecté, on le désaffecte d'abord
            if ($vehicle->status === 'assigned') {
                $vehicle->assignment()->delete();
            }

            $vehicle->update([
                'status' => 'reformed',
                'reformed_at' => now(),
                'reform_reason' => $v['reform_reason'],
                'reform_agent' => $v['reform_agent'],
                'reform_destination' => $v['reform_destination'],
                'reform_notes' => $v['reform_notes'] ?? null,
            ]);

            return response()->json(['success' => true]);
        });
    }
}
