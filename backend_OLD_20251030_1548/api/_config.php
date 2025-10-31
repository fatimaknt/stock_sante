<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }

function db() {
	$host = 'localhost';
	$port = 8889; // MAMP default
	$user = 'root';
	$pass = 'root';
	$db   = 'stock_sante';
	$mysqli = new mysqli($host, $user, $pass, $db, $port);
	if ($mysqli->connect_errno) {
		http_response_code(500);
		echo json_encode(['error' => 'DB_CONNECT_ERROR', 'message' => $mysqli->connect_error]);
		exit;
	}
	$mysqli->set_charset('utf8mb4');
	return $mysqli;
}

function json_body() {
	$raw = file_get_contents('php://input');
	if (!$raw) return [];
	$decoded = json_decode($raw, true);
	return is_array($decoded) ? $decoded : [];
}

function ok($data, $code = 200) { http_response_code($code); echo json_encode($data); }
function fail($code, $message, $status = 400) { http_response_code($status); echo json_encode(['error' => $code, 'message' => $message]); exit; }
