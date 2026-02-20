<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SectionHint extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'hint_order',
        'content',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }
}
