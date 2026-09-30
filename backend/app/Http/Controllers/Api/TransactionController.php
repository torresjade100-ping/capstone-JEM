<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Refund;
use App\Models\StockAdjustment;
use App\Models\Transaction;
use App\Models\VoidRecord;
use App\Models\VoidSecuritySetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;

class TransactionController extends Controller
{
    protected AuditService $auditService;

    public function __construct(AuditService $auditService)
    {
        $this->auditService = $auditService;
    }

    /**
     * List transactions with search, filters, tabs, and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Transaction::with(['items.product', 'refunds.user', 'voidRecord.user', 'cashier', 'order'])
            ->orderBy('date_time', 'desc');

        // Tab selection: 'all', 'payments', 'refunds', 'voids', 'gcash'
        $tab = strtolower($request->input('tab', 'all'));
        if ($tab === 'gcash') {
            $query->where(function ($q) {
                $q->whereRaw('LOWER(payment_method) = ?', ['gcash'])
                  ->orWhere('type', 'gcash');
            });
        } elseif ($tab === 'payments') {
            $query->where('status', 'PAID');
        } elseif ($tab === 'refunds') {
            $query->where('status', 'REFUNDED');
        } elseif ($tab === 'voids') {
            $query->where('status', 'VOIDED');
        }
        // If tab is 'all' or 'retail', no status filter is applied

        // Search across Order #, Transaction ID, Customer, Staff / Processed By, Reference #
        if ($request->filled('search')) {
            $term = trim($request->search);
            $query->where(function ($q) use ($term) {
                $q->where('transaction_number', 'like', "%{$term}%")
                  ->orWhere('customer_name', 'like', "%{$term}%")
                  ->orWhere('cashier_name', 'like', "%{$term}%")
                  ->orWhere('reference_number', 'like', "%{$term}%")
                  ->orWhere('order_source', 'like', "%{$term}%")
                  ->orWhereHas('order', function ($oq) use ($term) {
                      $oq->where('order_number', 'like', "%{$term}%");
                  })
                  ->orWhere('id', $term);
            });
        }

        // Date filter
        if ($request->filled('date')) {
            $query->whereDate('date_time', $request->date);
        }

        // Order Source filter ('online', 'walk-in', etc.)
        if ($request->filled('order_source') && $request->order_source !== 'all') {
            $source = strtolower($request->order_source);
            if ($source === 'online') {
                $query->where(function ($q) {
                    $q->where('order_source', 'Online')
                      ->orWhereNotNull('order_id')
                      ->orWhere('type', 'online');
                });
            } elseif ($source === 'walk-in' || $source === 'walkin') {
                $query->where(function ($q) {
                    $q->where('order_source', 'Walk-in')
                      ->orWhere(function ($sq) {
                          $sq->whereNull('order_source')
                             ->whereNull('order_id')
                             ->where(function ($nested) {
                                 $nested->whereNull('type')->orWhere('type', '!=', 'online');
                             });
                      });
                });
            } else {
                $query->where('order_source', $request->order_source);
            }
        }

        // Payment Method filter
        if ($request->filled('payment_method') && $request->payment_method !== 'all') {
            $method = strtolower($request->payment_method);
            if ($method === 'cash') {
                $query->where(function ($q) {
                    $q->whereRaw('LOWER(payment_method) = ?', ['cash'])
                      ->orWhereRaw('LOWER(payment_method) = ?', ['cod']);
                });
            } else {
                $query->whereRaw('LOWER(payment_method) = ?', [$method]);
            }
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', strtoupper($request->status));
        }

        $perPage = min(max((int) $request->input('per_page', 100), 1), 500);
        $transactions = $query->paginate($perPage);

        // Dynamic counts for tabs and statistics
        $allCount = Transaction::count();
        $paidCount = Transaction::where('status', 'PAID')->count();
        $refundedCount = Transaction::where('status', 'REFUNDED')->count();
        $voidedCount = Transaction::where('status', 'VOIDED')->count();
        $gcashCount = Transaction::where(function ($q) {
            $q->whereRaw('LOWER(payment_method) = ?', ['gcash'])
              ->orWhere('type', 'gcash');
        })->count();
        $onlineCount = Transaction::where(function ($q) {
            $q->where('order_source', 'Online')
              ->orWhereNotNull('order_id')
              ->orWhere('type', 'online');
        })->count();
        $walkinCount = Transaction::where(function ($q) {
            $q->where('order_source', 'Walk-in')
              ->orWhere(function ($sq) {
                  $sq->whereNull('order_source')
                     ->whereNull('order_id')
                     ->where(function ($nested) {
                         $nested->whereNull('type')->orWhere('type', '!=', 'online');
                     });
              });
        })->count();

        $totalNetSales = Transaction::where('status', 'PAID')->sum('total_net');

        return response()->json([
            'success' => true,
            'data' => $transactions,
            'meta' => [
                'counts' => [
                    'all' => $allCount,
                    'payments' => $paidCount,
                    'refunds' => $refundedCount,
                    'voids' => $voidedCount,
                    'gcash' => $gcashCount,
                    'online' => $onlineCount,
                    'walkin' => $walkinCount,
                    // Backward compatibility aliases
                    'retail' => $allCount,
                    'paid' => $paidCount,
                    'refunded' => $refundedCount,
                    'voided' => $voidedCount,
                ],
                'summary' => [
                    'total_net_sales' => (float) $totalNetSales,
                ]
            ]
        ]);
    }

    /**
     * Get single transaction details.
     */
    public function show($id): JsonResponse
    {
        $transaction = Transaction::with([
            'items.product',
            'refunds.user',
            'voidRecord.user',
            'cashier',
            'customer.user',
            'auditLogs' => function ($q) {
                $q->orderBy('created_at', 'desc');
            }
        ])->where('id', $id)->orWhere('transaction_number', $id)->firstOrFail();

        return response()->json([
            'success' => true,
            'data' => $transaction,
        ]);
    }

    /**
     * Get receipt data and log RECEIPT_PRINTED audit record.
     * Reprinting receipt MUST NOT create a new sale.
     */
    public function receipt($id, Request $request): JsonResponse
    {
        $transaction = Transaction::with(['items.product', 'cashier', 'customer'])
            ->where('id', $id)
            ->orWhere('transaction_number', $id)
            ->firstOrFail();

        $user = $request->user();

        // Audit Trail: Log that receipt was printed/reprinted
        try {
            $this->auditService->record([
                'user_id' => $user?->id,
                'user_name' => $user?->name ?? 'System',
                'user_role' => $user?->role ?? 'staff',
                'action' => 'RECEIPT_PRINTED',
                'module' => 'transactions',
                'record_type' => 'transaction',
                'record_id' => $transaction->id,
                'transaction_id' => $transaction->id,
                'order_id' => $transaction->order_id,
                'reason' => 'Official Receipt Preview / Print generated',
                'metadata' => [
                    'transaction_number' => $transaction->transaction_number,
                    'total_net' => (float) $transaction->total_net,
                    'is_reprint' => true,
                ],
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
        } catch (\Throwable $e) {}

        return response()->json([
            'success' => true,
            'data' => [
                'transaction' => $transaction,
                'store' => [
                    'name' => 'JEM Hardware and Constructions Supply',
                    'branch' => 'National Highway, Brgy. Dila, City of Santa Rosa, Laguna',
                    'vat_reg_tin' => '245-891-304-000',
                    'contact' => '0917-892-4512 / (049) 534-1189',
                    'permits' => 'BIR Perm: 2026-089-91823-POS • SN: JEM20260901-01',
                ]
            ]
        ]);
    }

    /**
     * Process Refund for a PAID transaction.
     * Restores inventory quantities and creates an audit record.
     */
    public function refund($id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
        ], [
            'reason.required' => 'Refund reason is required.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($id, $request, $user) {
            $transaction = Transaction::with('items')->lockForUpdate()
                ->where('id', $id)
                ->orWhere('transaction_number', $id)
                ->firstOrFail();

            // Prevent double refund or refunding a voided transaction
            if ($transaction->status === 'REFUNDED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This transaction has already been refunded. Inventory cannot be restored twice.',
                ], 422);
            }

            if ($transaction->status === 'VOIDED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot refund a voided transaction.',
                ], 422);
            }

            if ($transaction->status !== 'PAID' && $transaction->status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => "Only PAID transactions can be refunded. Current status: {$transaction->status}.",
                ], 422);
            }

            $reason = trim($request->reason);
            $itemsRestored = [];

            // 1. Restore product inventory quantities
            foreach ($transaction->items as $item) {
                if ($item->product_id) {
                    $product = Product::lockForUpdate()->find($item->product_id);
                    if ($product) {
                        $qtyBefore = (int) $product->stock_quantity;
                        $product->increment('stock_quantity', $item->quantity);
                        $qtyAfter = (int) $product->fresh()->stock_quantity;

                        $itemsRestored[] = [
                            'product_id' => $product->id,
                            'name' => $product->name,
                            'quantity' => $item->quantity,
                        ];

                        // Log Stock Adjustment
                        try {
                            StockAdjustment::create([
                                'product_id' => $product->id,
                                'product_variant_id' => $item->product_variant_id,
                                'user_id' => $user?->id ?? 1,
                                'adjustment_type' => 'return',
                                'quantity_before' => $qtyBefore,
                                'quantity_changed' => $item->quantity,
                                'quantity_after' => $qtyAfter,
                                'reason' => "Refund Transaction #{$transaction->transaction_number}: {$reason}",
                            ]);
                        } catch (\Throwable $e) {}
                    }
                }
            }

            // 2. Create Refund record
            $refund = Refund::create([
                'transaction_id' => $transaction->id,
                'refunded_by' => $user->id,
                'amount' => $transaction->total_net,
                'reason' => $reason,
                'refund_date' => now(),
                'items_restored' => $itemsRestored,
            ]);

            // 3. Update Transaction status
            $transaction->status = 'REFUNDED';
            $transaction->save();

            // 4. Record Audit Log
            try {
                $this->auditService->record([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_role' => $user->role,
                    'action' => 'REFUND_CREATED',
                    'module' => 'transactions',
                    'record_type' => 'refund',
                    'record_id' => $refund->id,
                    'transaction_id' => $transaction->id,
                    'order_id' => $transaction->order_id,
                    'reason' => $reason,
                    'metadata' => [
                        'transaction_number' => $transaction->transaction_number,
                        'refund_amount' => (float) $transaction->total_net,
                        'items_restored_count' => count($itemsRestored),
                    ],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'success' => true,
                'message' => "Transaction #{$transaction->transaction_number} was successfully refunded.",
                'data' => $transaction->fresh(['items.product', 'refunds.user']),
            ]);
        });
    }

    /**
     * Process Void for a transaction.
     * STRICT SECURITY RULE:
     * Requires 6-digit Void PIN configured by Admin.
     * Restores inventory quantities atomically and logs TRANSACTION_VOIDED.
     */
    public function void($id, Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'reason' => ['required', 'string', 'min:3', 'max:500'],
            'void_pin' => ['required', 'string', 'regex:/^[0-9]{6}$/'],
        ], [
            'reason.required' => 'Void reason is required.',
            'void_pin.required' => '6-digit Void PIN is required to authorize a void.',
            'void_pin.regex' => 'Void PIN must be exactly 6 digits.',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify Void PIN against hashed PIN in void_security_settings
        $setting = VoidSecuritySetting::first();
        if (!$setting || empty($setting->void_pin_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Void PIN has not been configured by an Administrator. Please configure it in Void Security settings first.',
            ], 422);
        }

        if (!Hash::check($request->void_pin, $setting->void_pin_hash)) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid Void PIN.',
            ], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($id, $request, $user) {
            $transaction = Transaction::with('items')->lockForUpdate()
                ->where('id', $id)
                ->orWhere('transaction_number', $id)
                ->firstOrFail();

            // Prevent double voiding or voiding an already refunded transaction
            if ($transaction->status === 'VOIDED') {
                return response()->json([
                    'success' => false,
                    'message' => 'This transaction is already VOIDED. Inventory cannot be restored twice.',
                ], 422);
            }

            if ($transaction->status === 'REFUNDED') {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot void an already refunded transaction.',
                ], 422);
            }

            if ($transaction->status !== 'PAID' && $transaction->status !== 'completed') {
                return response()->json([
                    'success' => false,
                    'message' => "Only PAID transactions can be voided. Current status: {$transaction->status}.",
                ], 422);
            }

            $reason = trim($request->reason);
            $itemsRestored = [];

            // 1. Restore product inventory quantities
            foreach ($transaction->items as $item) {
                if ($item->product_id) {
                    $product = Product::lockForUpdate()->find($item->product_id);
                    if ($product) {
                        $qtyBefore = (int) $product->stock_quantity;
                        $product->increment('stock_quantity', $item->quantity);
                        $qtyAfter = (int) $product->fresh()->stock_quantity;

                        $itemsRestored[] = [
                            'product_id' => $product->id,
                            'name' => $product->name,
                            'quantity' => $item->quantity,
                        ];

                        // Log Stock Adjustment
                        try {
                            StockAdjustment::create([
                                'product_id' => $product->id,
                                'product_variant_id' => $item->product_variant_id,
                                'user_id' => $user?->id ?? 1,
                                'adjustment_type' => 'return',
                                'quantity_before' => $qtyBefore,
                                'quantity_changed' => $item->quantity,
                                'quantity_after' => $qtyAfter,
                                'reason' => "Void Transaction #{$transaction->transaction_number}: {$reason}",
                            ]);
                        } catch (\Throwable $e) {}
                    }
                }
            }

            // 2. Create Void record
            $voidRecord = VoidRecord::create([
                'transaction_id' => $transaction->id,
                'voided_by' => $user->id,
                'reason' => $reason,
                'void_date' => now(),
                'items_restored' => $itemsRestored,
            ]);

            // 3. Mark transaction as VOIDED
            $transaction->status = 'VOIDED';
            $transaction->save();

            // 4. Record Audit Log (NEVER store the entered PIN)
            try {
                $this->auditService->record([
                    'user_id' => $user->id,
                    'user_name' => $user->name,
                    'user_role' => $user->role,
                    'action' => 'TRANSACTION_VOIDED',
                    'module' => 'transactions',
                    'record_type' => 'void',
                    'record_id' => $voidRecord->id,
                    'transaction_id' => $transaction->id,
                    'order_id' => $transaction->order_id,
                    'reason' => $reason,
                    'metadata' => [
                        'transaction_number' => $transaction->transaction_number,
                        'total_net' => (float) $transaction->total_net,
                        'items_restored_count' => count($itemsRestored),
                    ],
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            } catch (\Throwable $e) {}

            return response()->json([
                'success' => true,
                'message' => "Transaction #{$transaction->transaction_number} has been voided and inventory restored.",
                'data' => $transaction->fresh(['items.product', 'voidRecord.user']),
            ]);
        });
    }
}
