<?php
require_once __DIR__ . '/../includes/bootstrap.php';

$email = 'visal';
$plainPassword = 'visal123';
$hashed = password_hash($plainPassword, PASSWORD_DEFAULT);

try {
    $check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $check->execute([$email]);
    if ($check->fetch()) {
        echo "User '$email' already exists. Skipping.\n";
        exit;
    }

    $stmt = $pdo->prepare('INSERT INTO users (email, password_hash, role, full_name) VALUES (?, ?, ?, ?)');
    $stmt->execute([$email, $hashed, 'staff', 'Visal Dealer']);

    echo "✅ Test user created!\n";
    echo "   Email: $email\n";
    echo "   Password: $plainPassword\n";
    echo "   Role: staff\n";
} catch (PDOException $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?>