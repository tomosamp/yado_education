<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invitation;
use App\Models\User;
use App\Models\UserLabel;
use App\Services\ActivityLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class InvitationAcceptController extends Controller
{
    public function __construct(
        private readonly ActivityLogger $activityLogger,
    ) {
    }

    public function accept(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'name' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $invitation = Invitation::query()
            ->where('token', $data['token'])
            ->where('email', $data['email'])
            ->first();

        if (! $invitation || ! $invitation->isUsable()) {
            return response()->json([
                'message' => '招待リンクが無効、または期限切れです。',
            ], 422);
        }

        if (User::query()->where('email', $data['email'])->exists()) {
            return response()->json([
                'message' => 'このメールアドレスは既に登録されています。',
            ], 422);
        }

        $user = DB::transaction(function () use ($data, $invitation) {
            $user = User::query()->create([
                'email' => $data['email'],
                'name' => $data['name'],
                'password' => $data['password'],
                'role' => $invitation->role,
                'is_active' => true,
                'email_verified_at' => now(),
            ]);

            if ($invitation->role === User::ROLE_USER && $invitation->label_id) {
                $label = $invitation->label;
                if ($label) {
                    UserLabel::query()->create([
                        'user_id' => $user->id,
                        'label_id' => $label->id,
                        'start_date' => $label->is_permanent ? null : $label->start_date,
                        'end_date' => $label->is_permanent ? null : $label->end_date,
                    ]);
                }
            }

            $invitation->update([
                'accepted_at' => now(),
            ]);

            return $user;
        });

        Auth::login($user);

        $this->activityLogger->log($user, 'invitation.accepted', $user, [
            'invitation_id' => $invitation->id,
        ]);

        return response()->json([
            'message' => '初期設定が完了しました。',
            'user' => $user,
        ]);
    }
}
