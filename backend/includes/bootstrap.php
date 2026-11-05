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

$isHttps = (
    (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
    || ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https'
);
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'secure' => strtolower(getenv('APP_ENV') ?: '') === 'production' || $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);
session_start();

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originHost = strtolower(parse_url($origin, PHP_URL_HOST) ?? '');
$allowedOrigins = array_filter(array_map(
    'trim',
    explode(',', getenv('CORS_ALLOWED_ORIGINS') ?: '')
));
$allowedOrigin = '';

if (
    $origin !== ''
    && (
        $originHost === 'localhost'
        || $originHost === '127.0.0.1'
        || in_array($origin, $allowedOrigins, true)
    )
) {
    $allowedOrigin = $origin;
}

if ($allowedOrigin !== '') {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-HTTP-Method-Override');

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
            'message' => 'Server error.',
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