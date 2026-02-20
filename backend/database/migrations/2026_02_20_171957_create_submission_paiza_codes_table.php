<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('submission_autojudge_codes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->unique()->constrained('submissions')->cascadeOnDelete();
            $table->foreignId('judge_run_id')->nullable()->constrained('judge_runs')->nullOnDelete();
            $table->enum('language', ['php', 'javascript', 'python']);
            $table->longText('code');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('submission_autojudge_codes');
    }
};
