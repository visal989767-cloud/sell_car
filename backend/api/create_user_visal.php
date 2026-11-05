<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$email = 'visal@gmail.com';
$plainPassword = '12345';
$hashed = password_hash($plainPassword, PASSWORD_DEFAULT);

try {
    $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        echo "User '$email' already exists. Skipping.\n";
        echo "Password hash: " . $hashed . "\n";
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $hashed, 'admin', 'Visal Admin']);

    echo "✅ Test user created!\n";
    echo "   Email: $email\n";
    echo "   Password: $plainPassword\n";
    echo "   Role: admin\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}

