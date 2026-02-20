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
        Schema::create('judge_runs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('section_id')->constrained('sections')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('language', ['php', 'javascript', 'python']);
            $table->longText('code');
            $table->enum('status', ['pending', 'passed', 'failed', 'timeout', 'error'])->default('pending');
            $table->boolean('passed')->nullable();
            $table->json('results')->nullable();
            $table->longText('stdout')->nullable();
            $table->longText('stderr')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->timestamps();

            $table->index(['section_id', 'user_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('judge_runs');
    }
};
