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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
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
            'meta' => [
                'generated_at' => now()->toIso8601String(),
                'generated_by' => $this->reportService->resolveGeneratedBy($request->user()),
            ],
        ]);
    }

    /**
     * Export daily report to CSV
     */
    public function exportDaily(Request $request): StreamedResponse
    {
        $date = $request->query('date');
        $report = $this->reportService->dailySalesReport($date);
        $csv = $this->reportService->exportToCSV($report, 'daily_sales', $request->user(), ['period' => $date ?: now()->toDateString()]);
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'daily-sales-report.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Export monthly report to CSV
     */
    public function exportMonthly(Request $request): StreamedResponse
    {
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);
        $report = $this->reportService->monthlySalesReport($year, $month);
        $period = sprintf('%02d/%s', (int)$month, $year);
        $csv = $this->reportService->exportToCSV($report, 'monthly', $request->user(), ['period' => $period]);
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'monthly-sales-report.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Export yearly report to CSV
     */
    public function exportYearly(Request $request): StreamedResponse
    {
        $year = $request->query('year', now()->year);
        $report = $this->reportService->yearlySalesReport($year);
        $csv = $this->reportService->exportToCSV($report, 'yearly', $request->user(), ['period' => (string) $year]);
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'yearly-sales-report.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Export inventory report to CSV
     */
    public function exportInventory(Request $request): StreamedResponse
    {
        $report = $this->reportService->inventoryReport();
        $csv = $this->reportService->exportToCSV($report, 'inventory', $request->user());
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'inventory-report.csv', ['Content-Type' => 'text/csv']);
    }

    /**
     * Export profit & loss report to CSV
     */
    public function exportProfitLoss(Request $request): StreamedResponse
    {
        $year = $request->query('year', now()->year);
        $month = $request->query('month', now()->month);
        $report = $this->reportService->profitLossReport($year, $month);
        $period = sprintf('%02d/%s', (int)$month, $year);
        $csv = $this->reportService->exportToCSV($report, 'profit-loss', $request->user(), ['period' => $period]);
        
        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'profit-loss-report.csv', ['Content-Type' => 'text/csv']);
    }
}
