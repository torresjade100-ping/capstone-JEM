<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Feedback;
use App\Models\Order;
use App\Models\Product;
use App\Models\RestockRequest;
use App\Models\Supplier;
use App\Models\Transaction;
use App\Models\User;
use App\Models\VoidRecord;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GlobalSearchController extends Controller
{
    /**
     * Search across all major admin modules with prioritized exact, prefix, and partial matching.
     */
    public function search(Request $request): JsonResponse
    {
        $rawQuery = trim((string) $request->input('q', ''));
        if (mb_strlen($rawQuery) < 1) {
            return response()->json([
                'success' => true,
                'query' => '',
                'total_results' => 0,
                'results' => [],
            ]);
        }

        $query = mb_strtolower($rawQuery);
        $likeQuery = "%{$query}%";
        $results = [];
        $totalCount = 0;

        // 1. USERS
        try {
            $userMatches = User::where(function ($q) use ($likeQuery, $query) {
                $q->where('name', 'like', $likeQuery)
                    ->orWhere('email', 'like', $likeQuery)
                    ->orWhere('phone', 'like', $likeQuery);
                if (is_numeric($query)) {
                    $q->orWhere('id', (int) $query);
                }
            })
            ->limit(6)
            ->get();

            $formattedUsers = [];
            foreach ($userMatches as $u) {
                $formattedUsers[] = [
                    'id' => $u->id,
                    'type' => 'user',
                    'module' => 'users',
                    'icon' => 'User',
                    'title' => $u->name,
                    'subtitle' => $u->email . ' · ' . ucfirst($u->role) . ' (ID: USR-' . str_pad($u->id, 3, '0', STR_PAD_LEFT) . ')',
                    'badge' => ucfirst($u->role),
                    'url' => '/users?userId=' . $u->id . '&search=' . urlencode($u->name),
                    'targetId' => $u->id,
                ];
            }
            if (!empty($formattedUsers)) {
                $results['users'] = [
                    'label' => 'Users',
                    'icon' => 'User',
                    'items' => $formattedUsers,
                ];
                $totalCount += count($formattedUsers);
            }
        } catch (\Throwable $e) {}

        // 2. PRODUCTS
        try {
            $productMatches = Product::with(['category:id,name', 'brand:id,name'])
                ->where(function ($q) use ($likeQuery, $query) {
                    $q->where('name', 'like', $likeQuery)
                        ->orWhere('sku', 'like', $likeQuery)
                        ->orWhere('barcode', 'like', $likeQuery);
                    if (is_numeric($query)) {
                        $q->orWhere('id', (int) $query);
                    }
                })
                ->limit(6)
                ->get();

            $formattedProducts = [];
            foreach ($productMatches as $p) {
                $price = $p->selling_price ?? $p->base_price ?? 0;
                $catName = $p->category?->name ?: 'General';
                $unit = $p->unit ?: 'pcs';
                $formattedProducts[] = [
                    'id' => $p->id,
                    'type' => 'product',
                    'module' => 'products',
                    'icon' => 'Package',
                    'title' => $p->name,
                    'subtitle' => '₱' . number_format($price, 2) . ' · ' . $catName . ' · Stock: ' . ($p->stock_quantity ?? 0) . ' ' . $unit,
                    'badge' => $p->status === 'active' ? 'Active' : 'Inactive',
                    'url' => '/products?productId=' . $p->id . '&search=' . urlencode($p->name),
                    'targetId' => $p->id,
                ];
            }
            if (!empty($formattedProducts)) {
                $results['products'] = [
                    'label' => 'Products',
                    'icon' => 'Package',
                    'items' => $formattedProducts,
                ];
                $totalCount += count($formattedProducts);
            }
        } catch (\Throwable $e) {}

        // 3. CATEGORIES
        try {
            $catMatches = Category::where(function ($q) use ($likeQuery, $query) {
                $q->where('name', 'like', $likeQuery)
                    ->orWhere('description', 'like', $likeQuery);
                if (is_numeric($query)) {
                    $q->orWhere('id', (int) $query);
                }
            })
            ->limit(5)
            ->get();

            $formattedCategories = [];
            foreach ($catMatches as $c) {
                $formattedCategories[] = [
                    'id' => $c->id,
                    'type' => 'category',
                    'module' => 'categories',
                    'icon' => 'Tag',
                    'title' => $c->name,
                    'subtitle' => ($c->description ? mb_substr($c->description, 0, 45) . '... · ' : '') . 'Category ID: #' . $c->id,
                    'badge' => ucfirst($c->status ?? 'active'),
                    'url' => '/categories?categoryId=' . $c->id . '&search=' . urlencode($c->name),
                    'targetId' => $c->id,
                ];
            }
            if (!empty($formattedCategories)) {
                $results['categories'] = [
                    'label' => 'Categories',
                    'icon' => 'Tag',
                    'items' => $formattedCategories,
                ];
                $totalCount += count($formattedCategories);
            }
        } catch (\Throwable $e) {}

        // 4. INVENTORY
        try {
            $invMatches = Product::where(function ($q) use ($likeQuery, $query) {
                $q->where('name', 'like', $likeQuery);
                if (is_numeric($query)) {
                    $q->orWhere('id', (int) $query);
                }
            })
            ->limit(5)
            ->get();

            $formattedInventory = [];
            foreach ($invMatches as $inv) {
                $statusLabel = strtoupper(str_replace('_', ' ', $inv->stock_status ?? 'in_stock'));
                $formattedInventory[] = [
                    'id' => $inv->id,
                    'type' => 'inventory',
                    'module' => 'inventory',
                    'icon' => 'Box',
                    'title' => $inv->name,
                    'subtitle' => 'Stock: ' . ($inv->stock_quantity ?? 0) . ' ' . ($inv->unit ?? 'pcs') . ' · Min threshold: ' . ($inv->low_stock_threshold ?? 10),
                    'badge' => $statusLabel,
                    'url' => '/inventory?productId=' . $inv->id . '&search=' . urlencode($inv->name),
                    'targetId' => $inv->id,
                ];
            }
            if (!empty($formattedInventory)) {
                $results['inventory'] = [
                    'label' => 'Inventory',
                    'icon' => 'Box',
                    'items' => $formattedInventory,
                ];
                $totalCount += count($formattedInventory);
            }
        } catch (\Throwable $e) {}

        // 5. ORDERS
        try {
            $orderMatches = Order::with(['customer.user'])
                ->where(function ($q) use ($likeQuery, $query) {
                    $q->where('order_number', 'like', $likeQuery)
                        ->orWhereHas('customer.user', function ($sub) use ($likeQuery) {
                            $sub->where('name', 'like', $likeQuery)
                                ->orWhere('email', 'like', $likeQuery)
                                ->orWhere('phone', 'like', $likeQuery);
                        });
                    if (is_numeric($query)) {
                        $q->orWhere('id', (int) $query);
                    }
                })
                ->orderBy('id', 'desc')
                ->limit(6)
                ->get();

            $formattedOrders = [];
            foreach ($orderMatches as $ord) {
                $ordNum = $ord->order_number ?: ('ORD-' . $ord->id);
                $custName = $ord->customer?->user?->name ?: 'Customer';
                $formattedOrders[] = [
                    'id' => $ord->id,
                    'type' => 'order',
                    'module' => 'orders',
                    'icon' => 'ShoppingCart',
                    'title' => 'Order #' . $ordNum,
                    'subtitle' => 'Customer: ' . $custName . ' · ₱' . number_format($ord->total, 2) . ' · ' . ucfirst($ord->status),
                    'badge' => strtoupper(str_replace('_', ' ', $ord->status)),
                    'url' => '/orders?orderId=' . urlencode($ordNum) . '&search=' . urlencode($ordNum),
                    'targetId' => $ord->id,
                ];
            }
            if (!empty($formattedOrders)) {
                $results['orders'] = [
                    'label' => 'Orders',
                    'icon' => 'ShoppingCart',
                    'items' => $formattedOrders,
                ];
                $totalCount += count($formattedOrders);
            }
        } catch (\Throwable $e) {}

        // 6. TRANSACTIONS
        try {
            $txMatches = Transaction::where(function ($q) use ($likeQuery, $query) {
                $q->where('reference_number', 'like', $likeQuery)
                    ->orWhere('transaction_number', 'like', $likeQuery)
                    ->orWhere('invoice_number', 'like', $likeQuery)
                    ->orWhere('customer_name', 'like', $likeQuery)
                    ->orWhere('payment_method', 'like', $likeQuery);
                if (is_numeric($query)) {
                    $q->orWhere('id', (int) $query);
                }
            })
            ->orderBy('id', 'desc')
            ->limit(6)
            ->get();

            $formattedTransactions = [];
            foreach ($txMatches as $tx) {
                $ref = $tx->reference_number ?: $tx->transaction_number ?: ('TXN-' . $tx->id);
                $formattedTransactions[] = [
                    'id' => $tx->id,
                    'type' => 'transaction',
                    'module' => 'transactions',
                    'icon' => 'Receipt',
                    'title' => 'Transaction #' . $ref,
                    'subtitle' => '₱' . number_format($tx->total_net, 2) . ' · ' . ($tx->customer_name ?: 'Walk-in') . ' · ' . strtoupper($tx->payment_method ?? 'CASH'),
                    'badge' => strtoupper($tx->status ?? 'PAID'),
                    'url' => '/transactions?txId=' . $tx->id . '&ref=' . urlencode($ref) . '&search=' . urlencode($ref),
                    'targetId' => $tx->id,
                ];
            }
            if (!empty($formattedTransactions)) {
                $results['transactions'] = [
                    'label' => 'Transactions',
                    'icon' => 'Receipt',
                    'items' => $formattedTransactions,
                ];
                $totalCount += count($formattedTransactions);
            }
        } catch (\Throwable $e) {}

        // 7. SUPPLIERS
        try {
            $supMatches = Supplier::where(function ($q) use ($likeQuery, $query) {
                $q->where('name', 'like', $likeQuery)
                    ->orWhere('contact_person', 'like', $likeQuery)
                    ->orWhere('phone', 'like', $likeQuery)
                    ->orWhere('email', 'like', $likeQuery);
                if (is_numeric($query)) {
                    $q->orWhere('id', (int) $query);
                }
            })
            ->limit(5)
            ->get();

            $formattedSuppliers = [];
            foreach ($supMatches as $sup) {
                $formattedSuppliers[] = [
                    'id' => $sup->id,
                    'type' => 'supplier',
                    'module' => 'suppliers',
                    'icon' => 'Truck',
                    'title' => $sup->name,
                    'subtitle' => ($sup->contact_person ? 'Contact: ' . $sup->contact_person . ' · ' : '') . ($sup->phone ?: $sup->email ?: 'Supplier ID: #' . $sup->id),
                    'badge' => ucfirst($sup->status ?? 'active'),
                    'url' => '/suppliers?supplierId=' . $sup->id . '&search=' . urlencode($sup->name),
                    'targetId' => $sup->id,
                ];
            }
            if (!empty($formattedSuppliers)) {
                $results['suppliers'] = [
                    'label' => 'Suppliers',
                    'icon' => 'Truck',
                    'items' => $formattedSuppliers,
                ];
                $totalCount += count($formattedSuppliers);
            }
        } catch (\Throwable $e) {}

        // 8. STOCK REQUESTS
        try {
            $reqMatches = RestockRequest::with(['product:id,name'])
                ->where(function ($q) use ($likeQuery, $query) {
                    $q->where('notes', 'like', $likeQuery)
                        ->orWhere('status', 'like', $likeQuery);
                    if (is_numeric($query)) {
                        $q->orWhere('id', (int) $query);
                    }
                })
                ->orWhereHas('product', function ($q) use ($likeQuery) {
                    $q->where('name', 'like', $likeQuery);
                })
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();

            $formattedRequests = [];
            foreach ($reqMatches as $req) {
                $prodName = $req->product?->name ?: 'Item';
                $formattedRequests[] = [
                    'id' => $req->id,
                    'type' => 'stock_request',
                    'module' => 'restock',
                    'icon' => 'ClipboardList',
                    'title' => 'Stock Request #' . $req->id . ' — ' . $prodName,
                    'subtitle' => 'Requested Qty: ' . $req->requested_quantity . ' · Status: ' . ucfirst($req->status) . ($req->notes ? ' · ' . mb_substr($req->notes, 0, 35) : ''),
                    'badge' => strtoupper($req->status),
                    'url' => '/stock-requests?requestId=' . $req->id . '&search=' . urlencode($prodName),
                    'targetId' => $req->id,
                ];
            }
            if (!empty($formattedRequests)) {
                $results['stock_requests'] = [
                    'label' => 'Stock Requests',
                    'icon' => 'ClipboardList',
                    'items' => $formattedRequests,
                ];
                $totalCount += count($formattedRequests);
            }
        } catch (\Throwable $e) {}

        // 9. REPORTS
        $reportTypes = [
            [
                'key' => 'daily',
                'name' => 'Daily Sales Report',
                'desc' => 'Daily revenue, itemized sales orders, POS totals, and payment breakdown',
                'keywords' => ['daily', 'sales', 'today', 'cash', 'report', 'pos', 'receipts']
            ],
            [
                'key' => 'monthly',
                'name' => 'Monthly Sales Report',
                'desc' => 'Monthly revenue trend, order volume, and annual comparative totals',
                'keywords' => ['monthly', 'month', 'sales', 'revenue', 'report', 'trends']
            ],
            [
                'key' => 'yearly',
                'name' => 'Yearly Sales Report',
                'desc' => 'Year-over-year annual revenue summaries and high-level trends',
                'keywords' => ['yearly', 'year', 'annual', 'report', 'sales', 'growth']
            ],
            [
                'key' => 'inventory',
                'name' => 'Inventory Valuation Report',
                'desc' => 'Total inventory stock value, cost analysis, and warehouse balance',
                'keywords' => ['inventory', 'valuation', 'stock', 'value', 'assets', 'warehouse', 'cost', 'report']
            ],
            [
                'key' => 'profit-loss',
                'name' => 'Profit & Loss Report',
                'desc' => 'Gross profit margins, COGS deduction, and estimated net business profit',
                'keywords' => ['profit', 'loss', 'pnl', 'margin', 'cogs', 'net profit', 'gross profit', 'report']
            ],
        ];

        $matchedReports = [];
        foreach ($reportTypes as $rt) {
            $isMatch = str_contains(mb_strtolower($rt['name']), $query) ||
                       str_contains(mb_strtolower($rt['desc']), $query);
            if (!$isMatch) {
                foreach ($rt['keywords'] as $kw) {
                    if (str_contains($kw, $query) || str_contains($query, $kw)) {
                        $isMatch = true;
                        break;
                    }
                }
            }

            if ($isMatch) {
                $matchedReports[] = [
                    'id' => $rt['key'],
                    'type' => 'report',
                    'module' => 'reports',
                    'icon' => 'BarChart3',
                    'title' => $rt['name'],
                    'subtitle' => $rt['desc'],
                    'badge' => 'REPORT',
                    'url' => '/reports?reportType=' . $rt['key'],
                    'targetId' => $rt['key'],
                ];
            }
        }

        if (!empty($matchedReports)) {
            $results['reports'] = [
                'label' => 'Reports',
                'icon' => 'BarChart3',
                'items' => $matchedReports,
            ];
            $totalCount += count($matchedReports);
        }

        // 10. VOID SECURITY
        try {
            $voidMatches = VoidRecord::with('transaction')
                ->where(function ($q) use ($likeQuery, $query) {
                    $q->where('reason', 'like', $likeQuery);
                    if (is_numeric($query)) {
                        $q->orWhere('id', (int) $query)->orWhere('transaction_id', (int) $query);
                    }
                })
                ->orderBy('id', 'desc')
                ->limit(4)
                ->get();

            $formattedVoids = [];
            // If query matches "void" or "pin" or "security", include the main Void PIN Configuration item
            if (str_contains('void security pin password credentials', $query) || str_contains($query, 'void') || str_contains($query, 'pin')) {
                $formattedVoids[] = [
                    'id' => 'pin-settings',
                    'type' => 'void_security',
                    'module' => 'void-security',
                    'icon' => 'ShieldCheck',
                    'title' => 'Void Security PIN Control',
                    'subtitle' => 'Supervisor authorization PIN for approving store transaction voids and cancellations',
                    'badge' => 'SECURITY',
                    'url' => '/void-security',
                    'targetId' => 'settings',
                ];
            }

            foreach ($voidMatches as $v) {
                $txRef = $v->transaction?->reference_number ?: ('TXN-' . $v->transaction_id);
                $formattedVoids[] = [
                    'id' => $v->id,
                    'type' => 'void_security',
                    'module' => 'void-security',
                    'icon' => 'Ban',
                    'title' => 'Void Audit #' . $v->id . ' (Tx #' . $txRef . ')',
                    'subtitle' => 'Reason: ' . ($v->reason ?: 'Transaction voided') . ' · ' . ($v->void_date ? $v->void_date->format('M d, Y h:i A') : 'Recorded'),
                    'badge' => 'VOIDED',
                    'url' => '/void-security?voidId=' . $v->id,
                    'targetId' => $v->id,
                ];
            }

            if (!empty($formattedVoids)) {
                $results['void_security'] = [
                    'label' => 'Void Security',
                    'icon' => 'ShieldCheck',
                    'items' => $formattedVoids,
                ];
                $totalCount += count($formattedVoids);
            }
        } catch (\Throwable $e) {}

        // 11. FEEDBACK
        try {
            $fbMatches = Feedback::with(['customer.user'])
                ->where(function ($q) use ($likeQuery, $query) {
                    $q->where('message', 'like', $likeQuery)
                        ->orWhere('subject', 'like', $likeQuery);
                    if (is_numeric($query)) {
                        $q->orWhere('id', (int) $query)->orWhere('rating', (int) $query);
                    }
                })
                ->orderBy('id', 'desc')
                ->limit(5)
                ->get();

            $formattedFeedback = [];
            foreach ($fbMatches as $fb) {
                $custName = $fb->customer?->user?->name ?: 'Customer';
                $rating = $fb->rating ? ($fb->rating . '★') : 'Feedback';
                $formattedFeedback[] = [
                    'id' => $fb->id,
                    'type' => 'feedback',
                    'module' => 'feedback',
                    'icon' => 'MessageSquare',
                    'title' => 'Feedback #' . $fb->id . ' — ' . $custName,
                    'subtitle' => ($fb->subject ? $fb->subject . ' · ' : '') . mb_substr($fb->message ?? '', 0, 45),
                    'badge' => $rating,
                    'url' => '/feedback?feedbackId=' . $fb->id . '&search=' . urlencode($custName),
                    'targetId' => $fb->id,
                ];
            }

            if (!empty($formattedFeedback)) {
                $results['feedback'] = [
                    'label' => 'Feedback',
                    'icon' => 'MessageSquare',
                    'items' => $formattedFeedback,
                ];
                $totalCount += count($formattedFeedback);
            }
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'query' => $rawQuery,
            'total_results' => $totalCount,
            'results' => $results,
        ]);
    }
}
