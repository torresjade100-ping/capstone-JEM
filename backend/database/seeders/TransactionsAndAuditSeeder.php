<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\SalesTransaction;
use App\Models\Transaction;
use App\Models\TransactionItem;
use App\Models\User;
use App\Models\VoidRecord;
use App\Services\AuditService;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class TransactionsAndAuditSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::where('role', 'admin')->first();
        $staff = User::where('role', 'staff')->first();
        $firstProduct = Product::first();
        $secondProduct = Product::skip(1)->first() ?? $firstProduct;

        // 1. Sync existing SalesTransactions if any
        $existingSales = SalesTransaction::with('items.product')->get();
        foreach ($existingSales as $sale) {
            $alreadyExists = Transaction::where('transaction_number', $sale->transaction_number)->exists();
            if ($alreadyExists) continue;

            $cashierUser = User::find($sale->user_id);
            $roleLabel = ($cashierUser && $cashierUser->role === 'admin') ? 'Admin' : 'Cashier';
            $cashierName = $cashierUser ? "{$cashierUser->name} ({$roleLabel})" : 'Isaac Daumar (Admin)';

            $tx = Transaction::create([
                'transaction_number' => $sale->transaction_number,
                'order_id' => null,
                'type' => 'pos',
                'date_time' => $sale->created_at ?? now(),
                'cashier_id' => $sale->user_id,
                'cashier_name' => $cashierName,
                'customer_id' => null,
                'customer_name' => 'Walk-in',
                'payment_method' => strtoupper($sale->payment_method === 'cod' ? 'CASH' : $sale->payment_method),
                'gross_subtotal' => $sale->subtotal,
                'discount' => $sale->discount ?? 0,
                'total_net' => $sale->total,
                'amount_tendered' => $sale->total,
                'change_due' => 0,
                'status' => 'PAID',
                'notes' => 'Migrated from SalesTransaction',
                'created_at' => $sale->created_at ?? now(),
                'updated_at' => $sale->updated_at ?? now(),
            ]);

            foreach ($sale->items as $it) {
                TransactionItem::create([
                    'transaction_id' => $tx->id,
                    'product_id' => $it->product_id,
                    'product_variant_id' => $it->product_variant_id,
                    'product_name' => $it->product?->name ?? 'Hardware Item',
                    'sku' => $it->product?->sku ?? 'HW-SKU',
                    'quantity' => $it->quantity,
                    'unit_price' => $it->unit_price,
                    'line_total' => $it->total_price,
                ]);
            }
        }

        // 2. Reference sample transactions (cleared for clean production records)
        $referenceSamples = [];

        foreach ($referenceSamples as $sample) {
            $exists = Transaction::where('transaction_number', $sample['number'])->first();
            if ($exists) {
                $exists->update([
                    'order_source' => $sample['order_source'],
                    'customer_name' => $sample['customer'],
                    'payment_method' => $sample['payment'],
                    'reference_number' => $sample['reference_number'] ?? $exists->reference_number,
                    'gross_subtotal' => $sample['gross'],
                    'total_net' => $sample['net'],
                    'cashier_name' => $sample['cashier_name'],
                ]);
                continue;
            }

            $tx = Transaction::create([
                'transaction_number' => $sample['number'],
                'order_id' => null,
                'type' => $sample['payment'] === 'GCASH' ? 'gcash' : 'retail',
                'date_time' => $sample['date_time'],
                'cashier_id' => $sample['cashier_id'],
                'cashier_name' => $sample['cashier_name'],
                'cashier_role' => $sample['cashier_role'] ?? 'staff',
                'customer_id' => null,
                'customer_name' => $sample['customer'],
                'order_source' => $sample['order_source'],
                'payment_method' => $sample['payment'],
                'reference_number' => $sample['reference_number'] ?? null,
                'gross_subtotal' => $sample['gross'],
                'discount' => $sample['discount'],
                'total_net' => $sample['net'],
                'amount_tendered' => $sample['net'],
                'change_due' => 0.00,
                'status' => $sample['status'],
                'created_at' => $sample['date_time'],
                'updated_at' => $sample['date_time'],
            ]);

            foreach ($sample['items'] as $it) {
                TransactionItem::create([
                    'transaction_id' => $tx->id,
                    'product_id' => $firstProduct?->id,
                    'product_name' => $it['name'],
                    'sku' => 'HW-' . rand(1000, 9999),
                    'quantity' => $it['qty'],
                    'unit_price' => $it['price'],
                    'line_total' => $it['price'] * $it['qty'],
                ]);
            }

            if ($sample['status'] === 'VOIDED' && !empty($sample['void'])) {
                VoidRecord::create([
                    'transaction_id' => $tx->id,
                    'voided_by' => $sample['void']['user_id'],
                    'reason' => $sample['void']['reason'],
                    'void_date' => $sample['date_time']->copy()->addMinutes(5),
                    'items_restored' => $sample['items'],
                    'created_at' => $sample['date_time']->copy()->addMinutes(5),
                    'updated_at' => $sample['date_time']->copy()->addMinutes(5),
                ]);
            }
        }
    }
}
