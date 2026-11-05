<?php
require_once __DIR__ . '/../includes/bootstrap.php';
$_SESSION = [];
session_destroy();
respond(true, null, 'Logged out');
?>