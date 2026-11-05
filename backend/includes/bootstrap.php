<?php
/**
 * Shared bootstrap included by every API endpoint.
 */

// Never let PHP print HTML warnings/notices/errors into the response
// body — that's what turns a JSON API response into "Server returned
// non-JSON response" on the frontend. Errors are still logged instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

session_start();

// Browsers block "Access-Control-Allow-Origin: *" when the request uses
// credentials. For localhost/file-based usage, we explicitly allow the
// request origin (or the special "null" origin) and keep credentials enabled.
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = strtolower(parse_url($origin, PHP_URL_HOST) ?? '');
$allowedOrigin = '';

if ($origin === 'null' || $originHost === 'localhost' || $originHost === '127.0.0.1') {
    $allowedOrigin = $origin !== '' ? $origin : 'http://localhost';
} elseif ($origin !== '') {
    $allowedOrigin = $origin;
}

if ($allowedOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: http://localhost');
    header('Access-Control-Allow-Credentials: true');
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// If something fatal happens anywhere below (missing extension, typo,
// uncaught error), send valid JSON instead of a raw PHP/HTML error
// page, so the frontend never sees a non-JSON response.
register_shutdown_function(function () {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            http_response_code(500);
        }
        echo json_encode([
            'success' => false,
            'message' => 'Server error: ' . $error['message'],
            'data'    => null,
        ]);
    }
});

require_once __DIR__ . '/../config/db.php';

function resolve_request_method(): string {
    $method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

    if ($method === 'POST') {
        $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
        if ($override !== '') {
            return $override;
        }

        $override = strtoupper($_POST['_method'] ?? '');
        if ($override !== '') {
            return $override;
        }

        $override = strtoupper($_GET['_method'] ?? '');
        if ($override !== '') {
            return $override;
        }
    }

    return $method;
}

function json_body(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function respond(bool $success, $data = null, string $message = '', int $code = 200): void {
    http_response_code($code);
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data,
    ]);
    exit;
}

function require_login(): array {
    if (empty($_SESSION['user_id'])) {
        respond(false, null, 'Not authenticated. Please log in.', 401);
    }
    return [
        'id'    => $_SESSION['user_id'],
        'email' => $_SESSION['user_email'] ?? '',
        'role'  => $_SESSION['user_role'] ?? 'staff',
        'name'  => $_SESSION['user_name'] ?? '',
    ];
}
?>