<?php
require_once __DIR__ . '/../includes/bootstrap.php';
$user = require_login();

$method = resolve_request_method();

try {
    switch ($method) {

        case 'GET': {
            $stmt = $pdo->query('CALL sp_checkinout_list()');
            $rows = $stmt->fetchAll();
            respond(true, $rows);
            break;
        }

        // Check a car OUT (starts a test drive / reservation)
        case 'POST': {
            $b = json_body();
            $carId = (int)($b['car_id'] ?? 0);
            $name  = trim($b['customer_name'] ?? '');
            if (!$carId || $name === '') {
                respond(false, null, 'car_id and customer_name are required.', 422);
            }
            $purpose = in_array($b['purpose'] ?? '', ['test_drive', 'reservation'], true) ? $b['purpose'] : 'test_drive';
            $bookingId = isset($b['booking_id']) ? (int)$b['booking_id'] : null;

            $stmt = $pdo->prepare('CALL sp_checkout_car(:car_id, :customer_name, :customer_phone, :purpose, :notes, :handled_by, :booking_id)');
            $stmt->execute([
                'car_id'         => $carId,
                'customer_name'  => $name,
                'customer_phone' => $b['customer_phone'] ?? null,
                'purpose'        => $purpose,
                'notes'          => $b['notes'] ?? null,
                'handled_by'     => $user['id'],
                'booking_id'     => $bookingId,
            ]);
            $row = $stmt->fetch();
            $logId = $row['new_log_id'] ?? null;

            // If this checkout is linked to a confirmed booking, mark the
            // booking as completed so booking + checkout stay in sync.
            if ($bookingId) {
                while ($stmt->nextRowset()) {} // free result sets before next query
                $complete = $pdo->prepare('CALL sp_booking_complete(:id)');
                $complete->execute(['id' => $bookingId]);
                while ($complete->nextRowset()) {}
            }

            respond(true, ['id' => $logId, 'booking_id' => $bookingId], 'Car checked out.', 201);
            break;
        }

        // Check a car back IN (ends the test drive / reservation)
        case 'PUT': {
            $b = json_body();
            $logId = (int)($b['id'] ?? 0);
            if (!$logId) respond(false, null, 'Log id is required.', 422);

            $stmt = $pdo->prepare('CALL sp_checkin_car(:id)');
            $stmt->execute(['id' => $logId]);
            respond(true, null, 'Car checked back in.');
            break;
        }

        default:
            respond(false, null, 'Method not allowed', 405);
    }
} catch (PDOException $e) {
    respond(false, null, 'Database error: ' . $e->getMessage(), 500);
}
