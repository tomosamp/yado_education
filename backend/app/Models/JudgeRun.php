<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class JudgeRun extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';

    public const STATUS_PASSED = 'passed';

    public const STATUS_FAILED = 'failed';

    public const STATUS_TIMEOUT = 'timeout';

    public const STATUS_ERROR = 'error';

    protected $fillable = [
        'section_id',
        'user_id',
        'language',
        'code',
        'status',
        'passed',
        'results',
        'stdout',
        'stderr',
        'executed_at',
    ];

    protected function casts(): array
    {
        return [
            'results' => 'array',
            'passed' => 'boolean',
            'executed_at' => 'datetime',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
