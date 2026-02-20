<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Submission;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function pendingUsers(): JsonResponse
    {
        $summaries = Submission::query()
            ->select('user_id')
            ->selectRaw('COUNT(*) as pending_count')
            ->selectRaw('MAX(created_at) as latest_submitted_at')
            ->where('status', Submission::STATUS_REVIEW_PENDING)
            ->groupBy('user_id')
            ->orderByDesc('latest_submitted_at')
            ->get();

        $userMap = User::query()
            ->whereIn('id', $summaries->pluck('user_id')->all())
            ->get(['id', 'name', 'email'])
            ->keyBy('id');

        $users = $summaries
            ->map(function ($summary) use ($userMap) {
                $user = $userMap->get($summary->user_id);
                if (! $user) {
                    return null;
                }

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'pending_count' => (int) $summary->pending_count,
                    'latest_submitted_at' => $summary->latest_submitted_at,
                ];
            })
            ->filter()
            ->values();

        return response()->json([
            'users' => $users,
            'total' => $users->count(),
        ]);
    }

    public function pending(Request $request): JsonResponse
    {
        $data = $request->validate([
            'section_id' => ['nullable', 'integer', 'exists:sections,id'],
            'user_id' => ['nullable', 'integer', 'exists:users,id'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $query = Submission::query()
            ->with(['user', 'section.category'])
            ->where('status', Submission::STATUS_REVIEW_PENDING)
            ->latest('created_at');

        if (! empty($data['section_id'])) {
            $query->where('section_id', $data['section_id']);
        }

        if (! empty($data['user_id'])) {
            $query->where('user_id', $data['user_id']);
        }

        $perPage = $data['per_page'] ?? 20;

        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request, Submission $submission): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', 'in:approved,rejected'],
            'comment' => ['required', 'string'],
        ]);

        if ($submission->status !== Submission::STATUS_REVIEW_PENDING) {
            return response()->json([
                'message' => 'この提出はレビュー待ちではありません。',
            ], 422);
        }

        $review = DB::transaction(function () use ($request, $submission, $data) {
            $review = Review::query()->create([
                'submission_id' => $submission->id,
                'reviewer_id' => $request->user()->id,
                'decision' => $data['decision'],
                'comment' => $data['comment'],
            ]);

            $submission->update([
                'status' => $data['decision'] === 'approved'
                    ? Submission::STATUS_PASSED
                    : Submission::STATUS_REVISION_REQUIRED,
            ]);

            return $review;
        });

        $review->load('reviewer');

        $this->activityLogger->log($request->user(), 'submission.reviewed', $submission, [
            'decision' => $data['decision'],
        ]);

        return response()->json([
            'message' => 'レビュー結果を保存しました。',
            'review' => $review,
            'submission' => $submission->fresh(),
        ]);
    }
}
