<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\Submission;
use App\Models\User;
use App\Models\UserLabel;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = User::query()->with(['userLabels.label']);

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', $request->boolean('is_active'));
        }

        if ($request->filled('label_id')) {
            $labelId = $request->integer('label_id');
            $query->whereHas('userLabels', fn ($q) => $q->where('label_id', $labelId));
        }

        if ($request->filled('keyword')) {
            $keyword = '%'.$request->string('keyword').'%';
            $query->where(function ($q) use ($keyword) {
                $q->where('name', 'like', $keyword)
                    ->orWhere('email', 'like', $keyword);
            });
        }

        $users = $query->orderBy('id')->paginate(30);

        return response()->json($users);
    }

    public function show(User $user): JsonResponse
    {
        $user->load(['userLabels.label']);

        $visibleSections = Section::query()
            ->where('is_visible', true)
            ->whereHas('category', fn ($q) => $q->where('is_visible', true))
            ->count();

        $subquery = DB::table('submissions')
            ->select('section_id', DB::raw('MAX(created_at) AS max_created_at'))
            ->where('user_id', $user->id)
            ->groupBy('section_id');

        $latestStatuses = DB::table('submissions as s1')
            ->select('s1.section_id', 's1.status')
            ->joinSub($subquery, 's2', function ($join) {
                $join->on('s1.section_id', '=', 's2.section_id')
                    ->on('s1.created_at', '=', 's2.max_created_at');
            })
            ->where('s1.user_id', $user->id)
            ->get();

        $passed = $latestStatuses
            ->filter(static fn ($item): bool => $item->status === Submission::STATUS_PASSED)
            ->count();
        $reviewPending = $latestStatuses
            ->filter(static fn ($item): bool => $item->status === Submission::STATUS_REVIEW_PENDING)
            ->count();
        $revisionRequired = $latestStatuses
            ->filter(static fn ($item): bool => $item->status === Submission::STATUS_REVISION_REQUIRED)
            ->count();

        $submitted = $latestStatuses->count();
        $notSubmitted = max(0, $visibleSections - $submitted);
        $completionRate = $visibleSections > 0 ? round(($passed / $visibleSections) * 100, 1) : 0;

        return response()->json([
            'user' => $user,
            'progress' => [
                'total_sections' => $visibleSections,
                'passed' => $passed,
                'review_pending' => $reviewPending,
                'revision_required' => $revisionRequired,
                'not_submitted' => $notSubmitted,
                'completion_rate' => $completionRate,
            ],
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:user,reviewer,admin'],
            'is_active' => ['required', 'boolean'],
        ]);

        $user->update($data);

        $this->activityLogger->log($request->user(), 'user.updated', $user, [
            'role' => $user->role,
            'is_active' => $user->is_active,
        ]);

        return response()->json([
            'message' => 'ユーザー情報を更新しました。',
            'user' => $user,
        ]);
    }

    public function syncLabels(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'labels' => ['required', 'array'],
            'labels.*.label_id' => ['required', 'integer', 'exists:labels,id'],
            'labels.*.start_date' => ['nullable', 'date'],
            'labels.*.end_date' => ['nullable', 'date'],
        ]);

        UserLabel::query()->where('user_id', $user->id)->delete();

        foreach ($data['labels'] as $item) {
            UserLabel::query()->create([
                'user_id' => $user->id,
                'label_id' => $item['label_id'],
                'start_date' => $item['start_date'] ?? null,
                'end_date' => $item['end_date'] ?? null,
            ]);
        }

        $this->activityLogger->log($request->user(), 'user.labels_synced', $user, [
            'count' => count($data['labels']),
        ]);

        return response()->json([
            'message' => 'ラベルを更新しました。',
        ]);
    }
}
