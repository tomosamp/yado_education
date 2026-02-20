<?php

namespace App\Services;

use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ActivityLogger
{
    public function log(?User $user, string $action, ?Model $target = null, array $payload = []): void
    {
        ActivityLog::query()->create([
            'user_id' => $user?->id,
            'action' => $action,
            'target_type' => $target ? $target::class : null,
            'target_id' => $target?->id,
            'payload' => empty($payload) ? null : $payload,
        ]);
    }
}
