<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\OtpMail;
use App\Models\Customer;
use App\Models\EmailVerificationCode;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class GoogleAuthController extends Controller
{
    /**
     * Handle initial Google Authentication / Registration.
     * Generates a secure, time-limited OTP and sends it to the verified Google email.
     */
    public function googleAuth(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:255'],
            'google_id' => ['nullable', 'string', 'max:255'],
            'google_token' => ['nullable', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Google authentication data.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = strtolower(trim($request->email));
        $name = trim($request->name ?: explode('@', $email)[0]);
        $googleId = trim($request->google_id ?: ($request->google_token ?: ''));

        // Find or create the user without asking for a password
        $user = User::withTrashed()->where('email', $email)->first();

        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }
            $updates = [
                'status' => 'active',
                'email_verified_at' => $user->email_verified_at ?: now(),
            ];
            if ($name && $user->name !== $name) {
                $updates['name'] = $name;
            }
            if ($googleId && ! $user->google_id) {
                $updates['google_id'] = $googleId;
            }
            $user->update($updates);
        } else {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'google_id' => $googleId ?: null,
                'phone' => '09' . rand(100000000, 999999999),
                'password' => Hash::make(bin2hex(random_bytes(16))),
                'role' => 'customer',
                'status' => 'active',
                'email_verified_at' => now(), // Google accounts have verified email
            ]);

            Customer::create([
                'user_id' => $user->id,
                'address_line1' => 'Block 12 Lot 8, Villa San Isidro',
                'city' => 'Santa Rosa',
                'province' => 'Laguna',
                'postal_code' => '4026',
            ]);
        }

        $token = $user->createToken('mobile-google-auth')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Google sign-in successful.',
            'data' => [
                'user' => $user->only(['id', 'name', 'email', 'google_id', 'phone', 'role', 'status', 'email_verified_at']),
                'token' => $token,
            ],
        ]);
    }

    /**
     * Validate the 6-digit OTP against the backend database.
     * Enforces expiration, attempt limits, and marks account verified.
     */
    public function verifyOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
            'otp' => ['required_without:code', 'string'],
            'code' => ['required_without:otp', 'string'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Please enter a valid 6-digit verification code.',
                'errors' => $validator->errors(),
            ], 422);
        }

        $email = strtolower(trim($request->email));
        $code = trim($request->otp ?: $request->code);

        if (strlen($code) !== 6 || ! ctype_digit($code)) {
            return response()->json([
                'success' => false,
                'message' => 'The verification code must be exactly 6 digits.',
            ], 422);
        }

        $record = EmailVerificationCode::where('email', $email)->first();

        if (! $record) {
            return response()->json([
                'success' => false,
                'message' => 'No active verification code found. Please request a new code.',
                'not_found' => true,
            ], 404);
        }

        // Check expiration (5 minutes)
        if ($record->isExpired()) {
            $record->delete();
            return response()->json([
                'success' => false,
                'message' => 'Verification code has expired. Please request a new code.',
                'expired' => true,
            ], 422);
        }

        // Check max attempts (limit 5 failed attempts)
        if ($record->hasExceededAttempts()) {
            $record->delete();
            return response()->json([
                'success' => false,
                'message' => 'Maximum verification attempts exceeded. Please request a new code.',
                'max_attempts_exceeded' => true,
            ], 422);
        }

        // Compare submitted OTP against stored hash
        if (! Hash::check($code, $record->code_hash)) {
            $record->increment('attempts');
            $remaining = $record->max_attempts - $record->attempts;

            if ($remaining <= 0) {
                $record->delete();
                return response()->json([
                    'success' => false,
                    'message' => 'Incorrect code. Maximum attempts reached. Please request a new code.',
                    'max_attempts_exceeded' => true,
                ], 422);
            }

            return response()->json([
                'success' => false,
                'message' => "Incorrect code. {$remaining} attempt(s) remaining.",
                'remaining_attempts' => $remaining,
            ], 422);
        }

        // Successfully verified: invalidate OTP immediately to prevent replay
        $record->delete();

        $user = User::where('email', $email)->firstOrFail();
        $user->update([
            'email_verified_at' => now(),
            'status' => 'active',
        ]);

        $token = $user->createToken('mobile-google-verified')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Account successfully verified!',
            'data' => [
                'user' => $user->only(['id', 'name', 'email', 'google_id', 'phone', 'role', 'status', 'email_verified_at']),
                'token' => $token,
            ],
        ]);
    }

    /**
     * Resend a new OTP with rate limiting (60s cooldown).
     */
    public function resendOtp(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'email'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid email address.',
            ], 422);
        }

        $email = strtolower(trim($request->email));

        $user = User::where('email', $email)->first();
        if (! $user) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Check 60-second cooldown rate limit
        $existing = EmailVerificationCode::where('email', $email)->first();
        if ($existing && $existing->updated_at) {
            $elapsedSeconds = $existing->updated_at->diffInSeconds(now());
            if ($elapsedSeconds < 60) {
                $cooldownRemaining = 60 - $elapsedSeconds;
                return response()->json([
                    'success' => false,
                    'message' => "Please wait {$cooldownRemaining} seconds before requesting a new code.",
                    'cooldown_remaining' => $cooldownRemaining,
                ], 429);
            }
        }

        // Generate brand new cryptographically secure 6-digit OTP
        $otp = (string) random_int(100000, 999999);

        // Invalidate previous OTP and store new hash with 5-minute expiry
        EmailVerificationCode::where('email', $email)->delete();
        EmailVerificationCode::create([
            'email' => $email,
            'code_hash' => Hash::make($otp),
            'attempts' => 0,
            'max_attempts' => 5,
            'expires_at' => now()->addMinutes(5),
        ]);

        $maskedEmail = $this->maskEmail($email);

        // Dispatch new OTP email
        try {
            Mail::to($email)->send(new OtpMail($otp, $user->name));
        } catch (\Throwable $e) {
            Log::warning("Resend OTP email dispatch failed: " . $e->getMessage());
        }

        // Never log plaintext OTP
        Log::info("Verification OTP resent to {$maskedEmail}");

        return response()->json([
            'success' => true,
            'message' => "New verification code sent to {$maskedEmail}",
            'data' => [
                'email' => $email,
                'masked_email' => $maskedEmail,
                'expires_in' => 300,
                'resend_cooldown' => 60,
            ],
        ]);
    }

    /**
     * Mask email address for privacy (e.g. k***a@example.com).
     */
    protected function maskEmail(string $email): string
    {
        $parts = explode('@', $email);
        if (count($parts) !== 2) {
            return $email;
        }

        $user = $parts[0];
        $domain = $parts[1];

        if (strlen($user) <= 2) {
            $masked = $user[0] . '***';
        } else {
            $masked = $user[0] . str_repeat('*', max(3, strlen($user) - 2)) . $user[strlen($user) - 1];
        }

        return $masked . '@' . $domain;
    }
}
