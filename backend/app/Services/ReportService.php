<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use App\Models\SalesTransaction;
use App\Models\StockAdjustment;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportService
{
    /**
     * Generate daily sales report including Online Orders and Walk-In POS Transactions
     */
    public function dailySalesReport($date = null): array
    {
        $date = $date ? Carbon::parse($date) : Carbon::now();
        $startOfDay = $date->clone()->startOfDay();
        $endOfDay = $date->clone()->endOfDay();

        // 1. Fetch online orders
        $orders = Order::whereBetween('created_at', [$startOfDay, $endOfDay])
            ->where(function ($q) {
                $q->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
                  ->orWhereIn('status', ['completed', 'delivered', 'processing', 'confirmed', 'ready']);
            })
            ->with(['items.product', 'customer.user', 'payments'])
            ->get();

        // 2. Fetch POS walk-in sales transactions
        $salesTransactions = SalesTransaction::whereBetween('created_at', [$startOfDay, $endOfDay])
            ->where('status', 'completed')
            ->with(['items.product', 'user'])
            ->get();

        $orderSales = (float) $orders->sum('total');
        $posSales = (float) $salesTransactions->sum('total');
        $totalSales = $orderSales + $posSales;

        $totalOrders = $orders->count() + $salesTransactions->count();

        $ordersItemsCount = (int) $orders->sum(fn($o) => $o->items->sum('quantity'));
        $posItemsCount = (int) $salesTransactions->sum(fn($tx) => $tx->items->sum('quantity'));
        $totalItems = $ordersItemsCount + $posItemsCount;

        // Payment methods breakdown aggregation
        $paymentMethods = [];
        foreach ($orders as $order) {
            $method = strtolower($order->payments->first()?->method ?? $order->payment_method ?? 'cod');
            if ($method === 'cod') $method = 'cash';
            if (!isset($paymentMethods[$method])) {
                $paymentMethods[$method] = ['count' => 0, 'total' => 0];
            }
            $paymentMethods[$method]['count']++;
            $paymentMethods[$method]['total'] += (float) $order->total;
        }
        foreach ($salesTransactions as $tx) {
            $method = strtolower($tx->payment_method ?? 'cash');
            if ($method === 'cod') $method = 'cash';
            if (!isset($paymentMethods[$method])) {
                $paymentMethods[$method] = ['count' => 0, 'total' => 0];
            }
            $paymentMethods[$method]['count']++;
            $paymentMethods[$method]['total'] += (float) $tx->total;
        }

        // Top products and itemized sales mapping
        $productsSoldMap = [];
        $itemizedSales = [];

        foreach ($orders as $order) {
            $timeStr = $order->created_at ? $order->created_at->format('h:i A') : '';
            foreach ($order->items as $item) {
                $pName = $item->product?->name ?? $item->name ?? ('Product #' . $item->product_id);
                $qty = (int) $item->quantity;
                $price = (float) ($item->unit_price ?? $item->price ?? ($qty > 0 ? ($item->subtotal ?? $order->total) / $qty : 0));
                $sub = (float) ($item->subtotal ?? ($qty * $price));

                if (!isset($productsSoldMap[$pName])) {
                    $productsSoldMap[$pName] = ['name' => $pName, 'quantity' => 0, 'revenue' => 0];
                }
                $productsSoldMap[$pName]['quantity'] += $qty;
                $productsSoldMap[$pName]['revenue'] += $sub;

                $itemizedSales[] = [
                    'time' => $timeStr,
                    'order_number' => $order->order_number ?? ('ORD-' . $order->id),
                    'source' => 'Online Order',
                    'product_name' => $pName,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total' => $sub,
                ];
            }
        }

        foreach ($salesTransactions as $tx) {
            $timeStr = $tx->created_at ? $tx->created_at->format('h:i A') : '';
            foreach ($tx->items as $item) {
                $pName = $item->product?->name ?? ('Product #' . $item->product_id);
                $qty = (int) $item->quantity;
                $price = (float) $item->unit_price;
                $sub = (float) ($item->total_price ?? ($qty * $price));

                if (!isset($productsSoldMap[$pName])) {
                    $productsSoldMap[$pName] = ['name' => $pName, 'quantity' => 0, 'revenue' => 0];
                }
                $productsSoldMap[$pName]['quantity'] += $qty;
                $productsSoldMap[$pName]['revenue'] += $sub;

                $itemizedSales[] = [
                    'time' => $timeStr,
                    'order_number' => $tx->transaction_number,
                    'source' => 'Walk-In POS',
                    'product_name' => $pName,
                    'quantity' => $qty,
                    'unit_price' => $price,
                    'total' => $sub,
                ];
            }
        }

        $topProducts = array_values($productsSoldMap);
        usort($topProducts, fn($a, $b) => $b['revenue'] <=> $a['revenue']);

        // Combined transactions list with purchased products
        $allTransactions = [];

        foreach ($orders as $o) {
            $allTransactions[] = [
                'id' => $o->id,
                'order_number' => $o->order_number ?? ('ORD-' . $o->id),
                'type' => 'Online Order',
                'customer_name' => $o->customer?->user?->name ?? $o->customer_name ?? 'Online Customer',
                'total' => (float) $o->total,
                'payment_method' => $o->payments->first()?->method ?? $o->payment_method ?? 'COD',
                'status' => $o->status,
                'created_at' => $o->created_at ? $o->created_at->toIso8601String() : null,
                'time' => $o->created_at ? $o->created_at->format('h:i A') : '',
                'items' => $o->items->map(fn($it) => [
                    'product_id' => $it->product_id,
                    'name' => $it->product?->name ?? 'Product',
                    'quantity' => (int) $it->quantity,
                    'unit_price' => (float) ($it->unit_price ?? $it->price ?? 0),
                    'total' => (float) ($it->subtotal ?? ($it->quantity * ($it->unit_price ?? 0))),
                ])->values(),
            ];
        }

        foreach ($salesTransactions as $tx) {
            $allTransactions[] = [
                'id' => $tx->id,
                'order_number' => $tx->transaction_number,
                'type' => 'Walk-In POS',
                'customer_name' => 'Walk-in Customer',
                'total' => (float) $tx->total,
                'payment_method' => $tx->payment_method === 'cod' ? 'Cash' : ucfirst($tx->payment_method ?? 'Cash'),
                'status' => $tx->status ?? 'completed',
                'created_at' => $tx->created_at ? $tx->created_at->toIso8601String() : null,
                'time' => $tx->created_at ? $tx->created_at->format('h:i A') : '',
                'items' => $tx->items->map(fn($it) => [
                    'product_id' => $it->product_id,
                    'name' => $it->product?->name ?? 'Product',
                    'quantity' => (int) $it->quantity,
                    'unit_price' => (float) $it->unit_price,
                    'total' => (float) ($it->total_price ?? ($it->quantity * $it->unit_price)),
                ])->values(),
            ];
        }

        // Sort newest first
        usort($allTransactions, function ($a, $b) {
            return strcmp($b['created_at'] ?? '', $a['created_at'] ?? '');
        });

        return [
            'date' => $date->toDateString(),
            'total_sales' => $totalSales,
            'total_orders' => $totalOrders,
            'total_items_sold' => $totalItems,
            'average_order_value' => $totalOrders > 0 ? ($totalSales / $totalOrders) : 0,
            'payment_methods' => $paymentMethods,
            'top_products' => array_slice($topProducts, 0, 10),
            'all_products_sold' => $topProducts,
            'itemized_sales' => $itemizedSales,
            'orders' => $allTransactions,
        ];
    }

    /**
     * Generate monthly sales report including POS walk-in sales
     */
    public function monthlySalesReport($year = null, $month = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $month = $month ?? Carbon::now()->month;
        $startOfMonth = Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = $startOfMonth->clone()->endOfMonth()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where(function ($q) {
                $q->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
                  ->orWhereIn('status', ['completed', 'delivered', 'processing', 'confirmed', 'ready']);
            })
            ->with('items.product')
            ->get();

        $salesTransactions = SalesTransaction::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->where('status', 'completed')
            ->with('items.product')
            ->get();

        $totalSales = (float) $orders->sum('total') + (float) $salesTransactions->sum('total');
        $totalOrders = $orders->count() + $salesTransactions->count();
        $totalTax = (float) $orders->sum('tax');

        // Daily breakdown
        $dailyBreakdown = [];
        $date = $startOfMonth->clone();
        while ($date <= $endOfMonth) {
            $dayStart = $date->clone()->startOfDay();
            $dayEnd = $date->clone()->endOfDay();
            $dayOrders = $orders->filter(fn($o) => $o->created_at >= $dayStart && $o->created_at <= $dayEnd);
            $dayPos = $salesTransactions->filter(fn($t) => $t->created_at >= $dayStart && $t->created_at <= $dayEnd);

            $daySales = (float) $dayOrders->sum('total') + (float) $dayPos->sum('total');
            $dayCount = $dayOrders->count() + $dayPos->count();

            $dailyBreakdown[] = [
                'date' => $date->toDateString(),
                'sales' => $daySales,
                'orders' => $dayCount,
            ];
            $date->addDay();
        }

        return [
            'month' => $startOfMonth->format('F Y'),
            'total_sales' => $totalSales,
            'total_orders' => $totalOrders,
            'total_tax' => $totalTax,
            'average_daily_sales' => count($dailyBreakdown) > 0 ? ($totalSales / count($dailyBreakdown)) : 0,
            'daily_breakdown' => $dailyBreakdown,
        ];
    }

    /**
     * Generate yearly sales report including POS walk-in sales
     */
    public function yearlySalesReport($year = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $startOfYear = Carbon::create($year, 1, 1)->startOfDay();
        $endOfYear = $startOfYear->clone()->endOfYear()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startOfYear, $endOfYear])
            ->where(function ($q) {
                $q->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
                  ->orWhereIn('status', ['completed', 'delivered', 'processing', 'confirmed', 'ready']);
            })
            ->with('items.product')
            ->get();

        $salesTransactions = SalesTransaction::whereBetween('created_at', [$startOfYear, $endOfYear])
            ->where('status', 'completed')
            ->with('items.product')
            ->get();

        $totalSales = (float) $orders->sum('total') + (float) $salesTransactions->sum('total');
        $totalOrders = $orders->count() + $salesTransactions->count();
        $totalTax = (float) $orders->sum('tax');

        // Monthly breakdown
        $monthlyBreakdown = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthStart = Carbon::create($year, $m, 1)->startOfDay();
            $monthEnd = $monthStart->clone()->endOfMonth()->endOfDay();
            $monthOrders = $orders->filter(fn($o) => $o->created_at >= $monthStart && $o->created_at <= $monthEnd);
            $monthPos = $salesTransactions->filter(fn($t) => $t->created_at >= $monthStart && $t->created_at <= $monthEnd);

            $mSales = (float) $monthOrders->sum('total') + (float) $monthPos->sum('total');
            $mCount = $monthOrders->count() + $monthPos->count();

            $monthlyBreakdown[] = [
                'month' => $monthStart->format('F'),
                'sales' => $mSales,
                'orders' => $mCount,
            ];
        }

        return [
            'year' => $year,
            'total_sales' => $totalSales,
            'total_orders' => $totalOrders,
            'total_tax' => $totalTax,
            'average_monthly_sales' => $totalSales / 12,
            'monthly_breakdown' => $monthlyBreakdown,
        ];
    }

    /**
     * Generate inventory report
     */
    public function inventoryReport(): array
    {
        $products = Product::with(['category', 'brand', 'variants'])
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->variants->first()?->sku ?? ('PRD-' . $p->id),
                'category' => $p->category?->name,
                'brand' => $p->brand?->name,
                'current_stock' => (int) $p->stock_quantity,
                'low_stock_threshold' => (int) $p->low_stock_threshold,
                'unit_price' => (float) $p->base_price,
                'stock_value' => (float) ($p->stock_quantity * $p->base_price),
                'status' => $p->stock_quantity <= 0 ? 'out_of_stock' : ($p->stock_quantity <= $p->low_stock_threshold ? 'low' : 'normal'),
            ]);

        $lowStockItems = $products->filter(fn($p) => $p['status'] === 'low');
        $outOfStock = $products->filter(fn($p) => $p['current_stock'] <= 0);

        return [
            'total_products' => $products->count(),
            'total_inventory_value' => $products->sum('stock_value'),
            'low_stock_count' => $lowStockItems->count(),
            'out_of_stock_count' => $outOfStock->count(),
            'low_stock_items' => $lowStockItems->values(),
            'out_of_stock_items' => $outOfStock->values(),
            'all_products' => $products->values(),
            'products' => $products->values(),
        ];
    }

    /**
     * Sanitize string value against CSV formula injection (DDE / CSV Injection)
     */
    public function sanitizeCsvField($value): string
    {
        if ($value === null) {
            return '';
        }
        $str = (string) $value;
        // If string starts with dangerous formula characters (=, +, -, @, \t, \r), prepend with single quote
        if (preg_match('/^[\=\+\-\@\t\r]/', $str)) {
            $str = "'" . $str;
        }
        return str_replace('"', '""', $str);
    }

    /**
     * Resolve the formatted Generated By identity string from user object, Sanctum session, or fallback
     */
    public function resolveGeneratedBy($user = null): string
    {
        if (!$user && function_exists('auth')) {
            $user = auth()->user();
        }

        if (!$user) {
            return 'System Automated / Scheduler';
        }

        $fullName = trim($user->name ?: ($user->full_name ?? ($user->first_name . ' ' . $user->last_name)));
        if (empty($fullName)) {
            $fullName = 'Administrator';
        }

        $role = ucfirst($user->role ?? 'Administrator');

        return "{$fullName} ({$role})";
    }

    /**
     * Export report to CSV with dynamic administrative metadata header and formula injection sanitization
     */
    public function exportToCSV($reportData, $reportType, $user = null, array $meta = []): string
    {
        $generatedByStr = $this->resolveGeneratedBy($user ?? ($meta['user'] ?? null));
        $generatedBySafe = $this->sanitizeCsvField($generatedByStr);
        $generatedDate = Carbon::now()->format('Y-m-d H:i:s');

        $periodStr = $meta['period'] ?? ($reportData['date'] ?? ($reportData['month'] ?? ($reportData['year'] ?? Carbon::now()->format('m/Y'))));

        $titles = [
            'daily_sales' => "Daily Sales Report ({$periodStr})",
            'daily' => "Daily Sales Report ({$periodStr})",
            'monthly' => "Monthly Sales Report ({$periodStr})",
            'yearly' => "Yearly Sales Report ({$periodStr})",
            'inventory' => "Inventory Valuation & Stock Status Report",
            'profit_loss' => "Profit & Loss Statement ({$periodStr})",
            'profit-loss' => "Profit & Loss Statement ({$periodStr})",
        ];

        $reportTitle = $titles[$reportType] ?? "Business Operations Report: {$reportType}";

        // Standard CSV Metadata Header Block
        $csv = "Report Title,{$this->sanitizeCsvField($reportTitle)}\n";
        $csv .= "Generated Date,{$generatedDate}\n";
        $csv .= "Generated By,\"{$generatedBySafe}\"\n";
        $csv .= "Status,Official Report\n";
        $csv .= "---\n";

        if ($reportType === 'monthly') {
            $csv .= "DAY / DATE,SALES AMOUNT,ORDERS COUNT\n";
            $breakdown = $reportData['daily_breakdown'] ?? [];
            foreach ($breakdown as $row) {
                $date = $this->sanitizeCsvField($row['date'] ?? '');
                $sales = number_format((float) ($row['sales'] ?? 0), 2, '.', '');
                $orders = (int) ($row['orders'] ?? 0);
                $csv .= "\"{$date}\",{$sales},{$orders}\n";
            }
        } elseif ($reportType === 'daily_sales' || $reportType === 'daily') {
            $csv .= "Date,Total Sales,Orders,Items Sold,Avg Order Value\n";
            $csv .= "{$reportData['date']},{$reportData['total_sales']},{$reportData['total_orders']},{$reportData['total_items_sold']},{$reportData['average_order_value']}\n\n";
            
            $csv .= "Transaction & Product Purchase Details:\n";
            $csv .= "Time,Order/Tx #,Source,Customer,Products Bought,Total,Payment Method,Status\n";
            foreach (($reportData['orders'] ?? []) as $order) {
                $time = $this->sanitizeCsvField($order['time'] ?? '');
                $num = $this->sanitizeCsvField($order['order_number'] ?? '');
                $source = $this->sanitizeCsvField($order['type'] ?? 'POS/Order');
                $cust = $this->sanitizeCsvField($order['customer_name'] ?? 'Customer');
                $itemsList = collect($order['items'] ?? [])->map(fn($i) => "{$i['quantity']}x {$i['name']} (PHP " . number_format((float)($i['total'] ?? 0), 2, '.', '') . ")")->implode('; ');
                $itemsClean = $this->sanitizeCsvField($itemsList);
                $total = (float) ($order['total'] ?? 0);
                $pay = $this->sanitizeCsvField($order['payment_method'] ?? '');
                $st = $this->sanitizeCsvField($order['status'] ?? '');
                $csv .= "\"{$time}\",\"{$num}\",\"{$source}\",\"{$cust}\",\"{$itemsClean}\",{$total},\"{$pay}\",\"{$st}\"\n";
            }
        } elseif ($reportType === 'yearly') {
            $csv .= "MONTH,SALES AMOUNT,ORDERS COUNT\n";
            $breakdown = $reportData['monthly_breakdown'] ?? [];
            foreach ($breakdown as $row) {
                $month = $this->sanitizeCsvField($row['month'] ?? '');
                $sales = number_format((float) ($row['sales'] ?? 0), 2, '.', '');
                $orders = (int) ($row['orders'] ?? 0);
                $csv .= "\"{$month}\",{$sales},{$orders}\n";
            }
        } elseif ($reportType === 'inventory') {
            $csv .= "Product,SKU,Category,Current Stock,Low Stock Threshold,Unit Price,Stock Value,Status\n";
            $list = $reportData['all_products'] ?? $reportData['products'] ?? [];
            foreach ($list as $product) {
                $pName = $this->sanitizeCsvField($product['name'] ?? '');
                $pSku = $this->sanitizeCsvField($product['sku'] ?? '');
                $pCat = $this->sanitizeCsvField($product['category'] ?? '');
                $cStock = (int) ($product['current_stock'] ?? 0);
                $lowThresh = (int) ($product['low_stock_threshold'] ?? 0);
                $uPrice = (float) ($product['unit_price'] ?? 0);
                $sVal = (float) ($product['stock_value'] ?? 0);
                $st = $this->sanitizeCsvField($product['status'] ?? '');
                $csv .= "\"{$pName}\",\"{$pSku}\",\"{$pCat}\",{$cStock},{$lowThresh},{$uPrice},{$sVal},\"{$st}\"\n";
            }
        } elseif ($reportType === 'profit-loss' || $reportType === 'profit_loss') {
            $csv .= "Metric,Value\n";
            $csv .= "Period,{$this->sanitizeCsvField($reportData['period'] ?? '')}\n";
            $csv .= "Gross Revenue,{$reportData['gross_revenue']}\n";
            $csv .= "Cost of Goods Sold (COGS),{$reportData['cost_of_goods_sold']}\n";
            $csv .= "Gross Profit,{$reportData['gross_profit']}\n";
            $csv .= "Gross Margin %,{$reportData['gross_margin_percent']}%\n";
            $csv .= "Operating Expenses,{$reportData['operating_expenses']}\n";
            $csv .= "Net Profit,{$reportData['net_profit']}\n";
            $csv .= "Net Profit Margin %,{$reportData['net_profit_margin_percent']}%\n";
        }

        return $csv;
    }

    /**
     * Generate profit and loss report
     */
    public function profitLossReport($year = null, $month = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $month = $month ?? Carbon::now()->month;

        $startDate = Carbon::create($year, $month, 1)->startOfDay();
        $endDate = $startDate->clone()->endOfMonth()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startDate, $endDate])
            ->where(function ($q) {
                $q->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
                  ->orWhereIn('status', ['completed', 'delivered', 'processing', 'confirmed', 'ready']);
            })
            ->with('items.product')
            ->get();

        $salesTransactions = SalesTransaction::whereBetween('created_at', [$startDate, $endDate])
            ->where('status', 'completed')
            ->with('items.product')
            ->get();

        $revenue = (float) $orders->sum('total') + (float) $salesTransactions->sum('total');
        $tax = (float) $orders->sum('tax');
        $grossRevenue = $revenue - $tax;

        // Calculate cost of goods sold (estimated at 60% of base price)
        $cogs = 0;
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $cogs += ($item->subtotal ?? ($item->quantity * ($item->unit_price ?? 0))) * 0.60;
            }
        }
        foreach ($salesTransactions as $tx) {
            foreach ($tx->items as $item) {
                $cogs += ($item->total_price ?? ($item->quantity * $item->unit_price)) * 0.60;
            }
        }

        $grossProfit = $grossRevenue - $cogs;
        $grossMargin = $grossRevenue > 0 ? ($grossProfit / $grossRevenue * 100) : 0;

        $expenses = 0;
        $netProfit = $grossProfit - $expenses;

        return [
            'period' => $startDate->format('F Y'),
            'revenue' => $revenue,
            'tax' => $tax,
            'gross_revenue' => $grossRevenue,
            'cost_of_goods_sold' => $cogs,
            'gross_profit' => $grossProfit,
            'gross_margin_percent' => round($grossMargin, 2),
            'operating_expenses' => $expenses,
            'net_profit' => $netProfit,
            'net_profit_margin_percent' => $grossRevenue > 0 ? round(($netProfit / $grossRevenue * 100), 2) : 0,
        ];
    }
}

