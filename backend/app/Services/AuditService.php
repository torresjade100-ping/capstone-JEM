<?php

namespace App\Services;

use App\Models\AuditLog;

class AuditService
{
    public function record(array $data): AuditLog
    {
        // expected keys: user_id, action, module, record_type, record_id, reason, before, after, ip_address
        return AuditLog::create([
            'user_id' => $data['user_id'] ?? null,
            'action' => $data['action'] ?? 'unknown',
            'module' => $data['module'] ?? null,
            'record_type' => $data['record_type'] ?? null,
            'record_id' => $data['record_id'] ?? null,
            'reason' => $data['reason'] ?? null,
            'before' => $data['before'] ?? null,
            'after' => $data['after'] ?? null,
            'ip_address' => $data['ip_address'] ?? null,
        ]);
    }
}
