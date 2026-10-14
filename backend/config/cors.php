<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configured to allow seamless communication with Microsoft Dev Tunnels,
    | Expo Go Metro Bundler, local emulators, and mobile devices across
    | separate networks and physical devices.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie', '*'],

    'allowed_methods' => ['*'],

    'allowed_origins' => ['*'],

    'allowed_origins_patterns' => [
        '*devtunnels.ms*',
        '*.devtunnels.ms*',
        '*ngrok-free.app*',
        '*.ngrok-free.app*',
        '*exp.direct*',
    ],

    'allowed_headers' => [
        '*',
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'X-App-Platform',
        'X-Socket-Id',
    ],

    'exposed_headers' => [
        'Authorization',
        'X-App-Platform',
    ],

    'max_age' => 86400,

    'supports_credentials' => true,

];
