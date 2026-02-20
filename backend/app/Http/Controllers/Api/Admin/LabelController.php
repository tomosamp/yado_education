<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Label;
use App\Models\UserLabel;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LabelController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function index(): JsonResponse
    {
        $labels = Label::query()
            ->withCount('userLabels')
            ->orderBy('name')
            ->paginate(50);

        return response()->json($labels);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:labels,name'],
            'is_permanent' => ['nullable', 'boolean'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $label = Label::query()->create([
            'name' => $data['name'],
            'is_permanent' => (bool) ($data['is_permanent'] ?? true),
            'start_date' => $data['start_date'] ?? null,
            'end_date' => $data['end_date'] ?? null,
        ]);

        $this->activityLogger->log($request->user(), 'label.created', $label);

        return response()->json([
            'message' => 'ラベルを作成しました。',
            'label' => $label,
        ], 201);
    }

    public function show(Label $label): JsonResponse
    {
        $label->load('userLabels.user');

        return response()->json([
            'label' => $label,
        ]);
    }

    public function update(Request $request, Label $label): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100', 'unique:labels,name,'.$label->id],
            'is_permanent' => ['required', 'boolean'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        ]);

        $label->update($data);

        $this->activityLogger->log($request->user(), 'label.updated', $label);

        return response()->json([
            'message' => 'ラベルを更新しました。',
            'label' => $label,
        ]);
    }

    public function destroy(Request $request, Label $label): JsonResponse
    {
        $label->delete();

        $this->activityLogger->log($request->user(), 'label.deleted', $label);

        return response()->json([
            'message' => 'ラベルを削除しました。',
        ]);
    }

    public function assign(Request $request, Label $label): JsonResponse
    {
        $data = $request->validate([
            'users' => ['required', 'array'],
            'users.*.user_id' => ['required', 'integer', 'exists:users,id'],
            'users.*.start_date' => ['nullable', 'date'],
            'users.*.end_date' => ['nullable', 'date'],
        ]);

        foreach ($data['users'] as $entry) {
            UserLabel::query()->updateOrCreate([
                'user_id' => $entry['user_id'],
                'label_id' => $label->id,
            ], [
                'start_date' => $entry['start_date'] ?? null,
                'end_date' => $entry['end_date'] ?? null,
            ]);
        }

        $this->activityLogger->log($request->user(), 'label.assigned', $label, [
            'count' => count($data['users']),
        ]);

        return response()->json([
            'message' => 'ユーザーへのラベル付与を更新しました。',
        ]);
    }
}
