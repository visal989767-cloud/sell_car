<?php
require_once __DIR__ . '/../includes/bootstrap.php';
require_login();

$method = resolve_request_method();

try {
    switch ($method) {

        case 'GET': {
            $id = isset($_GET['id']) ? (int)$_GET['id'] : null;

            if ($id) {
                $stmt = $pdo->prepare('CALL sp_car_get(:id)');
                $stmt->execute(['id' => $id]);
                $car = $stmt->fetch();
                if (!$car) respond(false, null, 'Car not found.', 404);
                respond(true, $car);
            } else {
                $status = $_GET['status'] ?? null;
                $stmt = $pdo->prepare('CALL sp_car_list(:status)');
                $stmt->execute(['status' => $status]);
                $cars = $stmt->fetchAll();
                respond(true, $cars);
            }
            break;
        }

        case 'POST': {
            $b = json_body();
            $required = ['vin', 'make', 'model', 'year', 'price'];
            foreach ($required as $field) {
                if (!isset($b[$field]) || $b[$field] === '') {
                    respond(false, null, "Field '$field' is required.", 422);
                }
            }
            $stmt = $pdo->prepare('CALL sp_car_create(:vin, :make, :model, :year, :color, :plate_number, :price, :mileage, :image_url)');
            $stmt->execute([
                'vin'          => $b['vin'],
                'make'         => $b['make'],
                'model'        => $b['model'],
                'year'         => (int)$b['year'],
                'color'        => $b['color'] ?? null,
                'plate_number' => $b['plate_number'] ?? null,
                'price'        => (float)$b['price'],
                'mileage'      => (int)($b['mileage'] ?? 0),
                'image_url'    => $b['image_url'] ?? null,
            ]);
            $row = $stmt->fetch();
            respond(true, ['id' => $row['new_car_id'] ?? null], 'Car added to stock.', 201);
            break;
        }

        case 'PUT': {
            $b = json_body();
            $id = (int)($b['id'] ?? 0);
            if (!$id) respond(false, null, 'Car id is required.', 422);

            $stmt = $pdo->prepare('CALL sp_car_update(:id, :make, :model, :year, :color, :plate_number, :price, :mileage, :status, :image_url)');
            $stmt->execute([
                'id'           => $id,
                'make'         => $b['make'],
                'model'        => $b['model'],
                'year'         => (int)$b['year'],
                'color'        => $b['color'] ?? null,
                'plate_number' => $b['plate_number'] ?? null,
                'price'        => (float)$b['price'],
                'mileage'      => (int)($b['mileage'] ?? 0),
                'status'       => $b['status'] ?? 'in_stock',
                'image_url'    => $b['image_url'] ?? null,
            ]);
            respond(true, null, 'Car updated.');
            break;
        }

        case 'DELETE': {
            $delBody = json_body();
            $id = (int)($_GET['id'] ?? $delBody['id'] ?? 0);
            if (!$id) respond(false, null, 'Car id is required.', 422);

            $stmt = $pdo->prepare('CALL sp_car_delete(:id)');
            $stmt->execute(['id' => $id]);
            respond(true, null, 'Car removed from stock.');
            break;
        }

        default:
            respond(false, null, 'Method not allowed', 405);
    }
} catch (PDOException $e) {
    respond(false, null, 'Database error: ' . $e->getMessage(), 500);
}
