<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_login();

if (resolve_request_method() !== 'GET') {
    respond(false, null, 'Method not allowed', 405);
}

try {
    $stmt = $pdo->query('CALL sp_dashboard_stats()');
    $stats = $stmt->fetch();
    respond(true, $stats);
} catch (PDOException $e) {
    respond(false, null, 'Database error: ' . $e->getMessage(), 500);
}
