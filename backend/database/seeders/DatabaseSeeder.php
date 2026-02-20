<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Label;
use App\Models\Section;
use App\Models\SectionHint;
use App\Models\SectionJudgeConfig;
use App\Models\User;
use App\Models\UserLabel;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->updateOrCreate([
            'email' => 'admin@test.com',
        ], [
            'name' => '管理者ユーザー',
            'password' => 'password',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $reviewer = User::query()->updateOrCreate([
            'email' => 'reviewer@example.com',
        ], [
            'name' => 'レビューユーザー',
            'password' => 'password',
            'role' => User::ROLE_REVIEWER,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $learner = User::query()->updateOrCreate([
            'email' => 'user@example.com',
        ], [
            'name' => '受講者ユーザー',
            'password' => 'password',
            'role' => User::ROLE_USER,
            'is_active' => true,
            'email_verified_at' => now(),
        ]);

        $algorithm = Category::query()->updateOrCreate([
            'title' => 'アルゴリズム基礎',
        ], [
            'description' => '基礎的なロジック問題を解く講座',
            'sort_order' => 1,
            'is_visible' => true,
        ]);

        $webapp = Category::query()->updateOrCreate([
            'title' => 'Webアプリ講座',
        ], [
            'description' => 'GitHub提出型の実践講座',
            'sort_order' => 2,
            'is_visible' => true,
        ]);

        $autojudgeSection = Section::query()->updateOrCreate([
            'title' => '足し算問題',
            'category_id' => $algorithm->id,
        ], [
            'description' => '2つの整数を読み取り合計を出力してください。',
            'type' => Section::TYPE_AUTOJUDGE,
            'sort_order' => 1,
            'is_visible' => true,
            'extra_text_enabled' => false,
            'extra_text_required' => false,
        ]);

        SectionJudgeConfig::query()->updateOrCreate([
            'section_id' => $autojudgeSection->id,
        ], [
            'config' => [
                'allowed_languages' => ['php', 'javascript', 'python'],
                'time_limit_sec' => 5,
                'memory_limit_mb' => 256,
                'cases' => [
                    ['stdin' => "1 2\n", 'expected_stdout' => "3\n"],
                    ['stdin' => "10 20\n", 'expected_stdout' => "30\n"],
                ],
            ],
        ]);

        SectionHint::query()->updateOrCreate([
            'section_id' => $autojudgeSection->id,
            'hint_order' => 1,
        ], [
            'content' => '標準入力から2つの値を受け取って合計します。',
        ]);

        SectionHint::query()->updateOrCreate([
            'section_id' => $autojudgeSection->id,
            'hint_order' => 2,
        ], [
            'content' => 'PHPなら explode、Pythonなら split で入力を分割できます。',
        ]);

        SectionHint::query()->updateOrCreate([
            'section_id' => $autojudgeSection->id,
            'hint_order' => 3,
        ], [
            'content' => '整数に変換した後で加算し、改行付きで出力してください。',
        ]);

        Section::query()->updateOrCreate([
            'title' => 'TODOアプリ提出',
            'category_id' => $webapp->id,
        ], [
            'description' => 'Laravel + React で作成したTODOアプリのGitHub URLを提出してください。',
            'type' => Section::TYPE_WEBAPP,
            'sort_order' => 1,
            'is_visible' => true,
            'extra_text_enabled' => true,
            'extra_text_label' => '使用ライブラリ',
            'extra_text_required' => true,
        ]);

        $label = Label::query()->updateOrCreate([
            'name' => '2026新卒',
        ], [
            'is_permanent' => false,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);

        UserLabel::query()->updateOrCreate([
            'user_id' => $learner->id,
            'label_id' => $label->id,
        ], [
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);

        UserLabel::query()->updateOrCreate([
            'user_id' => $reviewer->id,
            'label_id' => $label->id,
        ], [
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);

        UserLabel::query()->updateOrCreate([
            'user_id' => $admin->id,
            'label_id' => $label->id,
        ], [
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);
    }
}
