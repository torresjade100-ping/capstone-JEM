<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\ProductController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\BrandController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::apiResource('users', App\Http\Controllers\Api\Admin\UserController::class)->only(['index', 'store', 'show', 'update', 'destroy']);
    Route::delete('users/{user}', [App\Http\Controllers\Api\Admin\UserController::class, 'destroy']);
    Route::patch('users/{user}/archive', [App\Http\Controllers\Api\Admin\UserController::class, 'archive']);

    Route::patch('users/{user}/activate', [App\Http\Controllers\Api\Admin\UserController::class, 'activate']);
    Route::patch('users/{user}/role', [App\Http\Controllers\Api\Admin\UserController::class, 'changeRole']);
    Route::apiResource('products', App\Http\Controllers\Api\Admin\ProductController::class);
    Route::post('products/{product}/restore', [App\Http\Controllers\Api\Admin\ProductController::class, 'restore']);
    Route::post('products/{product}/activate', [App\Http\Controllers\Api\Admin\ProductController::class, 'activate']);
    Route::post('products/{product}/deactivate', [App\Http\Controllers\Api\Admin\ProductController::class, 'deactivate']);

    Route::apiResource('categories', App\Http\Controllers\Api\Admin\CategoryController::class);
    Route::post('categories/{category}/activate', [App\Http\Controllers\Api\Admin\CategoryController::class, 'activate']);
    Route::post('categories/{category}/deactivate', [App\Http\Controllers\Api\Admin\CategoryController::class, 'deactivate']);

    Route::apiResource('brands', App\Http\Controllers\Api\Admin\BrandController::class);
    Route::post('brands/{brand}/activate', [App\Http\Controllers\Api\Admin\BrandController::class, 'activate']);
    Route::post('brands/{brand}/deactivate', [App\Http\Controllers\Api\Admin\BrandController::class, 'deactivate']);

});

Route::middleware(['auth:sanctum', 'role:admin|staff'])->prefix('admin')->group(function () {
    Route::apiResource('orders', App\Http\Controllers\Api\Admin\OrderController::class)->only(['index', 'show']);
    Route::put('orders/{order}/status', [App\Http\Controllers\Api\Admin\OrderController::class, 'updateStatus']);
    Route::get('inventory', [App\Http\Controllers\Api\Admin\InventoryController::class, 'index']);
    Route::get('inventory/low-stock', [App\Http\Controllers\Api\Admin\InventoryController::class, 'lowStock']);
    Route::get('stock-adjustments', [App\Http\Controllers\Api\Admin\StockAdjustmentController::class, 'index']);
    Route::get('stock-adjustments/product/{productId}', [App\Http\Controllers\Api\Admin\StockAdjustmentController::class, 'byProduct']);
    Route::post('stock-adjustments', [App\Http\Controllers\Api\Admin\StockAdjustmentController::class, 'store']);
});

// Stock Requests: Staff submits requests; Admin receives, reviews, and approves/rejects
Route::middleware(['auth:sanctum', 'active', 'role:admin|staff'])->group(function () {
    Route::get('stock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'index']);
    Route::get('restock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'index']);
});


Route::middleware(['auth:sanctum', 'active', 'role:staff'])->group(function () {
    Route::post('restock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'store']);
    Route::post('stock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'store']);
});

Route::middleware(['auth:sanctum', 'active', 'role:admin'])->group(function () {
    Route::put('restock-requests/{restockRequest}', [App\Http\Controllers\Api\RestockRequestController::class, 'update']);
    Route::put('stock-requests/{restockRequest}', [App\Http\Controllers\Api\RestockRequestController::class, 'update']);
});


Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
});

Route::get('products', [ProductController::class, 'index']);
Route::get('products/{product}', [ProductController::class, 'show']);
Route::get('categories', [CategoryController::class, 'index']);
Route::get('brands', [BrandController::class, 'index']);

// Customer endpoints - require authenticated customer
Route::middleware(['auth:sanctum', 'active', 'role:customer'])->group(function () {
    Route::post('cart', [App\Http\Controllers\Api\CartController::class, 'add']);
    Route::get('cart', [App\Http\Controllers\Api\CartController::class, 'view']);
    Route::put('cart/items/{id}', [App\Http\Controllers\Api\CartController::class, 'updateItem']);
    Route::delete('cart/items/{id}', [App\Http\Controllers\Api\CartController::class, 'deleteItem']);
    Route::delete('cart', [App\Http\Controllers\Api\CartController::class, 'clear']);

    Route::post('orders/checkout', [App\Http\Controllers\Api\OrderController::class, 'checkout']);
    Route::get('orders', [App\Http\Controllers\Api\OrderController::class, 'index']);
    Route::get('orders/{id}', [App\Http\Controllers\Api\OrderController::class, 'show']);
});

// Mobile App Customer API routes (direct connectivity from mobile app)
Route::post('mobile/orders', [App\Http\Controllers\Api\OrderController::class, 'storeMobileOrder']);
Route::get('mobile/orders', [App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
Route::post('mobile/feedback', [App\Http\Controllers\Api\FeedbackController::class, 'storeMobileFeedback']);



// Staff/Admin routes for orders, backorders, batch processing, delivery
Route::middleware(['auth:sanctum', 'active', 'role:admin|staff'])->prefix('admin')->group(function () {
    Route::get('backorders', [App\Http\Controllers\Api\Admin\BackorderController::class, 'index']);
    Route::get('backorders/{id}', [App\Http\Controllers\Api\Admin\BackorderController::class, 'show']);
    Route::post('backorders', [App\Http\Controllers\Api\Admin\BackorderController::class, 'createFromOrder']);
    Route::put('backorders/{id}', [App\Http\Controllers\Api\Admin\BackorderController::class, 'update']);
    Route::post('backorders/{id}/fulfill', [App\Http\Controllers\Api\Admin\BackorderController::class, 'fulfillPartial']);

    Route::post('orders/batch/status', [App\Http\Controllers\Api\Admin\OrderBatchController::class, 'bulkUpdateStatus']);
    Route::post('orders/batch/manifest', [App\Http\Controllers\Api\Admin\OrderBatchController::class, 'generateManifest']);

    Route::post('deliveries', [App\Http\Controllers\Api\DeliveryController::class, 'create']);
    Route::put('deliveries/{id}', [App\Http\Controllers\Api\DeliveryController::class, 'update']);

    Route::get('feedback', [App\Http\Controllers\Api\FeedbackController::class, 'adminIndex']);
    Route::post('feedback/{id}/respond', [App\Http\Controllers\Api\FeedbackController::class, 'respond']);
});


Route::middleware(['auth:sanctum', 'active', 'role:staff'])->prefix('staff')->group(function () {
    Route::get('orders', [App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
    Route::get('orders/{order}', [App\Http\Controllers\Api\Admin\OrderController::class, 'show']);
    Route::put('orders/{order}/receive', fn (Illuminate\Http\Request $request, App\Models\Order $order) => app(App\Http\Controllers\Api\Admin\OrderController::class)->transition($request, $order, 'receive'));
    Route::put('orders/{order}/process', fn (Illuminate\Http\Request $request, App\Models\Order $order) => app(App\Http\Controllers\Api\Admin\OrderController::class)->transition($request, $order, 'process'));
    Route::put('orders/{order}/ready', fn (Illuminate\Http\Request $request, App\Models\Order $order) => app(App\Http\Controllers\Api\Admin\OrderController::class)->transition($request, $order, 'ready'));
    Route::put('orders/{order}/out-for-delivery', fn (Illuminate\Http\Request $request, App\Models\Order $order) => app(App\Http\Controllers\Api\Admin\OrderController::class)->transition($request, $order, 'out-for-delivery'));
    Route::put('orders/{order}/complete', fn (Illuminate\Http\Request $request, App\Models\Order $order) => app(App\Http\Controllers\Api\Admin\OrderController::class)->transition($request, $order, 'complete'));
    Route::get('restock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'index']);
    Route::post('restock-requests', [App\Http\Controllers\Api\RestockRequestController::class, 'store']);
    Route::get('order-adjustments', [App\Http\Controllers\Api\OrderAdjustmentController::class, 'index']);
    Route::post('order-adjustments', [App\Http\Controllers\Api\OrderAdjustmentController::class, 'store']);
    Route::get('order-adjustments/{orderAdjustment}', [App\Http\Controllers\Api\OrderAdjustmentController::class, 'show']);
    Route::post('walk-in-orders', [App\Http\Controllers\Api\POSController::class, 'checkout']);
    Route::get('feedback', [App\Http\Controllers\Api\FeedbackController::class, 'adminIndex']);
});

Route::middleware(['auth:sanctum', 'active', 'role:admin'])->group(function () {
    Route::put('admin/order-adjustments/{orderAdjustment}/review', [App\Http\Controllers\Api\OrderAdjustmentController::class, 'review']);
});

// Payment endpoints
Route::middleware(['auth:sanctum','active'])->group(function () {
    Route::post('payments/initiate', [App\Http\Controllers\Api\PaymentController::class, 'initiate']);
});

Route::middleware(['auth:sanctum', 'active', 'role:admin|staff'])->group(function () {
    Route::get('payments', [App\Http\Controllers\Api\PaymentController::class, 'index']);
    Route::get('payments/{id}', [App\Http\Controllers\Api\PaymentController::class, 'show']);
});

// Webhooks (public)
Route::post('payments/webhook/{gateway}', [App\Http\Controllers\Api\PaymentController::class, 'webhook']);

// POS and Express (staff)
Route::middleware(['auth:sanctum','active','role:admin|staff'])->group(function () {
    Route::post('pos/checkout', [App\Http\Controllers\Api\POSController::class, 'checkout']);
    Route::post('express/quick-sale', [App\Http\Controllers\Api\ExpressController::class, 'quickSale']);

    Route::apiResource('admin/suppliers', App\Http\Controllers\Api\Admin\SupplierController::class)->only(['index','store']);
    Route::put('admin/suppliers/{supplier}', [App\Http\Controllers\Api\Admin\SupplierController::class, 'update']);
    Route::delete('admin/suppliers/{supplier}', [App\Http\Controllers\Api\Admin\SupplierController::class, 'destroy']);
    Route::apiResource('admin/purchase-orders', App\Http\Controllers\Api\Admin\PurchaseOrderController::class)->only(['index','store']);
    Route::post('admin/purchase-orders/{id}/approve', [App\Http\Controllers\Api\Admin\PurchaseOrderController::class, 'approve']);
    Route::post('admin/purchase-orders/{id}/receive', [App\Http\Controllers\Api\Admin\PurchaseOrderController::class, 'receive']);

    // Reports
    Route::get('admin/reports/daily', [App\Http\Controllers\Api\Admin\ReportController::class, 'daily']);
    Route::get('admin/reports/monthly', [App\Http\Controllers\Api\Admin\ReportController::class, 'monthly']);
    Route::get('admin/reports/yearly', [App\Http\Controllers\Api\Admin\ReportController::class, 'yearly']);
    Route::get('admin/reports/daily/csv', [App\Http\Controllers\Api\Admin\ReportController::class, 'exportDaily']);
    Route::get('admin/reports/inventory/csv', [App\Http\Controllers\Api\Admin\ReportController::class, 'exportInventory']);
    Route::get('admin/reports/sales', [App\Http\Controllers\Api\Admin\ReportController::class, 'sales']);
    Route::get('admin/reports/product-sales', [App\Http\Controllers\Api\Admin\ReportController::class, 'productSales']);
    Route::get('admin/reports/inventory', [App\Http\Controllers\Api\Admin\ReportController::class, 'inventory']);
    Route::get('admin/reports/profit-loss', [App\Http\Controllers\Api\Admin\ReportController::class, 'profitLoss']);
});

// Notifications and feedback
Route::middleware(['auth:sanctum','active'])->group(function () {
    Route::get('notifications', [App\Http\Controllers\Api\NotificationController::class, 'index']);
    Route::post('notifications', [App\Http\Controllers\Api\NotificationController::class, 'store']);
    Route::post('notifications/read-all', [App\Http\Controllers\Api\NotificationController::class, 'markAllRead']);
    Route::delete('notifications/clear-all', [App\Http\Controllers\Api\NotificationController::class, 'clearAll']);
    Route::post('notifications/{id}/read', [App\Http\Controllers\Api\NotificationController::class, 'markRead']);

    Route::post('feedback', [App\Http\Controllers\Api\FeedbackController::class, 'store']);
    Route::get('feedback', [App\Http\Controllers\Api\FeedbackController::class, 'index']);
});

// Admin feedback management
Route::middleware(['auth:sanctum','active','role:admin|staff'])->prefix('admin')->group(function () {
    Route::get('feedback', [App\Http\Controllers\Api\FeedbackController::class, 'adminIndex']);
    Route::post('feedback/{id}/respond', [App\Http\Controllers\Api\FeedbackController::class, 'respond']);
});
