<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function index(): JsonResponse
    {
        $categories = Category::query()
            ->withCount('sections')
            ->orderBy('sort_order')
            ->paginate(30);

        return response()->json($categories);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['nullable', 'integer'],
            'is_visible' => ['nullable', 'boolean'],
        ]);

        $category = Category::query()->create([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'sort_order' => (int) ($data['sort_order'] ?? 0),
            'is_visible' => (bool) ($data['is_visible'] ?? true),
        ]);

        $this->activityLogger->log($request->user(), 'category.created', $category);

        return response()->json([
            'message' => 'コースを作成しました。',
            'category' => $category,
        ], 201);
    }

    public function show(Category $category): JsonResponse
    {
        $category->load(['sections' => fn ($q) => $q->orderBy('sort_order')]);

        return response()->json([
            'category' => $category,
        ]);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'sort_order' => ['required', 'integer'],
            'is_visible' => ['required', 'boolean'],
        ]);

        $category->update($data);

        $this->activityLogger->log($request->user(), 'category.updated', $category);

        return response()->json([
            'message' => 'コースを更新しました。',
            'category' => $category,
        ]);
    }

    public function destroy(Request $request, Category $category): JsonResponse
    {
        $category->delete();

        $this->activityLogger->log($request->user(), 'category.deleted', $category);

        return response()->json([
            'message' => 'コースを削除しました。',
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:categories,id'],
            'items.*.sort_order' => ['required', 'integer'],
        ]);

        foreach ($data['items'] as $item) {
            Category::query()->where('id', $item['id'])->update([
                'sort_order' => $item['sort_order'],
            ]);
        }

        $this->activityLogger->log($request->user(), 'category.reordered', null, [
            'count' => count($data['items']),
        ]);

        return response()->json([
            'message' => '表示順を更新しました。',
        ]);
    }
}
