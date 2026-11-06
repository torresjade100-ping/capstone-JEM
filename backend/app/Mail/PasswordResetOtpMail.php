<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PasswordResetOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $otp;
    public string $name;

    public function __construct(string $otp, string $name = 'Valued Customer')
    {
        $this->otp = $otp;
        $this->name = $name;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Password Reset OTP - JEM Hardware',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        $safeName = htmlspecialchars($this->name, ENT_QUOTES, 'UTF-8');
        return <<<HTML
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Password Reset OTP - JEM Hardware</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1320; color: #ffffff; padding: 24px; margin: 0;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #0f1a2e; border: 1px solid #1e2c42; border-radius: 12px; padding: 32px; text-align: center;">
        <div style="display: inline-block; background-color: #f97316; color: #ffffff; font-weight: 800; font-size: 16px; border-radius: 8px; padding: 6px 14px; margin-bottom: 20px; letter-spacing: 0.5px;">
            JEM HARDWARE
        </div>
        <h2 style="color: #ffffff; margin-top: 0; font-size: 22px;">Password Reset Request</h2>
        <p style="color: #94a3b8; font-size: 14px; line-height: 22px; margin-bottom: 6px;">
            Hi {$safeName},
        </p>
        <p style="color: #94a3b8; font-size: 14px; line-height: 22px;">
            We received a request to reset your password. Use the 6-digit verification code below to proceed:
        </p>
        <div style="background-color: #162338; border: 1px solid #f97316; border-radius: 10px; padding: 18px 24px; margin: 24px 0; display: inline-block;">
            <span style="font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #f97316; font-family: monospace;">
                {$this->otp}
            </span>
        </div>
        <p style="color: #cbd5e1; font-size: 13.5px; line-height: 20px; margin-bottom: 10px;">
            This code will expire in <strong>15 minutes</strong>.
        </p>
        <p style="color: #64748b; font-size: 12.5px; line-height: 18px;">
            If you did not request a password reset, please ignore this email or make sure your account is secure.
        </p>
        <hr style="border: none; border-top: 1px solid #1e2c42; margin: 24px 0;">
        <p style="color: #475569; font-size: 11px; margin-bottom: 0;">
            &copy; 2026 JEM Hardware, Coco Lumber & Construction Supply. All rights reserved.
        </p>
    </div>
</body>
</html>
HTML;
    }
}
