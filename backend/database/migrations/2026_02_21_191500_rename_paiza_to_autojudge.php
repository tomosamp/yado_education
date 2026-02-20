<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('sections')) {
            $driver = DB::getDriverName();

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE sections MODIFY COLUMN type ENUM('paiza','autojudge','webapp') NOT NULL");
            }

            DB::table('sections')->where('type', 'paiza')->update([
                'type' => 'autojudge',
            ]);

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE sections MODIFY COLUMN type ENUM('autojudge','webapp') NOT NULL");
            }
        }

        if (Schema::hasTable('submission_paiza_codes') && ! Schema::hasTable('submission_autojudge_codes')) {
            Schema::rename('submission_paiza_codes', 'submission_autojudge_codes');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('sections')) {
            $driver = DB::getDriverName();

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE sections MODIFY COLUMN type ENUM('paiza','autojudge','webapp') NOT NULL");
            }

            DB::table('sections')->where('type', 'autojudge')->update([
                'type' => 'paiza',
            ]);

            if ($driver === 'mysql') {
                DB::statement("ALTER TABLE sections MODIFY COLUMN type ENUM('paiza','webapp') NOT NULL");
            }
        }

        if (Schema::hasTable('submission_autojudge_codes') && ! Schema::hasTable('submission_paiza_codes')) {
            Schema::rename('submission_autojudge_codes', 'submission_paiza_codes');
        }
    }
};

