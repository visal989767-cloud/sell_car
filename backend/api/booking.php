<?php
/**
 * Booking & Payment API
 * 
 * GET    /booking.php          – List all bookings
 * GET    /booking.php?id=N     – Get single booking
 * POST   /booking.php          – Create booking (with simulated payment)
 * PUT    /booking.php          – Update booking status
 * DELETE /booking.php?id=N     – Cancel / delete booking
 */
require_once __DIR__ . '/../includes/bootstrap.php';
require_login();

$method = resolve_request_method();

try {
    switch ($method) {

        // ---- LIST or GET single booking ----
        case 'GET': {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;
            if ($id) {
                $stmt = $pdo->prepare('CALL sp_booking_get(:id)');
                $stmt->execute(['id' => $id]);
                $booking = $stmt->fetch();
                if (!$booking) respond(false, null, 'Booking not found.', 404);
                respond(true, $booking);
            } else {
                // Use direct query to avoid multi-resultset complexity with stored procedures
                $sql = 'SELECT b.id, b.car_id, c.vin, c.make, c.model, c.year, c.price, c.plate_number,
                               b.customer_name, b.customer_email, b.customer_phone,
                               b.total_amount, b.payment_method, b.payment_status, b.booking_status,
                               b.notes, b.created_at, b.updated_at
                        FROM bookings b
                        JOIN cars c ON c.id = b.car_id
                        ORDER BY b.created_at DESC';
                $stmt = $pdo->query($sql);
                $bookings = $stmt->fetchAll();
                respond(true, $bookings);
            }
            break;
        }

// ---- CREATE booking with payment simulation ----
        case 'POST': {
            $b = json_body();

            $carId         = (int)($b['car_id'] ?? 0);
            $customerName  = trim($b['customer_name'] ?? '');
            $customerEmail = trim($b['customer_email'] ?? '');
            $customerPhone = trim($b['customer_phone'] ?? '');
            $paymentMethod = $b['payment_method'] ?? 'credit_card';
            $notes         = trim($b['notes'] ?? '');

            // Card details for simulated payment
            $cardNumber   = preg_replace('/\s+/', '', $b['card_number'] ?? '');
            $cardExpiry   = $b['card_expiry'] ?? '';
            $cardCvv      = $b['card_cvv'] ?? '';

            if (!$carId || $customerName === '') {
                respond(false, null, 'car_id and customer_name are required.', 422);
            }

            // The price is ALWAYS taken from the vehicle's listed price in the
            // database. The client-supplied total_amount is ignored so the user
            // cannot tamper with the price when buying a car.
            $priceStmt = $pdo->prepare('SELECT price FROM cars WHERE id = :id LIMIT 1');
            $priceStmt->execute(['id' => $carId]);
            $carRow = $priceStmt->fetch();
            if (!$carRow) {
                respond(false, null, 'Selected vehicle not found.', 404);
            }
            $totalAmount = (float)$carRow['price'];

            if ($totalAmount <= 0) {
                respond(false, null, 'The vehicle has an invalid price.', 422);
            }

            // Card details are only required for card-based payment methods.
            // QR / Wing Bank / ABA Bank / Cash / Bank Transfer don't send card
            // details, so validate card fields ONLY when a card method is used.
            $isCardPayment = in_array($paymentMethod, ['credit_card', 'debit_card'], true);

            if ($isCardPayment) {
                // Simulated payment: any card number with at least 8 digits is accepted.
                if (strlen($cardNumber) < 8) {
                    respond(false, null, 'Invalid card number.', 422);
                }
                if ($cardExpiry === '' || $cardCvv === '') {
                    respond(false, null, 'Card expiry and CVV are required.', 422);
                }
            }

            // Get last 4 digits (empty for non-card payments)
            $cardLastFour = $isCardPayment ? substr($cardNumber, -4) : '';

            // Generate a fake transaction ID
            $transactionId = 'TXN-' . strtoupper(bin2hex(random_bytes(8)));

            // Start transaction
            $pdo->beginTransaction();

            try {
                // 1. Create the booking
                $stmt = $pdo->prepare('CALL sp_booking_create(:car_id, :customer_name, :customer_email, :customer_phone, :total_amount, :payment_method, :notes)');
                $stmt->execute([
                    'car_id'          => $carId,
                    'customer_name'   => $customerName,
                    'customer_email'  => $customerEmail,
                    'customer_phone'  => $customerPhone,
                    'total_amount'    => $totalAmount,
                    'payment_method'  => $paymentMethod,
                    'notes'           => $notes,
                ]);
                $row = $stmt->fetch();
                $bookingId = $row['new_booking_id'] ?? null;

                if (!$bookingId) {
                    $pdo->rollBack();
                    respond(false, null, 'Failed to create booking.', 500);
                }

                // Consume ALL remaining result sets from sp_booking_create so the
                // connection is free for the next statement. (MySQL stored
                // procedures can leave multiple pending result sets; a single
                // nextRowset() is not enough and triggers PDO error 2014.)
                while ($stmt->nextRowset()) {}

                // 2. Process payment
                $stmt2 = $pdo->prepare('CALL sp_payment_process(:booking_id, :amount, :payment_method, :card_last_four, :transaction_id)');
                $stmt2->execute([
                    'booking_id'     => $bookingId,
                    'amount'         => $totalAmount,
                    'payment_method' => $paymentMethod,
                    'card_last_four' => $cardLastFour,
                    'transaction_id' => $transactionId,
                ]);
                $paymentRow = $stmt2->fetch();
                $paymentId = $paymentRow['payment_id'] ?? null;

                // Consume ALL remaining result sets from sp_payment_process too.
                while ($stmt2->nextRowset()) {}

                $pdo->commit();

                respond(true, [
                    'booking_id'      => $bookingId,
                    'payment_id'      => $paymentId,
                    'transaction_id'  => $transactionId,
                    'card_last_four'  => $cardLastFour,
                    'amount'          => $totalAmount,
                    'payment_status'  => 'paid',
                    'booking_status'  => 'confirmed',
                ], 'Booking confirmed and payment processed successfully.', 201);

            } catch (Exception $e) {
                $pdo->rollBack();
                respond(false, null, 'Booking failed: ' . $e->getMessage(), 500);
            }

            break;
        }

        // ---- UPDATE booking status ----
        case 'PUT': {
            $b = json_body();
            $id = (int)($b['id'] ?? 0);
            if (!$id) respond(false, null, 'Booking id is required.', 422);

            $bookingStatus = $b['booking_status'] ?? null;
            $paymentStatus = $b['payment_status'] ?? null;

            $stmt = $pdo->prepare('CALL sp_booking_update_status(:id, :booking_status, :payment_status)');
            $stmt->execute([
                'id'              => $id,
                'booking_status'  => $bookingStatus,
                'payment_status'  => $paymentStatus,
            ]);
            respond(true, null, 'Booking status updated.');
            break;
        }

        // ---- DELETE / cancel booking ----
        case 'DELETE': {
            $delBody = json_body();
            $id = (int)($_GET['id'] ?? $delBody['id'] ?? 0);
            if (!$id) respond(false, null, 'Booking id is required.', 422);

            $stmt = $pdo->prepare('CALL sp_booking_delete(:id)');
            $stmt->execute(['id' => $id]);
            respond(true, null, 'Booking cancelled and vehicle released.');
            break;
        }

        default:
            respond(false, null, 'Method not allowed', 405);
    }
} catch (PDOException $e) {
    respond(false, null, 'Database error: ' . $e->getMessage(), 500);
}

