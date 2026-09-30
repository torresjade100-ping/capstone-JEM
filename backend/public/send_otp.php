<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once "db.php";

// Set correct timezone
date_default_timezone_set('Asia/Manila');

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        throw new Exception("No data received");
    }

    $user_email = trim($input['user_email'] ?? $input['email'] ?? '');

    if (empty($user_email)) {
        throw new Exception("Email is required");
    }

    // Check if email exists in residents or users table
    $user = null;
    $firstName = 'User';

    try {
        $hasResidents = $pdo->query("SHOW TABLES LIKE 'residents'")->fetch();
        if ($hasResidents) {
            $stmt = $pdo->prepare("SELECT id, firstName, email, mobile_username FROM residents WHERE email = ? AND mobile_account_status = 'active' AND has_mobile_account = 1");
            $stmt->execute([$user_email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && !empty($user['firstName'])) {
                $firstName = $user['firstName'];
            }
        }
    } catch (\Throwable $t) {}

    if (!$user) {
        try {
            $stmt = $pdo->prepare("SELECT id, name, email FROM users WHERE email = ?");
            $stmt->execute([$user_email]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && !empty($user['name'])) {
                $parts = explode(' ', trim($user['name']));
                $firstName = $parts[0] ?: 'User';
            }
        } catch (\Throwable $t) {}
    }

    if (!$user) {
        if (!filter_var($user_email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception("No active account found with this email address");
        }
        $firstName = 'Valued Customer';
    }

    // Generate 6-digit OTP
    $otp_code = sprintf("%06d", mt_rand(1, 999999));
    
    // Calculate expiry time correctly (15 minutes from now)
    $current_time = time();
    $expiry_time = date("Y-m-d H:i:s", $current_time + (15 * 60));
    
    error_log("Current time: " . date("Y-m-d H:i:s", $current_time));
    error_log("OTP expiry time: " . $expiry_time);
    error_log("OTP code: " . $otp_code);

    // Delete any existing OTP for this email
    $delete_sql = "DELETE FROM password_reset_otp WHERE email = ?";
    $delete_stmt = $pdo->prepare($delete_sql);
    $delete_stmt->execute([$user_email]);

    // Insert new OTP
    $insert_sql = "INSERT INTO password_reset_otp (email, otp_code, expiry_time, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())";
    $insert_stmt = $pdo->prepare($insert_sql);
    $insert_stmt->execute([$user_email, $otp_code, $expiry_time]);

    // Verify the OTP was inserted correctly
    $verify_sql = "SELECT * FROM password_reset_otp WHERE email = ? ORDER BY id DESC LIMIT 1";
    $verify_stmt = $pdo->prepare($verify_sql);
    $verify_stmt->execute([$user_email]);
    $inserted_otp = $verify_stmt->fetch(PDO::FETCH_ASSOC);
    
    error_log("Inserted OTP record: " . print_r($inserted_otp, true));

    // Send OTP via email using PHPMailer
    $email_sent = sendOTPEmail($user_email, $otp_code, $firstName);

    if ($email_sent) {
        echo json_encode([
            "success" => true,
            "message" => "OTP sent successfully to your email",
            "email" => $user_email,
            "debug_otp" => $otp_code
        ]);
    } else {
        // Even if email fails, return OTP for testing
        echo json_encode([
            "success" => true,
            "message" => "OTP generated (email failed)",
            "email" => $user_email,
            "debug_otp" => $otp_code
        ]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => $e->getMessage()
    ]);
}

function sendOTPEmail($email, $otp, $firstName) {
    $phpmailerDir = dirname(__DIR__) . '/vendor/phpmailer/phpmailer/src';
    if (file_exists($phpmailerDir . '/PHPMailer.php')) {
        require_once $phpmailerDir . '/Exception.php';
        require_once $phpmailerDir . '/PHPMailer.php';
        require_once $phpmailerDir . '/SMTP.php';
    } else {
        $autoload = dirname(__DIR__) . '/vendor/autoload.php';
        if (file_exists($autoload)) {
            require_once $autoload;
        }
    }
    
    if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
        $mail = new PHPMailer\PHPMailer\PHPMailer(true);
        try {
            // Server settings
            $mail->isSMTP();
            $mail->Host = 'smtp.gmail.com';
            $mail->SMTPAuth = true;
            $mail->Username = '35barangay@gmail.com';
            $mail->Password = 'sziq apba sink lsch';
            $mail->SMTPSecure = PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
            $mail->Port = 587;
            
            // Recipients
            $mail->setFrom('35barangay@gmail.com', 'Barangay 35');
            $mail->addAddress($email, $firstName);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = 'Password Reset OTP - Barangay 35 Mobile App';
            
            $mail->Body = "
            <html>
            <head>
                <title>Password Reset OTP</title>
                <style>
                    body { font-family: Arial, sans-serif; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #1034A6; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .otp-code { 
                        font-size: 32px; 
                        font-weight: bold; 
                        text-align: center; 
                        color: #1034A6;
                        margin: 20px 0;
                        letter-spacing: 5px;
                    }
                    .footer { padding: 20px; text-align: center; color: #666; }
                </style>
            </head>
            <body>
                <div class='container'>
                    <div class='header'>
                        <h2>Barangay 35 Mobile App</h2>
                    </div>
                    <div class='content'>
                        <h3>Password Reset Request</h3>
                        <p>Hello {$firstName},</p>
                        <p>You have requested to reset your password. Use the OTP code below to verify your identity:</p>
                        
                        <div class='otp-code'>{$otp}</div>
                        
                        <p>This OTP code will expire in 15 minutes.</p>
                        <p>If you didn't request this reset, please ignore this email.</p>
                    </div>
                    <div class='footer'>
                        <p>Best regards,<br>Barangay 35 Administration</p>
                    </div>
                </div>
            </body>
            </html>
            ";
            
            $mail->send();
            return true;
        } catch (\Throwable $e) {
            error_log("Mailer Error: " . $e->getMessage());
        }
    }
    
    // Fallback via Laravel mailer if available
    try {
        $appFile = dirname(__DIR__) . '/bootstrap/app.php';
        if (file_exists($appFile)) {
            $app = require_once $appFile;
            $kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
            $kernel->bootstrap();
            \Illuminate\Support\Facades\Mail::to($email)->send(new \App\Mail\OtpMail($otp, $firstName));
            return true;
        }
    } catch (\Throwable $t) {
        error_log("Laravel fallback Mailer Error: " . $t->getMessage());
    }

    return false;
}
