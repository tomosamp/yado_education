<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Category;
use App\Models\Section;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();

        $visibleSections = Section::query()
            ->where('is_visible', true)
            ->whereHas('category', fn ($q) => $q->where('is_visible', true))
            ->count();

        $latestStatuses = $this->latestSubmissionStatuses($user->id);

        $passed = collect($latestStatuses)->where('status', Submission::STATUS_PASSED)->count();
        $reviewPending = collect($latestStatuses)->where('status', Submission::STATUS_REVIEW_PENDING)->count();
        $revisionRequired = collect($latestStatuses)->where('status', Submission::STATUS_REVISION_REQUIRED)->count();

        $categoryProgress = Category::query()
            ->where('is_visible', true)
            ->with(['sections' => fn ($q) => $q->where('is_visible', true)->orderBy('sort_order')])
            ->orderBy('sort_order')
            ->get()
            ->map(function (Category $category) use ($latestStatuses) {
                $sectionIds = $category->sections->pluck('id')->all();
                $total = count($sectionIds);
                $passedCount = collect($latestStatuses)
                    ->whereIn('section_id', $sectionIds)
                    ->where('status', Submission::STATUS_PASSED)
                    ->count();

                return [
                    'category_id' => $category->id,
                    'title' => $category->title,
                    'total_sections' => $total,
                    'passed_sections' => $passedCount,
                    'progress_rate' => $total > 0 ? round(($passedCount / $total) * 100, 1) : 0,
                ];
            });

        $activities = ActivityLog::query()
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->limit(10)
            ->get();

        return response()->json([
            'metrics' => [
                'total_sections' => $visibleSections,
                'passed_sections' => $passed,
                'review_pending' => $reviewPending,
                'revision_required' => $revisionRequired,
                'completion_rate' => $visibleSections > 0 ? round(($passed / $visibleSections) * 100, 1) : 0,
            ],
            'category_progress' => $categoryProgress,
            'activities' => $activities,
        ]);
    }

    public function admin(): JsonResponse
    {
        $totalUsers = User::query()->count();
        $activeUsers = User::query()->where('is_active', true)->count();
        $pendingReviews = Submission::query()->where('status', Submission::STATUS_REVIEW_PENDING)->count();

        $totalSections = Section::query()->where('is_visible', true)->count();
        $latest = DB::table('submissions as s1')
            ->select('s1.user_id', 's1.section_id', 's1.status')
            ->join(DB::raw('(SELECT user_id, section_id, MAX(created_at) AS max_created_at FROM submissions GROUP BY user_id, section_id) s2'), function ($join) {
                $join->on('s1.user_id', '=', 's2.user_id')
                    ->on('s1.section_id', '=', 's2.section_id')
                    ->on('s1.created_at', '=', 's2.max_created_at');
            })
            ->get();

        $passedLatest = $latest->where('status', Submission::STATUS_PASSED)->count();
        $completionRate = $totalUsers > 0 && $totalSections > 0
            ? round(($passedLatest / ($totalUsers * $totalSections)) * 100, 1)
            : 0;

        return response()->json([
            'metrics' => [
                'total_users' => $totalUsers,
                'active_users' => $activeUsers,
                'pending_reviews' => $pendingReviews,
                'overall_completion_rate' => $completionRate,
            ],
        ]);
    }

    public function reviewer(): JsonResponse
    {
        $pending = Submission::query()
            ->with(['user', 'section.category'])
            ->where('status', Submission::STATUS_REVIEW_PENDING)
            ->latest('created_at')
            ->limit(20)
            ->get();

        return response()->json([
            'metrics' => [
                'pending_reviews' => $pending->count(),
            ],
            'pending_submissions' => $pending,
        ]);
    }

    private function latestSubmissionStatuses(int $userId): array
    {
        $subquery = DB::table('submissions')
            ->select('section_id', DB::raw('MAX(created_at) AS max_created_at'))
            ->where('user_id', $userId)
            ->groupBy('section_id');

        return DB::table('submissions as s1')
            ->select('s1.section_id', 's1.status')
            ->joinSub($subquery, 's2', function ($join) {
                $join->on('s1.section_id', '=', 's2.section_id')
                    ->on('s1.created_at', '=', 's2.max_created_at');
            })
            ->where('s1.user_id', $userId)
            ->get()
            ->map(static fn ($item) => [
                'section_id' => $item->section_id,
                'status' => $item->status,
            ])
            ->all();
    }
}
