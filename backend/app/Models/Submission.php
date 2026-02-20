<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Submission extends Model
{
    use HasFactory;

    public const STATUS_REVIEW_PENDING = 'review_pending';

    public const STATUS_REVISION_REQUIRED = 'revision_required';

    public const STATUS_PASSED = 'passed';

    protected $fillable = [
        'section_id',
        'user_id',
        'status',
        'understanding',
        'comment',
        'submitted_at',
    ];

    protected function casts(): array
    {
        return [
            'submitted_at' => 'datetime',
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

    public function autojudgeCode(): HasOne
    {
        return $this->hasOne(SubmissionAutojudgeCode::class);
    }

    public function webappLink(): HasOne
    {
        return $this->hasOne(SubmissionWebappLink::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
