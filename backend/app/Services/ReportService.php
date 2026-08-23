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
     * Generate daily sales report
     */
    public function dailySalesReport($date = null): array
    {
        $date = $date ? Carbon::parse($date) : Carbon::now();
        $startOfDay = $date->clone()->startOfDay();
        $endOfDay = $date->clone()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startOfDay, $endOfDay])
            ->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
            ->with('items.product')
            ->get();

        $totalSales = $orders->sum('total');
        $totalOrders = $orders->count();
        $totalItems = $orders->sum(fn($o) => $o->items->sum('quantity'));

        // Group by payment method
        $paymentMethods = $orders->groupBy(fn($o) => $o->payments->first()?->method ?? 'unknown')
            ->map(fn($group) => [
                'count' => $group->count(),
                'total' => $group->sum('total'),
            ]);

        // Top products sold
        $topProducts = [];
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $productName = $item->product->name;
                if (!isset($topProducts[$productName])) {
                    $topProducts[$productName] = ['quantity' => 0, 'revenue' => 0];
                }
                $topProducts[$productName]['quantity'] += $item->quantity;
                $topProducts[$productName]['revenue'] += $item->subtotal;
            }
        }
        usort($topProducts, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
        $topProducts = array_slice($topProducts, 0, 5);

        return [
            'date' => $date->toDateString(),
            'total_sales' => $totalSales,
            'total_orders' => $totalOrders,
            'total_items_sold' => $totalItems,
            'average_order_value' => $totalOrders > 0 ? $totalSales / $totalOrders : 0,
            'payment_methods' => $paymentMethods,
            'top_products' => $topProducts,
            'orders' => $orders->map(fn($o) => [
                'order_number' => $o->order_number,
                'total' => $o->total,
                'payment_method' => $o->payments->first()?->method ?? 'unknown',
                'status' => $o->status,
            ]),
        ];
    }

    /**
     * Generate monthly sales report
     */
    public function monthlySalesReport($year = null, $month = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $month = $month ?? Carbon::now()->month;
        $startOfMonth = Carbon::create($year, $month, 1)->startOfDay();
        $endOfMonth = $startOfMonth->clone()->endOfMonth()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startOfMonth, $endOfMonth])
            ->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
            ->with('items.product')
            ->get();

        $totalSales = $orders->sum('total');
        $totalOrders = $orders->count();
        $totalTax = $orders->sum('tax');

        // Daily breakdown
        $dailyBreakdown = [];
        $date = $startOfMonth->clone();
        while ($date <= $endOfMonth) {
            $dayStart = $date->clone()->startOfDay();
            $dayEnd = $date->clone()->endOfDay();
            $dayOrders = $orders->filter(fn($o) => $o->created_at >= $dayStart && $o->created_at <= $dayEnd);
            $dailyBreakdown[] = [
                'date' => $date->toDateString(),
                'sales' => $dayOrders->sum('total'),
                'orders' => $dayOrders->count(),
            ];
            $date->addDay();
        }

        return [
            'month' => $startOfMonth->format('F Y'),
            'total_sales' => $totalSales,
            'total_orders' => $totalOrders,
            'total_tax' => $totalTax,
            'average_daily_sales' => count($dailyBreakdown) > 0 ? $totalSales / count($dailyBreakdown) : 0,
            'daily_breakdown' => $dailyBreakdown,
        ];
    }

    /**
     * Generate yearly sales report
     */
    public function yearlySalesReport($year = null): array
    {
        $year = $year ?? Carbon::now()->year;
        $startOfYear = Carbon::create($year, 1, 1)->startOfDay();
        $endOfYear = $startOfYear->clone()->endOfYear()->endOfDay();

        $orders = Order::whereBetween('created_at', [$startOfYear, $endOfYear])
            ->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
            ->with('items.product')
            ->get();

        $totalSales = $orders->sum('total');
        $totalOrders = $orders->count();
        $totalTax = $orders->sum('tax');

        // Monthly breakdown
        $monthlyBreakdown = [];
        for ($m = 1; $m <= 12; $m++) {
            $monthStart = Carbon::create($year, $m, 1)->startOfDay();
            $monthEnd = $monthStart->clone()->endOfMonth()->endOfDay();
            $monthOrders = $orders->filter(fn($o) => $o->created_at >= $monthStart && $o->created_at <= $monthEnd);
            $monthlyBreakdown[] = [
                'month' => $monthStart->format('F'),
                'sales' => $monthOrders->sum('total'),
                'orders' => $monthOrders->count(),
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
        $products = Product::with('category', 'brand')
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'category' => $p->category?->name,
                'brand' => $p->brand?->name,
                'current_stock' => $p->stock_quantity,
                'low_stock_threshold' => $p->low_stock_threshold,
                'unit_price' => $p->base_price,
                'stock_value' => $p->stock_quantity * $p->base_price,
                'status' => $p->stock_quantity <= $p->low_stock_threshold ? 'low' : 'normal',
            ]);

        $lowStockItems = $products->filter(fn($p) => $p['status'] === 'low');
        $outOfStock = $products->filter(fn($p) => $p['current_stock'] == 0);

        return [
            'total_products' => $products->count(),
            'total_inventory_value' => $products->sum('stock_value'),
            'low_stock_count' => $lowStockItems->count(),
            'out_of_stock_count' => $outOfStock->count(),
            'low_stock_items' => $lowStockItems->values(),
            'out_of_stock_items' => $outOfStock->values(),
            'all_products' => $products->values(),
        ];
    }

    /**
     * Export report to CSV
     */
    public function exportToCSV($reportData, $reportType): string
    {
        $csv = "JEM Hardware Report - {$reportType}\n";
        $csv .= "Generated: " . Carbon::now()->format('Y-m-d H:i:s') . "\n\n";

        if ($reportType === 'daily_sales') {
            $csv .= "Date,Total Sales,Orders,Items Sold,Avg Order Value\n";
            $csv .= "{$reportData['date']},{$reportData['total_sales']},{$reportData['total_orders']},{$reportData['total_items_sold']},{$reportData['average_order_value']}\n\n";
            $csv .= "Order Details:\n";
            $csv .= "Order Number,Total,Payment Method,Status\n";
            foreach ($reportData['orders'] as $order) {
                $csv .= "{$order['order_number']},{$order['total']},{$order['payment_method']},{$order['status']}\n";
            }
        } elseif ($reportType === 'inventory') {
            $csv .= "Product,SKU,Category,Current Stock,Low Stock Threshold,Unit Price,Stock Value,Status\n";
            foreach ($reportData['all_products'] as $product) {
                $csv .= "\"{$product['name']}\",{$product['sku']},{$product['category']},{$product['current_stock']},{$product['low_stock_threshold']},{$product['unit_price']},{$product['stock_value']},{$product['status']}\n";
            }
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
            ->whereHas('payments', fn ($query) => $query->where('status', 'completed'))
            ->with('items.product')
            ->get();

        $revenue = $orders->sum('total');
        $tax = $orders->sum('tax');
        $grossRevenue = $revenue - $tax;

        // Calculate cost of goods sold (assuming cost is 60% of selling price)
        $cogs = 0;
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $cogs += $item->subtotal * 0.60; // Assume 60% cost
            }
        }

        $grossProfit = $grossRevenue - $cogs;
        $grossMargin = $grossRevenue > 0 ? ($grossProfit / $grossRevenue * 100) : 0;

        // Operating expenses (placeholder - would come from Expense model)
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
