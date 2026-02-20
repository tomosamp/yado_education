<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Section extends Model
{
    use HasFactory;

    public const TYPE_AUTOJUDGE = 'autojudge';

    public const TYPE_WEBAPP = 'webapp';

    protected $fillable = [
        'category_id',
        'title',
        'description',
        'type',
        'sort_order',
        'is_visible',
        'extra_text_enabled',
        'extra_text_label',
        'extra_text_required',
    ];

    protected function casts(): array
    {
        return [
            'is_visible' => 'boolean',
            'extra_text_enabled' => 'boolean',
            'extra_text_required' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function pdfs(): HasMany
    {
        return $this->hasMany(SectionPdf::class);
    }

    public function hints(): HasMany
    {
        return $this->hasMany(SectionHint::class);
    }

    public function judgeConfig(): HasOne
    {
        return $this->hasOne(SectionJudgeConfig::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }
}
