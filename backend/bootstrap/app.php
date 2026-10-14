<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Trust all upstream proxies (Dev Tunnels, ngrok, reverse proxies)
        // Ensures X-Forwarded-Proto (https) and X-Forwarded-Host are recognized
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'role' => App\Http\Middleware\RoleMiddleware::class,
            'active' => App\Http\Middleware\EnsureUserIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
