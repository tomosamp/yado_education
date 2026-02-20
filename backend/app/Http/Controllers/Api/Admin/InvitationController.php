<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class InvitationController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function index(): JsonResponse
    {
        $invitations = Invitation::query()
            ->with(['invitedBy', 'label'])
            ->latest('created_at')
            ->paginate(20);

        return response()->json($invitations);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'role' => ['required', 'in:user,reviewer,admin'],
            'label_id' => ['nullable', 'integer', 'exists:labels,id'],
            'expires_in_days' => ['nullable', 'integer', 'between:1,30'],
        ]);

        if ($data['role'] === 'user' && empty($data['label_id'])) {
            return response()->json([
                'message' => '受講者を招待する場合はラベル選択が必須です。',
                'errors' => [
                    'label_id' => ['受講者を招待する場合はラベル選択が必須です。'],
                ],
            ], 422);
        }

        $invitation = Invitation::query()->create([
            'email' => $data['email'],
            'role' => $data['role'],
            'label_id' => $data['role'] === 'user' ? ($data['label_id'] ?? null) : null,
            'token' => hash('sha256', Str::random(80)),
            'invited_by' => $request->user()->id,
            'expires_at' => now()->addDays((int) ($data['expires_in_days'] ?? 7)),
        ]);

        $acceptUrl = rtrim(config('app.frontend_url'), '/').'/accept-invitation?token='.$invitation->token.'&email='.urlencode($invitation->email);

        Mail::raw("社内教育システムへの招待です。\n\n以下のURLから初期設定を完了してください。\n{$acceptUrl}\n\n有効期限: {$invitation->expires_at->toDateTimeString()}", function ($message) use ($invitation) {
            $message->to($invitation->email)
                ->subject('【社内教育システム】招待のお知らせ');
        });

        $this->activityLogger->log($request->user(), 'invitation.created', $invitation, [
            'email' => $invitation->email,
            'role' => $invitation->role,
        ]);

        return response()->json([
            'message' => '招待メールを送信しました。',
            'invitation' => $invitation,
            'accept_url' => $acceptUrl,
        ], 201);
    }
}
