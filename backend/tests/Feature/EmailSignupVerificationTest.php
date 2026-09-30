<?php

namespace Tests\Feature;

use App\Mail\OtpMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class EmailSignupVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_signup_request_code_validates_email_and_dispatches_otp_without_exposing_code(): void
    {
        Mail::fake();

        $email = 'john.builder.' . time() . '@gmail.com';

        $response = $this->postJson('/api/auth/signup/request-code', [
            'email' => $email,
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        // CRITICAL SECURITY: OTP must NEVER be exposed in the response
        $this->assertArrayNotHasKey('code', $response->json('data') ?? []);
        $this->assertArrayNotHasKey('otp', $response->json('data') ?? []);
        $this->assertArrayNotHasKey('debug_code', $response->json('data') ?? []);

        // Verification record in DB must have 10-minute expiry and hashed code
        $record = EmailVerificationCode::where('email', $email)->first();
        $this->assertNotNull($record);
        $this->assertEquals(0, $record->attempts);
        $this->assertTrue($record->expires_at->isFuture());
        $this->assertGreaterThan(500, now()->diffInSeconds($record->expires_at)); // ~600 seconds

        // Mail must be dispatched
        Mail::assertSent(OtpMail::class, function (OtpMail $mail) use ($email) {
            return $mail->hasTo($email) &&
                   $mail->envelope()->subject === 'Your verification code';
        });
    }

    public function test_signup_request_code_rejects_already_registered_email(): void
    {
        Mail::fake();

        $existingEmail = 'existing.contractor@jemhardware.ph';
        User::create([
            'name' => 'Existing Contractor',
            'email' => $existingEmail,
            'password' => Hash::make('password123'),
            'role' => 'customer',
            'status' => 'active',
        ]);

        $response = $this->postJson('/api/auth/signup/request-code', [
            'email' => $existingEmail,
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertStringContainsString('already registered', strtolower($response->json('message')));
        Mail::assertNothingSent();
    }

    public function test_signup_verify_code_rejects_invalid_code(): void
    {
        $email = 'test.verify.invalid@gmail.com';

        EmailVerificationCode::create([
            'email' => $email,
            'code_hash' => Hash::make('847291'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/auth/signup/verify-code', [
            'email' => $email,
            'code' => '000000',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'Invalid verification code. Please try again.',
            ]);

        $record = EmailVerificationCode::where('email', $email)->first();
        $this->assertEquals(1, $record->attempts);
        $this->assertNull($record->verified_at);
    }

    public function test_signup_verify_code_rejects_expired_code(): void
    {
        $email = 'test.verify.expired@gmail.com';

        EmailVerificationCode::create([
            'email' => $email,
            'code_hash' => Hash::make('847291'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->subMinute(), // Expired
        ]);

        $response = $this->postJson('/api/auth/signup/verify-code', [
            'email' => $email,
            'code' => '847291',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'message' => 'This verification code has expired. Please request a new code.',
            ]);
    }

    public function test_signup_verify_code_success_marks_verified_at(): void
    {
        $email = 'test.verify.success@gmail.com';

        EmailVerificationCode::create([
            'email' => $email,
            'code_hash' => Hash::make('654321'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
        ]);

        $response = $this->postJson('/api/auth/signup/verify-code', [
            'email' => $email,
            'code' => '654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $record = EmailVerificationCode::where('email', $email)->first();
        $this->assertNotNull($record->verified_at);
        $this->assertTrue($record->isVerified());
    }

    public function test_complete_signup_requires_verified_email(): void
    {
        $email = 'unverified.signup@gmail.com';

        // Attempting to complete signup without prior verification
        $response = $this->postJson('/api/auth/signup/complete', [
            'email' => $email,
            'name' => 'Unverified User',
            'password' => 'secret123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertStringContainsString('verify', strtolower($response->json('message')));
        $this->assertNull(User::where('email', $email)->first());
    }

    public function test_complete_signup_succeeds_only_after_verified_code(): void
    {
        $email = 'completed.signup@gmail.com';

        // Code was successfully verified
        EmailVerificationCode::create([
            'email' => $email,
            'code_hash' => Hash::make('999999'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(10),
            'verified_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/signup/complete', [
            'email' => $email,
            'name' => 'Maria Contractor',
            'password' => 'Password123!',
            'phone' => '09181234567',
        ]);

        $this->assertTrue(in_array($response->status(), [200, 201]));
        $response->assertJson([
            'success' => true,
        ])
        ->assertJsonStructure([
            'data' => [
                'user' => ['id', 'name', 'email', 'phone', 'role'],
                'token',
            ]
        ]);

        // User should exist in database and be email-verified
        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);
        $this->assertEquals('Maria Contractor', $user->name);
        $this->assertEquals('09181234567', $user->phone);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('Password123!', $user->password));

        // OTP record should be consumed/deleted
        $this->assertNull(EmailVerificationCode::where('email', $email)->first());
    }

    public function test_signup_resend_enforces_60_second_cooldown(): void
    {
        Mail::fake();

        $email = 'resend.cooldown@gmail.com';

        // First request
        $this->postJson('/api/auth/signup/request-code', [
            'email' => $email,
        ])->assertStatus(200);

        // Immediate resend attempt (within 60s cooldown)
        $resendResponse = $this->postJson('/api/auth/signup/resend-code', [
            'email' => $email,
        ]);

        $resendResponse->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);

        $this->assertStringContainsString('wait', strtolower($resendResponse->json('message')));
    }

    public function test_google_signin_logs_in_directly_without_otp(): void
    {
        $email = 'google.user@gmail.com';

        $response = $this->postJson('/api/auth/google', [
            'email' => $email,
            'name' => 'Google User',
            'google_id' => 'gid_987654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'name', 'email', 'role'],
                    'token',
                ]
            ]);

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
        $this->assertEquals('gid_987654321', $user->google_id);
    }
}
