<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Section;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['nullable', 'boolean'],
        ]);

        $user = \App\Models\User::query()->where('email', $credentials['email'])->first();
        if (! $user || ! $user->is_active) {
            return response()->json([
                'message' => 'メールアドレスまたはパスワードが正しくありません。',
            ], 422);
        }

        if (! Auth::attempt([
            'email' => $credentials['email'],
            'password' => $credentials['password'],
        ], (bool) ($credentials['remember'] ?? false))) {
            return response()->json([
                'message' => 'メールアドレスまたはパスワードが正しくありません。',
            ], 422);
        }

        if (! $request->hasSession()) {
            Auth::guard('web')->logout();

            return response()->json([
                'message' => 'ログイン元URLが許可されていません。localhost / 127.0.0.1 / 0.0.0.0 でアクセスしてください。',
            ], 400);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function devLogin(Request $request): JsonResponse
    {
        if (! app()->environment('local')) {
            abort(404);
        }

        $this->ensureLocalDevFixtures();

        $data = $request->validate([
            'role' => ['required', 'in:user,reviewer,admin'],
        ]);

        $user = User::query()
            ->where('role', $data['role'])
            ->where('is_active', true)
            ->orderBy('id')
            ->first();

        if (! $user) {
            $seed = match ($data['role']) {
                User::ROLE_USER => [
                    'email' => 'user@example.com',
                    'name' => '受講者ユーザー',
                ],
                User::ROLE_REVIEWER => [
                    'email' => 'reviewer@example.com',
                    'name' => 'レビューユーザー',
                ],
                User::ROLE_ADMIN => [
                    'email' => 'admin@test.com',
                    'name' => '管理者ユーザー',
                ],
                default => null,
            };

            if (! is_array($seed)) {
                return response()->json([
                    'message' => '該当ロールの有効ユーザーが存在しません。',
                ], 422);
            }

            $user = User::query()->updateOrCreate([
                'email' => $seed['email'],
            ], [
                'name' => $seed['name'],
                'password' => 'password',
                'role' => $data['role'],
                'is_active' => true,
                'email_verified_at' => now(),
            ]);
        }

        Auth::login($user, true);

        if (! $request->hasSession()) {
            Auth::guard('web')->logout();

            return response()->json([
                'message' => 'ログイン元URLが許可されていません。localhost / 127.0.0.1 / 0.0.0.0 でアクセスしてください。',
            ], 400);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $request->user(),
        ]);
    }

    private function ensureLocalDevFixtures(): void
    {
        $hasAdmin = User::query()->where('role', User::ROLE_ADMIN)->where('is_active', true)->exists();
        $hasReviewer = User::query()->where('role', User::ROLE_REVIEWER)->where('is_active', true)->exists();
        $hasLearner = User::query()->where('role', User::ROLE_USER)->where('is_active', true)->exists();
        $hasSection = Section::query()->exists();

        if ($hasAdmin && $hasReviewer && $hasLearner && $hasSection) {
            return;
        }

        app(DatabaseSeeder::class)->run();
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $request->user(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([
            'message' => 'ログアウトしました。',
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
        ]);

        $user->name = $data['name'];
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        $user->save();

        return response()->json([
            'user' => $user,
            'message' => 'マイページ情報を更新しました。',
        ]);
    }
}
