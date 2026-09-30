<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditService
{
    public function record(array $data): AuditLog
    {
        $user = !empty($data['user_id']) ? \App\Models\User::find($data['user_id']) : null;
        $userName = $data['user_name'] ?? ($user ? $user->name : 'System');
        $userRole = $data['user_role'] ?? ($user ? $user->role : 'system');
        $action = $data['action'] ?? $data['event'] ?? 'unknown';

        return AuditLog::create([
            'user_id' => $data['user_id'] ?? ($user ? $user->id : null),
            'action' => $action,
            'event' => $action,
            'transaction_id' => $data['transaction_id'] ?? null,
            'order_id' => $data['order_id'] ?? null,
            'user_name' => $userName,
            'user_role' => $userRole,
            'module' => $data['module'] ?? 'transactions',
            'record_type' => $data['record_type'] ?? null,
            'record_id' => $data['record_id'] ?? null,
            'reason' => $data['reason'] ?? null,
            'metadata' => $data['metadata'] ?? $data['details'] ?? null,
            'details' => is_string($data['details'] ?? null) ? $data['details'] : (isset($data['metadata']) ? json_encode($data['metadata']) : null),
            'before' => $data['before'] ?? null,
            'after' => $data['after'] ?? null,
            'ip_address' => $data['ip_address'] ?? null,
            'user_agent' => $data['user_agent'] ?? null,
        ]);
    }
}
