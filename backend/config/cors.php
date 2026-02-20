<?php

$defaultOrigins = [
    env('FRONTEND_URL', 'http://localhost:5173'),
    'http://localhost:15183',
    'http://127.0.0.1:15183',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
];

$configuredOrigins = env('CORS_ALLOWED_ORIGINS');
$allowedOrigins = $configuredOrigins
    ? array_map('trim', explode(',', $configuredOrigins))
    : array_values(array_unique($defaultOrigins));

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],
    'allowed_methods' => ['*'],
    'allowed_origins' => array_values(array_filter($allowedOrigins)),
    'allowed_origins_patterns' => [],
    'allowed_headers' => ['*'],
    'exposed_headers' => [],
    'max_age' => 0,
    'supports_credentials' => true,
];
