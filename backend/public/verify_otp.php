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

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (empty($input)) {
        throw new Exception("No data received");
    }

    $user_email = trim($input['user_email'] ?? $input['email'] ?? '');
    $otp_code = trim($input['otp_code'] ?? $input['code'] ?? $input['otp'] ?? '');

    if (empty($user_email) || empty($otp_code)) {
        throw new Exception("Email and OTP code are required");
    }

    // Verify OTP from password_reset_otp table
    $sql = "SELECT * FROM password_reset_otp 
            WHERE email = ? AND otp_code = ? AND used = 0";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user_email, $otp_code]);
    $otp_record = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$otp_record) {
        throw new Exception("Invalid OTP code or already used");
    }

    // Mark OTP as used
    $update_sql = "UPDATE password_reset_otp SET used = 1, updated_at = NOW() WHERE id = ?";
    $update_stmt = $pdo->prepare($update_sql);
    $update_stmt->execute([$otp_record['id']]);

    echo json_encode([
        "success" => true,
        "message" => "OTP verified successfully"
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        "success" => false, 
        "message" => $e->getMessage()
    ]);
}
