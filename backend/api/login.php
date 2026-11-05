<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
if ($method === 'POST') {
    $override = strtoupper($_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE'] ?? '');
    if ($override !== '') {
        $method = $override;
    } else {
        $override = strtoupper($_POST['_method'] ?? '');
        if ($override !== '') {
            $method = $override;
        } else {
            $override = strtoupper($_GET['_method'] ?? '');
            if ($override !== '') {
                $method = $override;
            }
        }
    }
}

if ($method !== 'POST') {
    respond(false, null, 'Method not allowed', 405);
}

// Try JSON first, fallback to $_POST
$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
    $email    = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';
} else {
    $email    = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';
}

if ($email === '' || $password === '') {
    respond(false, null, 'Email and password are required.', 422);
}

try {
   $stmt = $pdo->prepare('SELECT id, email, password_hash, role, full_name FROM users WHERE email = :email');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(false, null, 'Invalid email or password.', 401);
    }

$_SESSION['user_id']    = $user['id'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_role']  = $user['role'];
    $_SESSION['user_name']  = $user['full_name'];

    // Record this login so it can be checked in the database later.
    try {
        $ip = $_SERVER['REMOTE_ADDR'] ?? null;
        $logStmt = $pdo->prepare('INSERT INTO login_log (user_id, full_name, email, role, ip_address) VALUES (:user_id, :full_name, :email, :role, :ip)');
        $logStmt->execute([
            'user_id'   => $user['id'],
            'full_name' => $user['full_name'],
            'email'     => $user['email'],
            'role'      => $user['role'],
            'ip'        => $ip,
        ]);
    } catch (PDOException $e) {
        // Login logging is best-effort; never block a successful login if the
        // login_log table doesn't exist yet.
    }

    respond(true, [
        'id'    => $user['id'],
        'name'  => $user['full_name'],
        'email' => $user['email'],
        'role'  => $user['role'],
    ], 'Login successful.');
} catch (PDOException $e) {
    respond(false, null, 'Login failed: ' . $e->getMessage(), 500);
}
?>