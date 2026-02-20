<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\SectionHint;
use App\Models\SectionPdf;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class SectionController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = Section::query()->with(['category', 'pdfs', 'hints', 'judgeConfig']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        $sections = $query->orderBy('sort_order')->paginate(30);

        return response()->json($sections);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validateSection($request);

        $section = DB::transaction(function () use ($request, $data) {
            $section = Section::query()->create([
                'category_id' => $data['category_id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'type' => $data['type'],
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'is_visible' => (bool) ($data['is_visible'] ?? true),
                'extra_text_enabled' => (bool) ($data['extra_text_enabled'] ?? false),
                'extra_text_label' => $data['extra_text_label'] ?? null,
                'extra_text_required' => (bool) ($data['extra_text_required'] ?? false),
            ]);

            $this->syncHints($section, $data['hints'] ?? []);
            $this->syncJudgeConfig($section, $data['judge_config'] ?? null);
            $this->storePdfs($section, $request->file('pdfs', []));

            return $section;
        });

        $section->load(['pdfs', 'hints', 'judgeConfig']);

        $this->activityLogger->log($request->user(), 'section.created', $section);

        return response()->json([
            'message' => 'レッスンを作成しました。',
            'section' => $section,
        ], 201);
    }

    public function show(Section $section): JsonResponse
    {
        $section->load(['category', 'pdfs', 'hints', 'judgeConfig']);

        return response()->json([
            'section' => $section,
        ]);
    }

    public function update(Request $request, Section $section): JsonResponse
    {
        $data = $this->validateSection($request);

        DB::transaction(function () use ($request, $section, $data) {
            $section->update([
                'category_id' => $data['category_id'],
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'type' => $data['type'],
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'is_visible' => (bool) ($data['is_visible'] ?? true),
                'extra_text_enabled' => (bool) ($data['extra_text_enabled'] ?? false),
                'extra_text_label' => $data['extra_text_label'] ?? null,
                'extra_text_required' => (bool) ($data['extra_text_required'] ?? false),
            ]);

            $this->syncHints($section, $data['hints'] ?? []);
            $this->syncJudgeConfig($section, $data['judge_config'] ?? null);

            if (! empty($data['remove_pdf_ids'])) {
                $pdfs = SectionPdf::query()->whereIn('id', $data['remove_pdf_ids'])->where('section_id', $section->id)->get();
                foreach ($pdfs as $pdf) {
                    Storage::disk('s3')->delete($pdf->file_key);
                    $pdf->delete();
                }
            }

            $this->storePdfs($section, $request->file('pdfs', []));
        });

        $section->load(['pdfs', 'hints', 'judgeConfig']);

        $this->activityLogger->log($request->user(), 'section.updated', $section);

        return response()->json([
            'message' => 'レッスンを更新しました。',
            'section' => $section,
        ]);
    }

    public function destroy(Request $request, Section $section): JsonResponse
    {
        $section->delete();

        $this->activityLogger->log($request->user(), 'section.deleted', $section);

        return response()->json([
            'message' => 'レッスンを削除しました。',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:sections,id'],
            'items.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($data['items'] as $item) {
            Section::query()->where('id', $item['id'])->update([
                'sort_order' => $item['sort_order'],
            ]);
        }

        $this->activityLogger->log($request->user(), 'section.reordered', null, [
            'count' => count($data['items']),
        ]);

        return response()->json([
            'message' => 'レッスン表示順を更新しました。',
        ]);
    }

    private function validateSection(Request $request): array
    {
        $rules = [
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'type' => ['required', 'in:autojudge,webapp'],
            'sort_order' => ['nullable', 'integer'],
            'is_visible' => ['nullable', 'boolean'],
            'extra_text_enabled' => ['nullable', 'boolean'],
            'extra_text_label' => ['nullable', 'string', 'max:100'],
            'extra_text_required' => ['nullable', 'boolean'],
            'hints' => ['nullable', 'array', 'max:3'],
            'hints.*' => ['nullable', 'string'],
            'judge_config' => ['nullable'],
            'remove_pdf_ids' => ['nullable', 'array'],
            'remove_pdf_ids.*' => ['integer', 'exists:section_pdfs,id'],
            'pdfs' => ['nullable', 'array', 'max:5'],
            'pdfs.*' => ['file', 'mimes:pdf', 'max:20480'],
        ];

        $data = $request->validate($rules);
        $judgeConfig = $data['judge_config'] ?? $request->input('judge_config');

        if (is_string($judgeConfig) && trim($judgeConfig) !== '') {
            $decoded = json_decode($judgeConfig, true);
            if (! is_array($decoded)) {
                throw ValidationException::withMessages([
                    'judge_config' => 'judge_config は有効なJSONで指定してください。',
                ]);
            }
            $judgeConfig = $decoded;
        }

        if (($data['type'] ?? $request->input('type')) === Section::TYPE_WEBAPP) {
            if (! empty($data['extra_text_required']) && empty($data['extra_text_enabled'])) {
                throw ValidationException::withMessages([
                    'extra_text_required' => '追加テキスト必須を有効にするには、追加テキスト提出を有効化してください。',
                ]);
            }
        }

        if (($data['type'] ?? $request->input('type')) === Section::TYPE_AUTOJUDGE) {
            $this->validateJudgeConfig($judgeConfig);
        }

        $data['judge_config'] = is_array($judgeConfig) ? $judgeConfig : null;

        return $data;
    }

    private function validateJudgeConfig(mixed $judgeConfig): void
    {
        if (! is_array($judgeConfig)) {
            throw ValidationException::withMessages([
                'judge_config' => '自動判定課題では判定設定が必須です。',
            ]);
        }

        $allowed = $judgeConfig['allowed_languages'] ?? null;
        $cases = $judgeConfig['cases'] ?? null;

        if (! is_array($allowed) || empty($allowed)) {
            throw ValidationException::withMessages([
                'judge_config.allowed_languages' => 'allowed_languages は1件以上必要です。',
            ]);
        }

        foreach ($allowed as $language) {
            if (! in_array($language, ['php', 'javascript', 'python'], true)) {
                throw ValidationException::withMessages([
                    'judge_config.allowed_languages' => 'allowed_languages は php/javascript/python のみ利用できます。',
                ]);
            }
        }

        if (! is_array($cases) || empty($cases)) {
            throw ValidationException::withMessages([
                'judge_config.cases' => 'cases は1件以上必要です。',
            ]);
        }

        foreach ($cases as $case) {
            if (! is_array($case) || ! array_key_exists('stdin', $case) || ! array_key_exists('expected_stdout', $case)) {
                throw ValidationException::withMessages([
                    'judge_config.cases' => '各ケースに stdin / expected_stdout が必要です。',
                ]);
            }
        }
    }

    private function syncHints(Section $section, array $hints): void
    {
        SectionHint::query()->where('section_id', $section->id)->delete();

        $index = 1;
        foreach ($hints as $hint) {
            if (! is_string($hint) || trim($hint) === '') {
                continue;
            }

            SectionHint::query()->create([
                'section_id' => $section->id,
                'hint_order' => $index,
                'content' => trim($hint),
            ]);
            $index++;

            if ($index > 3) {
                break;
            }
        }
    }

    private function syncJudgeConfig(Section $section, ?array $judgeConfig): void
    {
        if ($section->type !== Section::TYPE_AUTOJUDGE) {
            $section->judgeConfig()->delete();

            return;
        }

        if ($judgeConfig === null) {
            return;
        }

        $section->judgeConfig()->updateOrCreate(
            ['section_id' => $section->id],
            ['config' => $judgeConfig],
        );
    }

    /**
     * @param  array<int, UploadedFile>|UploadedFile[]  $files
     */
    private function storePdfs(Section $section, array $files): void
    {
        if (empty($files)) {
            return;
        }

        $currentCount = $section->pdfs()->count();
        $incomingCount = count($files);

        if ($currentCount + $incomingCount > 5) {
            throw ValidationException::withMessages([
                'pdfs' => 'PDFは1レッスンあたり最大5ファイルまでです。',
            ]);
        }

        $order = (int) ($section->pdfs()->max('sort_order') ?? 0);

        foreach ($files as $file) {
            $order++;
            $storedPath = Storage::disk('s3')->putFile("sections/{$section->id}/pdfs", $file);

            SectionPdf::query()->create([
                'section_id' => $section->id,
                'file_key' => $storedPath,
                'file_name' => $file->getClientOriginalName(),
                'mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize() ?: 0,
                'sort_order' => $order,
            ]);
        }
    }
}
