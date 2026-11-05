<?php
require_once __DIR__ . '/../includes/bootstrap.php';
$user = require_login();
respond(true, $user, 'Session active');
?>