<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VoidSecuritySetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class VoidSecurityController extends Controller
{
    protected AuditService $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * Get Void PIN status (Admin Only).
     * Never exposes the hash or PIN.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $setting = VoidSecuritySetting::first();
        $isConfigured = !empty($setting && $setting->void_pin_hash);

        return response()->json([
            'success' => true,
            'data' => [
                'configured' => $isConfigured,
                'configured_at' => $setting?->configured_at,
            ],
        ]);
    }

    /**
     * Setup initial 6-digit Void PIN (Admin Only).
     */
    public function setup(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $setting = VoidSecuritySetting::first();
        if ($setting && !empty($setting->void_pin_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Void PIN is already configured. Please use Change Void PIN instead.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'pin' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
            'pin_confirmation' => ['required', 'same:pin'],
        ], [
            'pin.required' => '6-digit Void PIN is required.',
            'pin.regex' => 'Void PIN must be exactly 6 digits (numbers only, no spaces or letters).',
            'pin_confirmation.same' => 'New PIN and confirmation PIN do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $setting = VoidSecuritySetting::firstOrNew(['id' => 1]);
        $setting->void_pin_hash = Hash::make($request->pin);
        $setting->configured_by = $user->id;
        $setting->configured_at = now();
        $setting->save();

        // Audit Trail: NEVER store the actual PIN
        try {
            $this->auditService->record([
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->role,
                'action' => 'VOID_PIN_CREATED',
                'module' => 'void_security',
                'record_type' => 'void_security_setting',
                'record_id' => $setting->id,
                'reason' => 'Initial 6-digit Void PIN configured by Admin',
                'metadata' => [
                    'admin_id' => $user->id,
                    'admin_name' => $user->name,
                    'timestamp' => now()->toIso8601String(),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Void PIN successfully configured.',
            'data' => [
                'configured' => true,
                'configured_at' => $setting->configured_at,
            ],
        ]);
    }

    /**
     * Change existing Void PIN (Admin Only).
     * Requires current valid PIN and new 6-digit PIN.
     */
    public function change(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'admin') {
            return response()->json(['success' => false, 'message' => 'Unauthorized. Admin access required.'], 403);
        }

        $setting = VoidSecuritySetting::first();
        if (!$setting || empty($setting->void_pin_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Void PIN has not been configured yet. Please create a Void PIN first.',
            ], 422);
        }

        $input = $request->all();
        if (!isset($input['new_pin']) && isset($input['pin'])) {
            $input['new_pin'] = $input['pin'];
        }
        if (!isset($input['new_pin_confirmation']) && isset($input['pin_confirmation'])) {
            $input['new_pin_confirmation'] = $input['pin_confirmation'];
        }

        $validator = Validator::make($input, [
            'current_pin' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
            'new_pin' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
            'new_pin_confirmation' => ['required', 'same:new_pin'],
        ], [
            'current_pin.required' => 'Current Void PIN is required.',
            'current_pin.regex' => 'Current Void PIN must be exactly 6 digits.',
            'new_pin.required' => 'New 6-digit Void PIN is required.',
            'new_pin.regex' => 'New Void PIN must be exactly 6 digits (numbers only, no spaces or letters).',
            'new_pin_confirmation.same' => 'New PIN and confirmation PIN do not match.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify current PIN
        if (!Hash::check($request->current_pin, $setting->void_pin_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Current Void PIN is incorrect.',
            ], 422);
        }

        // Save new hashed PIN
        $setting->void_pin_hash = Hash::make($input['new_pin']);
        $setting->configured_by = $user->id;
        $setting->configured_at = now();
        $setting->save();

        // Audit Trail: NEVER store old or new PIN
        try {
            $this->auditService->record([
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_role' => $user->role,
                'action' => 'VOID_PIN_CHANGED',
                'module' => 'void_security',
                'record_type' => 'void_security_setting',
                'record_id' => $setting->id,
                'reason' => 'Void PIN successfully changed by Admin',
                'metadata' => [
                    'admin_id' => $user->id,
                    'admin_name' => $user->name,
                    'timestamp' => now()->toIso8601String(),
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'message' => 'Void PIN successfully updated.',
            'data' => [
                'configured' => true,
                'configured_at' => $setting->configured_at,
            ],
        ]);
    }
}
