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

$body = json_body();
$fullName = trim($body['full_name'] ?? '');
$email    = trim($body['email'] ?? '');
$password = $body['password'] ?? '';
$role     = in_array($body['role'] ?? '', ['admin', 'staff'], true) ? $body['role'] : 'staff';

if ($fullName === '' || $email === '' || $password === '') {
    respond(false, null, 'Full name, email and password are required.', 422);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, null, 'Please enter a valid email address.', 422);
}
if (strlen($password) < 6) {
    respond(false, null, 'Password must be at least 6 characters.', 422);
}

try {
    $stmt = $pdo->prepare('CALL sp_get_user_by_email(:email)');
    $stmt->execute(['email' => $email]);
    if ($stmt->fetch()) {
        respond(false, null, 'An account with this email already exists.', 409);
    }
    $stmt->closeCursor();

    $hash = password_hash($password, PASSWORD_BCRYPT);

    $stmt = $pdo->prepare('CALL sp_register_user(:full_name, :email, :password_hash, :role)');
    $stmt->execute([
        'full_name'     => $fullName,
        'email'         => $email,
        'password_hash' => $hash,
        'role'          => $role,
    ]);
    $row = $stmt->fetch();

    respond(true, ['id' => $row['new_user_id'] ?? null], 'Account created successfully. You can now log in.', 201);
} catch (PDOException $e) {
    respond(false, null, 'Registration failed: ' . $e->getMessage(), 500);
}
