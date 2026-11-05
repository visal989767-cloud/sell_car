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
$setupToken = trim($body['admin_setup_token'] ?? '');
$configuredSetupToken = getenv('INITIAL_ADMIN_SETUP_TOKEN') ?: '';

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

    $role = 'staff';
    $lockAcquired = false;
    if ($setupToken !== '') {
        if ($configuredSetupToken === '' || !hash_equals($configuredSetupToken, $setupToken)) {
            respond(false, null, 'The administrator setup code is invalid.', 403);
        }

        $lockStmt = $pdo->query("SELECT GET_LOCK('autostock_initial_admin', 10)");
        if ((int) $lockStmt->fetchColumn() !== 1) {
            respond(false, null, 'Could not reserve administrator setup. Please try again.', 503);
        }
        $lockAcquired = true;

        $adminCount = (int) $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'admin'")->fetchColumn();
        if ($adminCount > 0) {
            $pdo->query("SELECT RELEASE_LOCK('autostock_initial_admin')");
            $lockAcquired = false;
            respond(false, null, 'The initial administrator has already been created.', 409);
        }
        $role = 'admin';
    }

    $hash = password_hash($password, PASSWORD_BCRYPT);

    try {
        $stmt = $pdo->prepare('CALL sp_register_user(:full_name, :email, :password_hash, :role)');
        $stmt->execute([
            'full_name'     => $fullName,
            'email'         => $email,
            'password_hash' => $hash,
            'role'          => $role,
        ]);
        $row = $stmt->fetch();
        $stmt->closeCursor();
    } catch (PDOException $e) {
        if ($lockAcquired) {
            $pdo->query("SELECT RELEASE_LOCK('autostock_initial_admin')");
            $lockAcquired = false;
        }
        throw $e;
    }

    if ($lockAcquired) {
        $pdo->query("SELECT RELEASE_LOCK('autostock_initial_admin')");
        $lockAcquired = false;
    }

    respond(true, ['id' => $row['new_user_id'] ?? null], 'Account created successfully. You can now log in.', 201);
} catch (PDOException $e) {
    if (!empty($lockAcquired)) {
        $pdo->query("SELECT RELEASE_LOCK('autostock_initial_admin')");
    }
    error_log('Registration failed: ' . $e->getMessage());
    respond(false, null, 'Registration failed. Please try again.', 500);
}
