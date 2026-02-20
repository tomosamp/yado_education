<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SectionPdf extends Model
{
    use HasFactory;

    protected $fillable = [
        'section_id',
        'file_key',
        'file_name',
        'mime_type',
        'file_size',
        'sort_order',
    ];

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }
}
