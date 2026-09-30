<?php

namespace Tests\Feature;

use App\Mail\OtpMail;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class GoogleAuthOtpTest extends TestCase
{
    use RefreshDatabase;

    public function test_google_auth_creates_or_logs_in_user_directly_with_verified_email(): void
    {
        Mail::fake();

        $testEmail = 'contractor.test.' . time() . '@gmail.com';

        $response = $this->postJson('/api/auth/google', [
            'email' => $testEmail,
            'name' => 'Test Contractor',
            'google_id' => 'google_sub_123456789',
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

        // CRITICAL SECURITY: OTP must NEVER be exposed
        $this->assertArrayNotHasKey('debug_code', $response->json('data'));

        // User should exist in database, have google_id, and be pre-verified by Google
        $user = User::where('email', $testEmail)->first();
        $this->assertNotNull($user);
        $this->assertEquals('google_sub_123456789', $user->google_id);
        $this->assertNotNull($user->email_verified_at);

        // Google sign in does not require sending OTP verification email
        Mail::assertNothingSent();
    }

    public function test_otp_verification_rejects_incorrect_code(): void
    {
        $testEmail = 'contractor.fail.' . time() . '@gmail.com';

        User::create([
            'name' => 'Fail Tester',
            'email' => $testEmail,
            'phone' => '09170000001',
            'password' => Hash::make('secret'),
            'role' => 'customer',
            'status' => 'active',
        ]);

        EmailVerificationCode::create([
            'email' => $testEmail,
            'code_hash' => Hash::make('123456'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => $testEmail,
            'code' => '999999',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
            ]);

        $otpRecord = EmailVerificationCode::where('email', $testEmail)->first();
        $this->assertEquals(1, $otpRecord->attempts);
    }

    public function test_otp_verification_succeeds_and_marks_user_verified(): void
    {
        $testEmail = 'contractor.success.' . time() . '@gmail.com';

        $user = User::create([
            'name' => 'Success Tester',
            'email' => $testEmail,
            'phone' => '09170000002',
            'password' => Hash::make('secret'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => $testEmail,
            'code_hash' => Hash::make('654321'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => $testEmail,
            'code' => '654321',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonStructure([
                'data' => ['user', 'token']
            ]);

        $user->refresh();
        $this->assertNotNull($user->email_verified_at);

        // OTP record must be invalidated immediately after use to prevent replay attacks
        $this->assertNull(EmailVerificationCode::where('email', $testEmail)->first());
    }

    public function test_otp_verification_supports_otp_field_in_request(): void
    {
        $testEmail = 'contractor.otpfield.' . time() . '@gmail.com';

        User::create([
            'name' => 'OTP Field Tester',
            'email' => $testEmail,
            'phone' => '09170000004',
            'password' => Hash::make('secret'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => $testEmail,
            'code_hash' => Hash::make('445566'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => $testEmail,
            'otp' => '445566',
        ]);

        $response->assertStatus(200)->assertJson(['success' => true]);
        $this->assertNull(EmailVerificationCode::where('email', $testEmail)->first());
    }

    public function test_otp_verification_rejects_expired_code(): void
    {
        $testEmail = 'contractor.expired.' . time() . '@gmail.com';

        User::create([
            'name' => 'Expired Tester',
            'email' => $testEmail,
            'phone' => '09170000005',
            'password' => Hash::make('secret'),
            'role' => 'customer',
            'status' => 'active',
            'email_verified_at' => null,
        ]);

        EmailVerificationCode::create([
            'email' => $testEmail,
            'code_hash' => Hash::make('123123'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->subMinute(), // Expired
        ]);

        $response = $this->postJson('/api/auth/verify-otp', [
            'email' => $testEmail,
            'otp' => '123123',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'success' => false,
                'expired' => true,
            ]);

        // Expired record should be cleaned up
        $this->assertNull(EmailVerificationCode::where('email', $testEmail)->first());
    }

    public function test_resend_invalidates_previous_code_and_enforces_cooldown(): void
    {
        Mail::fake();

        $testEmail = 'contractor.resend.' . time() . '@gmail.com';

        User::create([
            'name' => 'Resend Tester',
            'email' => $testEmail,
            'phone' => '09170000003',
            'password' => Hash::make('secret'),
            'role' => 'customer',
            'status' => 'active',
        ]);

        // Code was created just now -> cooldown active
        EmailVerificationCode::create([
            'email' => $testEmail,
            'code_hash' => Hash::make('111111'),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/auth/resend-otp', [
            'email' => $testEmail,
        ]);

        $response->assertStatus(429)
            ->assertJson([
                'success' => false,
            ]);

        // Now simulate cooldown has passed (61 seconds ago)
        $code = EmailVerificationCode::where('email', $testEmail)->first();
        $code->updated_at = now()->subSeconds(61);
        $code->save();

        $resendResponse = $this->postJson('/api/auth/resend-otp', [
            'email' => $testEmail,
        ]);

        $resendResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        // OTP must not be exposed in resend response
        $this->assertArrayNotHasKey('debug_code', $resendResponse->json('data'));
    }
}
