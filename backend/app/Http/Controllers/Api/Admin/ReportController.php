<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ReportController extends Controller
{
    protected $reportService;

    public function __construct(ReportService $reportService)
    {
        $this->reportService = $reportService;
    }

    /**
     * Get sales report summary
     */
    public function sales(Request $request)
    {
        $date = $request->query('date');
        $report = $this->reportService->dailySalesReport($date);
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get product sales report
     */
    public function productSales(Request $request)
    {
        $date = $request->query('date');
        $report = $this->reportService->dailySalesReport($date);
        
        return response()->json([
            'success' => true,
            'data' => $report['top_products'] ?? [],
        ]);
    }

    /**
     * Get daily sales report
     */
    public function daily(Request $request)
    {
        $date = $request->query('date');
        $report = $this->reportService->dailySalesReport($date);
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get monthly sales report
     */
    public function monthly(Request $request)
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $report = $this->reportService->monthlySalesReport($year, $month);
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get yearly sales report
     */
    public function yearly(Request $request)
    {
        $year = $request->query('year');
        $report = $this->reportService->yearlySalesReport($year);
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get inventory report
     */
    public function inventory(Request $request)
    {
        $report = $this->reportService->inventoryReport();
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Get profit and loss report
     */
    public function profitLoss(Request $request)
    {
        $year = $request->query('year');
        $month = $request->query('month');
        $report = $this->reportService->profitLossReport($year, $month);
        
        return response()->json([
            'success' => true,
            'data' => $report,
        ]);
    }

    /**
     * Export daily report to CSV
     */
    public function exportDaily(Request $request): StreamedResponse
    {
        $date = $request->query('date');
        $report = $this->reportService->dailySalesReport($date);
        $csv = $this->reportService->exportToCSV($report, 'daily_sales');
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'daily-sales-report.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Export inventory report to CSV
     */
    public function exportInventory(Request $request): StreamedResponse
    {
        $report = $this->reportService->inventoryReport();
        $csv = $this->reportService->exportToCSV($report, 'inventory');
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'inventory-report.csv', ['Content-Type' => 'text/csv']);
    }
}
