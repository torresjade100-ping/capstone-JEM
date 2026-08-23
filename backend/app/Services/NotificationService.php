<?php

namespace App\Services;

use App\Models\Notification;

class NotificationService
{
    public function notify(array $data): Notification
    {
        // expected keys: user_id, type, data, channel
        return Notification::create([
            'user_id' => $data['user_id'] ?? null,
            'title' => $data['title'] ?? ucfirst(str_replace('_', ' ', $data['type'] ?? 'Notification')),
            'message' => $data['message'] ?? ($data['data']['message'] ?? 'You have a new notification.'),
            'type' => $data['type'] ?? null,
            'data' => $data['data'] ?? null,
            'channel' => $data['channel'] ?? 'database',
            'read' => false,
        ]);
    }
}
