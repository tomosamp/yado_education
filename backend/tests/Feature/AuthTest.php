<?php

namespace Tests\Feature;

use App\Models\Invitation;
use App\Models\Label;
use App\Models\User;
use App\Models\UserLabel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_invitation_accept_creates_user(): void
    {
        $invitation = Invitation::query()->create([
            'email' => 'newuser@example.com',
            'role' => User::ROLE_USER,
            'token' => 'token-123',
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/invitations/accept', [
            'token' => $invitation->token,
            'email' => $invitation->email,
            'name' => '新規ユーザー',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('users', [
            'email' => 'newuser@example.com',
            'name' => '新規ユーザー',
            'role' => User::ROLE_USER,
        ]);

        $this->assertDatabaseHas('invitations', [
            'id' => $invitation->id,
        ]);
        $this->assertNotNull($invitation->fresh()->accepted_at);
    }

    public function test_inactive_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'inactive@example.com',
            'password' => 'password123',
            'is_active' => false,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'inactive@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_admin_inviting_user_requires_label(): void
    {
        $admin = User::factory()->create([
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
        ]);

        $response = $this
            ->actingAs($admin)
            ->postJson('/api/admin/invitations', [
                'email' => 'invite-target@example.com',
                'role' => User::ROLE_USER,
            ]);

        $response->assertStatus(422);
        $response->assertJsonPath('errors.label_id.0', '受講者を招待する場合はラベル選択が必須です。');
    }

    public function test_accepting_user_invitation_assigns_label(): void
    {
        $label = Label::query()->create([
            'name' => '2026新人',
            'is_permanent' => false,
            'start_date' => '2026-04-01',
            'end_date' => '2027-03-31',
        ]);

        $invitation = Invitation::query()->create([
            'email' => 'newlearner@example.com',
            'role' => User::ROLE_USER,
            'label_id' => $label->id,
            'token' => 'token-user-123',
            'expires_at' => now()->addDay(),
        ]);

        $response = $this->postJson('/api/invitations/accept', [
            'token' => $invitation->token,
            'email' => $invitation->email,
            'name' => '新規受講者',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ]);

        $response->assertOk();

        $user = User::query()->where('email', $invitation->email)->firstOrFail();

        $this->assertDatabaseHas('user_labels', [
            'user_id' => $user->id,
            'label_id' => $label->id,
            'start_date' => '2026-04-01 00:00:00',
            'end_date' => '2027-03-31 00:00:00',
        ]);

        $this->assertNotNull(UserLabel::query()->where('user_id', $user->id)->where('label_id', $label->id)->first());
    }
}
