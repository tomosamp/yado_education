<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Section;
use App\Models\SectionHintView;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CurriculumController extends Controller
{
    public function categories(Request $request): JsonResponse
    {
        $user = $request->user();

        $categories = Category::query()
            ->when($this->isLearner($user), fn ($q) => $q->where('is_visible', true))
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'categories' => $categories,
        ]);
    }

    public function sections(Request $request, Category $category): JsonResponse
    {
        $user = $request->user();

        if ($this->isLearner($user) && ! $category->is_visible) {
            abort(404);
        }

        $sections = Section::query()
            ->where('category_id', $category->id)
            ->when($this->isLearner($user), fn ($q) => $q->where('is_visible', true))
            ->with(['submissions' => fn ($q) => $q
                ->where('user_id', $user->id)
                ->latest('created_at')
                ->limit(1)])
            ->orderBy('sort_order')
            ->get()
            ->map(function (Section $section) {
                $latestSubmission = $section->submissions->first();

                return [
                    'id' => $section->id,
                    'category_id' => $section->category_id,
                    'title' => $section->title,
                    'description' => $section->description,
                    'type' => $section->type,
                    'sort_order' => $section->sort_order,
                    'is_visible' => $section->is_visible,
                    'status' => $latestSubmission?->status ?? 'not_submitted',
                    'extra_text_enabled' => $section->extra_text_enabled,
                    'extra_text_label' => $section->extra_text_label,
                    'extra_text_required' => $section->extra_text_required,
                ];
            });

        return response()->json([
            'category' => $category,
            'sections' => $sections,
        ]);
    }

    public function show(Request $request, Section $section): JsonResponse
    {
        $user = $request->user();

        if ($this->isLearner($user) && (! $section->is_visible || ! $section->category?->is_visible)) {
            abort(404);
        }

        $section->load([
            'category',
            'pdfs' => fn ($q) => $q->orderBy('sort_order'),
            'hints' => fn ($q) => $q->orderBy('hint_order'),
            'judgeConfig',
        ]);

        $latestSubmission = Submission::query()
            ->with(['autojudgeCode', 'webappLink'])
            ->where('section_id', $section->id)
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->first();

        $reviewHistory = Submission::query()
            ->with(['reviews.reviewer'])
            ->where('section_id', $section->id)
            ->where('user_id', $user->id)
            ->latest('created_at')
            ->get()
            ->flatMap(static fn (Submission $submission) => $submission->reviews)
            ->sortByDesc('created_at')
            ->values();

        return response()->json([
            'section' => [
                'id' => $section->id,
                'category_id' => $section->category_id,
                'title' => $section->title,
                'description' => $section->description,
                'type' => $section->type,
                'sort_order' => $section->sort_order,
                'is_visible' => $section->is_visible,
                'extra_text_enabled' => $section->extra_text_enabled,
                'extra_text_label' => $section->extra_text_label,
                'extra_text_required' => $section->extra_text_required,
                'pdfs' => $section->pdfs->map(static fn ($pdf) => [
                    'id' => $pdf->id,
                    'file_name' => $pdf->file_name,
                    'file_size' => $pdf->file_size,
                    'sort_order' => $pdf->sort_order,
                    'download_url' => route('api.pdfs.show', ['sectionPdf' => $pdf->id]),
                ]),
                'hints' => $this->buildHints($section, $user),
                'judge_config' => $section->type === Section::TYPE_AUTOJUDGE ? $section->judgeConfig?->config : null,
            ],
            'latest_submission' => $latestSubmission,
            'review_history' => $reviewHistory,
        ]);
    }

    public function openHint(Request $request, Section $section, int $hintOrder): JsonResponse
    {
        $user = $request->user();

        if ($this->isLearner($user) && (! $section->is_visible || ! $section->category?->is_visible)) {
            abort(404);
        }

        $hint = $section->hints()->where('hint_order', $hintOrder)->first();
        if (! $hint) {
            return response()->json([
                'message' => '該当ヒントが存在しません。',
            ], 404);
        }

        $openedCount = SectionHintView::query()
            ->where('section_id', $section->id)
            ->where('user_id', $user->id)
            ->count();

        if ($hintOrder > $openedCount + 1) {
            return response()->json([
                'message' => '先に前段階のヒントを開示してください。',
            ], 422);
        }

        SectionHintView::query()->firstOrCreate([
            'section_id' => $section->id,
            'user_id' => $user->id,
            'hint_order' => $hintOrder,
        ], [
            'viewed_at' => now(),
        ]);

        return response()->json([
            'hints' => $this->buildHints($section->load('hints'), $user),
        ]);
    }

    private function isLearner(User $user): bool
    {
        return $user->role === User::ROLE_USER;
    }

    private function buildHints(Section $section, User $user): array
    {
        $hints = $section->hints()->orderBy('hint_order')->get();

        if ($hints->isEmpty()) {
            return [];
        }

        $opened = SectionHintView::query()
            ->where('section_id', $section->id)
            ->where('user_id', $user->id)
            ->pluck('hint_order')
            ->all();

        $openedSet = array_fill_keys($opened, true);
        $maxOpened = empty($opened) ? 0 : max($opened);

        return $hints->map(static function ($hint) use ($openedSet, $maxOpened) {
            $isOpened = isset($openedSet[$hint->hint_order]);

            return [
                'hint_order' => $hint->hint_order,
                'content' => $isOpened ? $hint->content : null,
                'is_opened' => $isOpened,
                'can_open' => ! $isOpened && $hint->hint_order === $maxOpened + 1,
            ];
        })->values()->all();
    }
}
