<?php
// تنظیم هدرها برای خروجی JSON و جلوگیری از خطای CORS (اگه نیاز شد)
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST");

require_once '../config/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // خواندن کاتالوگ
    $stmt = $pdo->prepare("SELECT setting_value FROM system_settings WHERE setting_key = 'catalog' LIMIT 1");
    $stmt->execute();
    $row = $stmt->fetch();
    
    if ($row) {
        // چون دیتا JSON ذخیره شده، مستقیم چاپش می‌کنیم
        echo $row['setting_value'];
    } else {
        echo json_encode([]);
    }
} 
elseif ($method === 'POST') {
    // دریافت دیتای JSON فرستاده شده از React
    $inputJSON = file_get_contents('php://input');
    
    // بررسی اینکه دیتای ارسالی واقعاً JSON معتبر باشه
    if (json_decode($inputJSON) !== null) {
        // Insert یا در صورت وجود Update
        $stmt = $pdo->prepare("INSERT INTO system_settings (setting_key, setting_value) VALUES ('catalog', :val) ON DUPLICATE KEY UPDATE setting_value = :val");
        $stmt->execute(['val' => $inputJSON]);
        
        echo json_encode(['success' => true, 'message' => 'کاتالوگ با موفقیت به‌روزرسانی شد.']);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'فرمت JSON نامعتبر است.']);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'متد درخواست مجاز نیست.']);
}
?>