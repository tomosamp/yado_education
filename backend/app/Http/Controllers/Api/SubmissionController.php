<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\RunJudgeJob;
use App\Models\JudgeRun;
use App\Models\Section;
use App\Models\Submission;
use App\Models\SubmissionAutojudgeCode;
use App\Models\SubmissionWebappLink;
use App\Models\User;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SubmissionController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function runJudge(Request $request, Section $section): JsonResponse
    {
        if ($section->type !== Section::TYPE_AUTOJUDGE) {
            return response()->json([
                'message' => 'このレッスンはコード判定に対応していません。',
            ], 422);
        }

        $data = $request->validate([
            'language' => ['required', 'in:php,javascript,python'],
            'code' => ['required', 'string'],
        ]);

        $judgeRun = JudgeRun::query()->create([
            'section_id' => $section->id,
            'user_id' => $request->user()->id,
            'language' => $data['language'],
            'code' => $data['code'],
            'status' => JudgeRun::STATUS_PENDING,
        ]);

        RunJudgeJob::dispatchSync($judgeRun->id);

        $judgeRun->refresh();

        $this->activityLogger->log($request->user(), 'judge.run', $judgeRun, [
            'section_id' => $section->id,
            'status' => $judgeRun->status,
        ]);

        return response()->json([
            'judge_run' => $judgeRun,
        ]);
    }

    public function submit(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();

        $base = $request->validate([
            'understanding' => ['required', 'integer', 'between:1,10'],
            'comment' => ['nullable', 'string'],
        ]);

        $submission = DB::transaction(function () use ($request, $section, $user, $base) {
            $submission = Submission::query()->create([
                'section_id' => $section->id,
                'user_id' => $user->id,
                'status' => Submission::STATUS_REVIEW_PENDING,
                'understanding' => $base['understanding'],
                'comment' => $base['comment'] ?? null,
                'submitted_at' => now(),
            ]);

            if ($section->type === Section::TYPE_AUTOJUDGE) {
                $payload = $request->validate([
                    'judge_run_id' => ['required', 'integer', 'exists:judge_runs,id'],
                ]);

                $judgeRun = JudgeRun::query()
                    ->where('id', $payload['judge_run_id'])
                    ->where('section_id', $section->id)
                    ->where('user_id', $user->id)
                    ->first();

                if (! $judgeRun || ! $judgeRun->passed) {
                    throw ValidationException::withMessages([
                        'judge_run_id' => '判定OKのコードのみ提出できます。',
                    ]);
                }

                $latestPassed = JudgeRun::query()
                    ->where('section_id', $section->id)
                    ->where('user_id', $user->id)
                    ->where('passed', true)
                    ->latest('created_at')
                    ->first();

                if (! $latestPassed || $latestPassed->id !== $judgeRun->id) {
                    throw ValidationException::withMessages([
                        'judge_run_id' => '最新の判定OKコードを提出してください。',
                    ]);
                }

                SubmissionAutojudgeCode::query()->create([
                    'submission_id' => $submission->id,
                    'judge_run_id' => $judgeRun->id,
                    'language' => $judgeRun->language,
                    'code' => $judgeRun->code,
                ]);
            }

            if ($section->type === Section::TYPE_WEBAPP) {
                $rules = [
                    'github_url' => ['required', 'url', 'starts_with:https://github.com/'],
                ];

                if ($section->extra_text_enabled) {
                    $rules['extra_text'] = [
                        $section->extra_text_required ? 'required' : 'nullable',
                        'string',
                        'max:2000',
                    ];
                }

                $payload = $request->validate($rules);

                SubmissionWebappLink::query()->create([
                    'submission_id' => $submission->id,
                    'github_url' => $payload['github_url'],
                    'extra_text' => $payload['extra_text'] ?? null,
                ]);
            }

            return $submission;
        });

        $submission->load(['autojudgeCode', 'webappLink', 'section']);

        $this->activityLogger->log($user, 'submission.created', $submission, [
            'section_id' => $section->id,
            'status' => $submission->status,
        ]);

        return response()->json([
            'message' => '提出を受け付けました。',
            'submission' => $submission,
        ], 201);
    }

    public function show(Request $request, Submission $submission): JsonResponse
    {
        $user = $request->user();

        if ($user->role === User::ROLE_USER && $submission->user_id !== $user->id) {
            abort(403);
        }

        $submission->load([
            'section.category',
            'user',
            'autojudgeCode',
            'webappLink',
            'reviews.reviewer',
        ]);

        return response()->json([
            'submission' => $submission,
        ]);
    }

    public function mySubmissions(Request $request): JsonResponse
    {
        $submissions = Submission::query()
            ->with(['section', 'autojudgeCode', 'webappLink', 'reviews'])
            ->where('user_id', $request->user()->id)
            ->latest('created_at')
            ->paginate(20);

        return response()->json($submissions);
    }
}
