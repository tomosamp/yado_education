<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SubmissionAutojudgeCode extends Model
{
    use HasFactory;

    protected $fillable = [
        'submission_id',
        'judge_run_id',
        'language',
        'code',
    ];

    public function submission(): BelongsTo
    {
        return $this->belongsTo(Submission::class);
    }

    public function judgeRun(): BelongsTo
    {
        return $this->belongsTo(JudgeRun::class);
    }
}

