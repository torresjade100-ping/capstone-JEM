<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\Feedback;
use App\Models\Inventory;
use App\Models\Notification;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\RestockRequest;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Users
        $admin = User::firstOrCreate(
            ['email' => 'admin@jemlumber.com'],
            [
                'name' => 'System Administrator',
                'phone' => '+639171234567',
                'password' => Hash::make('Password123!'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $staff = User::firstOrCreate(
            ['email' => 'staff@jemlumber.com'],
            [
                'name' => 'Operations Staff',
                'phone' => '+639181234567',
                'password' => Hash::make('Password123!'),
                'role' => 'staff',
                'status' => 'active',
            ]
        );

        $customer = User::firstOrCreate(
            ['email' => 'customer@jemlumber.com'],
            [
                'name' => 'Juan Dela Cruz',
                'phone' => '+639191234567',
                'password' => Hash::make('Password123!'),
                'role' => 'customer',
                'status' => 'active',
            ]
        );

        $customerProfile = Customer::firstOrCreate(
            ['user_id' => $customer->id],
            [
                'address_line1' => 'Brgy. San Francisco',
                'address_line2' => null,
                'city' => 'San Pablo City',
                'province' => 'Laguna',
                'postal_code' => '4000',
                'country' => 'Philippines',
            ]
        );

        // 2. Categories
        $categoriesData = [
            ['name' => 'Lumber', 'description' => 'Coco lumber, treated wood, framing lumber, and plywood', 'status' => 'active'],
            ['name' => 'Cement & Masonry', 'description' => 'Portland cement, masonry cement, gravel, sand, and hollow blocks', 'status' => 'active'],
            ['name' => 'Roofing & Steel', 'description' => 'Corrugated GI sheets, plain sheets, deformed steel bars, and c-purlins', 'status' => 'active'],
            ['name' => 'Plumbing', 'description' => 'PVC pipes, blue pipes, fittings, valves, and water supply supplies', 'status' => 'active'],
            ['name' => 'Nails & Fasteners', 'description' => 'Common wire nails, concrete nails, tox screws, bolts, and anchors', 'status' => 'active'],
            ['name' => 'Paint & Finishes', 'description' => 'Latex paints, enamels, primers, rollers, brushes, and thinners', 'status' => 'active'],
            ['name' => 'Electrical', 'description' => 'THHN electrical wires, utility boxes, breakers, switches, and conduits', 'status' => 'active'],
            ['name' => 'Tools & Equipment', 'description' => 'Power tools, hand tools, measuring tapes, safety equipment, and blades', 'status' => 'active'],
        ];

        $categories = [];
        foreach ($categoriesData as $cat) {
            $categories[$cat['name']] = Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // 3. Brands
        $brandsData = [
            ['name' => 'JEM Lumber', 'description' => 'JEM Hardware house brand lumber and wood products', 'status' => 'active'],
            ['name' => 'Boysen', 'description' => 'Boysen quality paints and coatings', 'status' => 'active'],
            ['name' => 'Bosch', 'description' => 'Bosch professional power tools and accessories', 'status' => 'active'],
            ['name' => 'DeWalt', 'description' => 'DeWalt heavy-duty power tools and accessories', 'status' => 'active'],
            ['name' => 'Republic Cement', 'description' => 'Republic Portland & Masonry Cement', 'status' => 'active'],
            ['name' => 'Neltex', 'description' => 'Neltex PVC and PPR piping systems', 'status' => 'active'],
            ['name' => 'Philcement', 'description' => 'Philcement premium cement products', 'status' => 'active'],
            ['name' => 'Generic', 'description' => 'Standard industrial hardware commodities', 'status' => 'active'],
        ];

        $brands = [];
        foreach ($brandsData as $br) {
            $brands[$br['name']] = Brand::firstOrCreate(['name' => $br['name']], $br);
        }

        // 4. Products & Variants & Inventory
        $productsData = [
            [
                'name' => 'Coco Lumber 2×3×10',
                'description' => 'High grade seasoned coconut lumber for scaffolding and framing 2x3x10ft.',
                'category' => 'Lumber',
                'brand' => 'JEM Lumber',
                'base_price' => 120.00,
                'unit' => 'piece',
                'stock_quantity' => 340,
                'low_stock_threshold' => 30,
                'sku' => 'LMB-CL-2310',
            ],
            [
                'name' => 'Coco Lumber 2×2×12',
                'description' => 'Standard coconut lumber 2x2x12ft for construction framework.',
                'category' => 'Lumber',
                'brand' => 'JEM Lumber',
                'base_price' => 95.00,
                'unit' => 'piece',
                'stock_quantity' => 220,
                'low_stock_threshold' => 25,
                'sku' => 'LMB-CL-2212',
            ],
            [
                'name' => 'Marine Plywood 1/2" (4×8 ft)',
                'description' => 'Waterproof marine plywood suitable for formworks, cabinets, and exterior structures.',
                'category' => 'Lumber',
                'brand' => 'Generic',
                'base_price' => 680.00,
                'unit' => 'sheet',
                'stock_quantity' => 24,
                'low_stock_threshold' => 10,
                'sku' => 'PLY-MAR-12',
            ],
            [
                'name' => 'Portland Cement 40kg',
                'description' => 'High strength Type 1 Portland cement for structural concrete, beams, and columns.',
                'category' => 'Cement & Masonry',
                'brand' => 'Republic Cement',
                'base_price' => 285.00,
                'unit' => 'bag',
                'stock_quantity' => 450,
                'low_stock_threshold' => 50,
                'sku' => 'CEM-REP-40',
            ],
            [
                'name' => 'Deformed Steel Bar 10mm × 6m',
                'description' => 'Grade 230 structural rebars for reinforced concrete construction.',
                'category' => 'Roofing & Steel',
                'brand' => 'Generic',
                'base_price' => 175.00,
                'unit' => 'length',
                'stock_quantity' => 380,
                'low_stock_threshold' => 40,
                'sku' => 'STL-DEF-10',
            ],
            [
                'name' => 'Corrugated G.I. Sheet 24G × 8ft',
                'description' => 'Hot-dipped galvanized iron corrugated roofing sheet 8 feet.',
                'category' => 'Roofing & Steel',
                'brand' => 'Generic',
                'base_price' => 420.00,
                'unit' => 'sheet',
                'stock_quantity' => 90,
                'low_stock_threshold' => 15,
                'sku' => 'ROOF-GI-08',
            ],
            [
                'name' => 'PVC Sanitary Pipe 4" × 3m',
                'description' => 'Heavy duty PVC sanitary series 1000 pipe for drainage and waste systems.',
                'category' => 'Plumbing',
                'brand' => 'Neltex',
                'base_price' => 320.00,
                'unit' => 'piece',
                'stock_quantity' => 125,
                'low_stock_threshold' => 20,
                'sku' => 'PLM-PVC-4',
            ],
            [
                'name' => 'PVC Elbow 4" 90 Degrees',
                'description' => 'Sanitary PVC elbow 90 deg 4 inch socket joint.',
                'category' => 'Plumbing',
                'brand' => 'Neltex',
                'base_price' => 65.00,
                'unit' => 'piece',
                'stock_quantity' => 210,
                'low_stock_threshold' => 30,
                'sku' => 'PLM-ELB-4-90',
            ],
            [
                'name' => 'Common Wire Nails 4" (1kg)',
                'description' => 'Heavy gauge bright wire nail 4-inch for heavy framing and lumber.',
                'category' => 'Nails & Fasteners',
                'brand' => 'Generic',
                'base_price' => 85.00,
                'unit' => 'kg',
                'stock_quantity' => 160,
                'low_stock_threshold' => 25,
                'sku' => 'FST-CWN-4',
            ],
            [
                'name' => 'Concrete Nails 3" (1kg box)',
                'description' => 'Hardened carbon steel concrete nails for brick, blocks, and masonry.',
                'category' => 'Nails & Fasteners',
                'brand' => 'Generic',
                'base_price' => 110.00,
                'unit' => 'box',
                'stock_quantity' => 85,
                'low_stock_threshold' => 15,
                'sku' => 'FST-CN-3',
            ],
            [
                'name' => 'Boysen Permacoat Latex Paint White 4L',
                'description' => '100% acrylic latex paint for interior and exterior masonry surfaces.',
                'category' => 'Paint & Finishes',
                'brand' => 'Boysen',
                'base_price' => 740.00,
                'unit' => 'gallon',
                'stock_quantity' => 35,
                'low_stock_threshold' => 8,
                'sku' => 'PNT-BY-LAT4L',
            ],
            [
                'name' => 'THHN Electrical Wire 2.0mm² (150m)',
                'description' => 'Pure copper building wire thermoplastic high heat resistant 150m roll.',
                'category' => 'Electrical',
                'brand' => 'Generic',
                'base_price' => 2450.00,
                'unit' => 'roll',
                'stock_quantity' => 16,
                'low_stock_threshold' => 4,
                'sku' => 'ELC-THHN-20',
            ],
            [
                'name' => 'Bosch Angle Grinder 4" 750W (GWS 750)',
                'description' => 'Compact 4-inch heavy duty angle grinder with safety guard and handle.',
                'category' => 'Tools & Equipment',
                'brand' => 'Bosch',
                'base_price' => 2890.00,
                'unit' => 'unit',
                'stock_quantity' => 12,
                'low_stock_threshold' => 3,
                'sku' => 'TLS-BSH-4AG',
            ],
            [
                'name' => 'DeWalt Cordless Drill Driver 18V Kit',
                'description' => '18V cordless brushless drill driver kit with 2 batteries and fast charger.',
                'category' => 'Tools & Equipment',
                'brand' => 'DeWalt',
                'base_price' => 5450.00,
                'unit' => 'unit',
                'stock_quantity' => 7,
                'low_stock_threshold' => 2,
                'sku' => 'TLS-DWT-CD18',
            ],
        ];

        $createdProducts = [];
        foreach ($productsData as $prod) {
            $cat = $categories[$prod['category']];
            $br = $brands[$prod['brand']];

            $product = Product::firstOrCreate(
                ['name' => $prod['name']],
                [
                    'category_id' => $cat->id,
                    'brand_id' => $br->id,
                    'description' => $prod['description'],
                    'base_price' => $prod['base_price'],
                    'unit' => $prod['unit'],
                    'stock_quantity' => $prod['stock_quantity'],
                    'low_stock_threshold' => $prod['low_stock_threshold'],
                    'status' => 'active',
                ]
            );

            // Update quantities if already existed
            $product->update([
                'base_price' => $prod['base_price'],
                'stock_quantity' => $prod['stock_quantity'],
                'low_stock_threshold' => $prod['low_stock_threshold'],
            ]);

            $variant = ProductVariant::firstOrCreate(
                ['product_id' => $product->id, 'sku' => $prod['sku']],
                [
                    'price' => $prod['base_price'],
                    'stock_quantity' => $prod['stock_quantity'],
                    'status' => 'active',
                ]
            );

            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                [
                    'product_variant_id' => $variant->id,
                    'current_quantity' => $prod['stock_quantity'],
                    'available_quantity' => $prod['stock_quantity'],
                    'reserved_quantity' => 0,
                    'threshold' => $prod['low_stock_threshold'],
                ]
            );

            $createdProducts[] = $product;
        }

        // 5. Suppliers
        $suppliersData = [
            [
                'name' => 'Metro Hardware Distributors',
                'contact_person' => 'Mr. John Tan',
                'email' => 'sales@metrohardware.ph',
                'phone' => '+639175551234',
                'address' => '123 E. Rodriguez Ave, Quezon City, Metro Manila',
                'status' => 'active',
            ],
            [
                'name' => 'Provincial Coco & Lumber Supply',
                'contact_person' => 'Ms. Maria Elena Ramos',
                'email' => 'orders@provlumber.ph',
                'phone' => '+639209887766',
                'address' => 'Barangay San Jose, San Pablo City, Laguna',
                'status' => 'active',
            ],
            [
                'name' => 'BuildRite Industrial & Paint Co.',
                'contact_person' => 'Engr. Robert Chen',
                'email' => 'supply@buildrite.ph',
                'phone' => '+639183334455',
                'address' => 'KM 54 National Highway, Calamba, Laguna',
                'status' => 'active',
            ],
        ];

        foreach ($suppliersData as $sup) {
            Supplier::firstOrCreate(['name' => $sup['name']], $sup);
        }

        // 6. Sample Orders & Payments
        $sampleOrders = [
            [
                'order_number' => 'ORD-2026-1001',
                'status' => 'completed',
                'payment_method' => 'cod',
                'subtotal' => 2400.00,
                'shipping_fee' => 150.00,
                'tax' => 0.00,
                'total' => 2550.00,
                'delivery_address' => 'Poblacion, San Pablo City, Laguna',
                'items' => [
                    ['product' => $createdProducts[0], 'quantity' => 10, 'price' => 120.00],
                    ['product' => $createdProducts[3], 'quantity' => 4, 'price' => 285.00],
                    ['product' => $createdProducts[8], 'quantity' => 1, 'price' => 85.00],
                ],
                'created_at' => Carbon::now()->subDays(3),
            ],
            [
                'order_number' => 'ORD-2026-1002',
                'status' => 'processing',
                'payment_method' => 'gcash',
                'subtotal' => 3630.00,
                'shipping_fee' => 200.00,
                'tax' => 0.00,
                'total' => 3830.00,
                'delivery_address' => 'Brgy. Sto. Angel, San Pablo City, Laguna',
                'items' => [
                    ['product' => $createdProducts[10], 'quantity' => 2, 'price' => 740.00],
                    ['product' => $createdProducts[5], 'quantity' => 4, 'price' => 420.00],
                    ['product' => $createdProducts[9], 'quantity' => 3, 'price' => 110.00],
                ],
                'created_at' => Carbon::now()->subDays(1),
            ],
            [
                'order_number' => 'ORD-2026-1003',
                'status' => 'pending',
                'payment_method' => 'maya',
                'subtotal' => 5450.00,
                'shipping_fee' => 0.00,
                'tax' => 0.00,
                'total' => 5450.00,
                'delivery_address' => 'Store Pickup - JEM Hardware Branch',
                'items' => [
                    ['product' => $createdProducts[13], 'quantity' => 1, 'price' => 5450.00],
                ],
                'created_at' => Carbon::now()->subHours(4),
            ],
        ];

        foreach ($sampleOrders as $ord) {
            $order = Order::firstOrCreate(
                ['order_number' => $ord['order_number']],
                [
                    'customer_id' => $customerProfile->id,
                    'status' => $ord['status'],
                    'payment_method' => $ord['payment_method'],
                    'subtotal' => $ord['subtotal'],
                    'shipping_fee' => $ord['shipping_fee'],
                    'tax' => $ord['tax'],
                    'total' => $ord['total'],
                    'amount_paid' => $ord['status'] === 'completed' ? $ord['total'] : 0,
                    'delivery_address' => $ord['delivery_address'],
                    'created_at' => $ord['created_at'],
                ]
            );

            foreach ($ord['items'] as $item) {
                OrderItem::firstOrCreate(
                    [
                        'order_id' => $order->id,
                        'product_id' => $item['product']->id,
                    ],
                    [
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['price'],
                        'total_price' => $item['quantity'] * $item['price'],
                    ]
                );
            }

            if ($ord['status'] === 'completed') {
                Payment::firstOrCreate(
                    ['order_id' => $order->id],
                    [
                        'method' => $ord['payment_method'],
                        'status' => 'completed',
                        'amount' => $ord['total'],
                        'reference_number' => 'PAY-' . $order->id . '-' . time(),
                        'transaction_date' => $ord['created_at'],
                    ]
                );
            }
        }

        // 7. Restock Requests
        RestockRequest::firstOrCreate(
            ['product_id' => $createdProducts[11]->id, 'status' => 'pending'],
            [
                'requested_by' => $staff->id,
                'requested_quantity' => 20,
                'notes' => 'Low stock on THHN electrical wire rolls. Current remaining is 16.',
            ]
        );

        RestockRequest::firstOrCreate(
            ['product_id' => $createdProducts[2]->id, 'status' => 'approved'],
            [
                'requested_by' => $staff->id,
                'requested_quantity' => 50,
                'notes' => 'Marine plywood in high demand for local construction project.',
            ]
        );

        // 8. Feedback
        Feedback::firstOrCreate(
            ['subject' => 'Coco lumber quality inquiry'],
            [
                'customer_id' => $customerProfile->id,
                'message' => 'Good day, do you have coco lumber in 2x4x14 length available for bulk delivery next week?',
                'rating' => 5,
                'status' => 'new',
            ]
        );

        // 9. Sample Notifications
        $sampleNotifications = [
            // Admin notifications
            [
                'user_id' => $admin->id,
                'title' => 'Low Stock Warning',
                'message' => 'THHN Electrical Wire 2.0mm² (150m) is below threshold with only 16 rolls left in inventory.',
                'type' => 'stock_alert',
                'read' => false,
                'created_at' => Carbon::now()->subMinutes(12),
            ],
            [
                'user_id' => $admin->id,
                'title' => 'New Order #ORD-2026-1003 Received',
                'message' => 'Customer Juan Dela Cruz placed a store pickup order amounting to ₱5,450.00.',
                'type' => 'order',
                'read' => false,
                'created_at' => Carbon::now()->subHours(1)->subMinutes(25),
            ],
            [
                'user_id' => $admin->id,
                'title' => 'Restock Request Submitted',
                'message' => 'Operations staff submitted a restock request for 20 units of THHN Electrical Wire.',
                'type' => 'restock',
                'read' => false,
                'created_at' => Carbon::now()->subHours(3),
            ],
            [
                'user_id' => $admin->id,
                'title' => 'GCash Payment Verified',
                'message' => 'Payment of ₱3,830.00 for order #ORD-2026-1002 has been successfully recorded.',
                'type' => 'payment',
                'read' => true,
                'created_at' => Carbon::now()->subDay(),
            ],
            [
                'user_id' => $admin->id,
                'title' => 'Customer Feedback Submitted',
                'message' => 'New inquiry received regarding coco lumber availability in 2x4x14 length.',
                'type' => 'feedback',
                'read' => true,
                'created_at' => Carbon::now()->subDays(2),
            ],
            // Staff notifications
            [
                'user_id' => $staff->id,
                'title' => 'Store Pickup Order Ready',
                'message' => 'Order #ORD-2026-1003 is awaiting item picking and preparation.',
                'type' => 'order',
                'read' => false,
                'created_at' => Carbon::now()->subMinutes(20),
            ],
            [
                'user_id' => $staff->id,
                'title' => 'Restock Request Approved',
                'message' => 'Your restock request for 50 sheets of Marine Plywood 1/2" was approved by Admin.',
                'type' => 'restock',
                'read' => false,
                'created_at' => Carbon::now()->subHours(2),
            ],
            [
                'user_id' => $staff->id,
                'title' => 'Weekly Stock Count Reminder',
                'message' => 'Please perform the physical count for Cement & Masonry section before 5:00 PM.',
                'type' => 'system',
                'read' => true,
                'created_at' => Carbon::now()->subDay(),
            ],
            // Customer notifications
            [
                'user_id' => $customer->id,
                'title' => 'Order #ORD-2026-1002 Processing',
                'message' => 'Your hardware supplies order has been verified and is currently being prepared.',
                'type' => 'order',
                'read' => false,
                'created_at' => Carbon::now()->subHours(4),
            ],
            [
                'user_id' => $customer->id,
                'title' => 'Welcome to JEM Hardware!',
                'message' => 'Thank you for choosing JEM Hardware & Coco Lumber for your construction needs.',
                'type' => 'system',
                'read' => true,
                'created_at' => Carbon::now()->subDays(3),
            ],
        ];

        foreach ($sampleNotifications as $notif) {
            Notification::firstOrCreate(
                [
                    'user_id' => $notif['user_id'],
                    'title' => $notif['title'],
                ],
                $notif
            );
        }
    }
}

