<?php

namespace Tests\Feature;

use App\Models\JudgeRun;
use App\Models\Section;
use App\Models\Submission;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubmissionFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(DatabaseSeeder::class);
    }

    public function test_autojudge_submission_and_review_flow(): void
    {
        $learner = User::query()->where('role', User::ROLE_USER)->firstOrFail();
        $reviewer = User::query()->where('role', User::ROLE_REVIEWER)->firstOrFail();
        $section = Section::query()->where('type', Section::TYPE_AUTOJUDGE)->firstOrFail();

        $judgeRun = JudgeRun::query()->create([
            'section_id' => $section->id,
            'user_id' => $learner->id,
            'language' => 'php',
            'code' => '<?php echo 3;',
            'status' => JudgeRun::STATUS_PASSED,
            'passed' => true,
            'results' => [['passed' => true]],
            'executed_at' => now(),
        ]);

        $submissionResponse = $this
            ->actingAs($learner)
            ->postJson("/api/sections/{$section->id}/submissions", [
                'understanding' => 8,
                'comment' => '提出します',
                'judge_run_id' => $judgeRun->id,
            ]);

        $submissionResponse->assertCreated();
        $submissionId = (int) $submissionResponse->json('submission.id');

        $this->assertDatabaseHas('submissions', [
            'id' => $submissionId,
            'status' => Submission::STATUS_REVIEW_PENDING,
        ]);

        $reviewResponse = $this
            ->actingAs($reviewer)
            ->postJson("/api/submissions/{$submissionId}/reviews", [
                'decision' => 'approved',
                'comment' => '良い実装です。',
            ]);

        $reviewResponse->assertOk();

        $this->assertDatabaseHas('submissions', [
            'id' => $submissionId,
            'status' => Submission::STATUS_PASSED,
        ]);
        $this->assertDatabaseHas('reviews', [
            'submission_id' => $submissionId,
            'decision' => 'approved',
        ]);
    }

    public function test_user_cannot_access_admin_endpoints(): void
    {
        $learner = User::query()->where('role', User::ROLE_USER)->firstOrFail();

        $response = $this
            ->actingAs($learner)
            ->postJson('/api/admin/categories', [
                'title' => '不正操作',
                'description' => '作成不可',
                'sort_order' => 1,
                'is_visible' => true,
            ]);

        $response->assertForbidden();
    }

    public function test_reviewer_can_list_pending_users_and_user_filtered_sections(): void
    {
        $reviewer = User::query()->where('role', User::ROLE_REVIEWER)->firstOrFail();
        $learner = User::query()->where('role', User::ROLE_USER)->firstOrFail();
        $anotherLearner = User::factory()->create([
            'role' => User::ROLE_USER,
            'is_active' => true,
        ]);
        $section = Section::query()->where('type', Section::TYPE_AUTOJUDGE)->firstOrFail();

        Submission::query()->create([
            'section_id' => $section->id,
            'user_id' => $learner->id,
            'status' => Submission::STATUS_REVIEW_PENDING,
            'understanding' => 6,
            'comment' => 'レビューお願いします',
            'submitted_at' => now()->subMinute(),
        ]);

        Submission::query()->create([
            'section_id' => $section->id,
            'user_id' => $anotherLearner->id,
            'status' => Submission::STATUS_REVIEW_PENDING,
            'understanding' => 7,
            'comment' => '確認お願いします',
            'submitted_at' => now(),
        ]);

        Submission::query()->create([
            'section_id' => $section->id,
            'user_id' => $anotherLearner->id,
            'status' => Submission::STATUS_PASSED,
            'understanding' => 8,
            'comment' => 'これは対象外',
            'submitted_at' => now(),
        ]);

        $usersResponse = $this
            ->actingAs($reviewer)
            ->getJson('/api/reviews/pending-users');

        $usersResponse
            ->assertOk()
            ->assertJsonPath('total', 2)
            ->assertJsonFragment([
                'id' => $learner->id,
                'pending_count' => 1,
            ])
            ->assertJsonFragment([
                'id' => $anotherLearner->id,
                'pending_count' => 1,
            ]);

        $sectionsResponse = $this
            ->actingAs($reviewer)
            ->getJson("/api/reviews/pending?user_id={$anotherLearner->id}&per_page=100");

        $sectionsResponse
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('data.0.user_id', $anotherLearner->id)
            ->assertJsonPath('data.0.status', Submission::STATUS_REVIEW_PENDING);
    }
}
