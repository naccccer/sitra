<?php
session_start();

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: http://localhost:3000"); 
header("Access-Control-Allow-Credentials: true");

// پاک کردن کل دیتای سشن
$_SESSION = array();

// نابود کردن کامل سشن
session_destroy();

echo json_encode(['success' => true, 'message' => 'با موفقیت خارج شدید.']);
?>