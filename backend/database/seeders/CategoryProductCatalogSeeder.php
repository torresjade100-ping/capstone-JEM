<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Supplier;
use App\Models\InventoryBatch;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategoryProductCatalogSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Ensure Standard Categories Exist
        $categoryDefinitions = [
            'Electrical' => 'Electrical wires, circuit breakers, switches, outlets, conduits, and accessories',
            'Plumbing' => 'PVC pipes, potable fittings, sanitary pipes, valves, bibcocks, and fixtures',
            'Lumber' => 'Coco lumber, good lumber, marine plywood, ordinary plywood, and fiber boards',
            'Hand Tools' => 'Hammers, hand saws, measuring tapes, screwdrivers, wrenches, and pliers',
            'Power Tools' => 'Angle grinders, power drills, circular saws, sanders, and electric cutters',
            'Construction Materials' => 'Portland cement, masonry cement, rebar, gravel, and concrete masonry',
            'Paint' => 'Latex paints, enamels, primers, rollers, paint brushes, and surface sealants',
            'Hardware' => 'Padlocks, hinges, barrel bolts, door knobs, wire mesh, and ironmongery',
            'Safety Equipment' => 'Hard hats, safety goggles, work gloves, safety shoes, and harness vests',
            'Fasteners' => 'Common wire nails, concrete nails, drywall screws, bolts, and anchors',
        ];

        $categories = [];
        foreach ($categoryDefinitions as $catName => $catDesc) {
            $categories[$catName] = Category::firstOrCreate(
                ['name' => $catName],
                [
                    'description' => $catDesc,
                    'status' => 'active'
                ]
            );
            // Ensure category is active
            if ($categories[$catName]->status !== 'active') {
                $categories[$catName]->update(['status' => 'active']);
            }
        }

        // 2. Ensure Brands Exist
        $brandDefinitions = [
            'JEM Lumber' => 'JEM Hardware house brand lumber and wood products',
            'Neltex' => 'Neltex high-grade PVC pipes and plumbing fixtures',
            'Phelps Dodge' => 'Phelps Dodge electrical wires and high-conductivity copper conductors',
            'Panasonic' => 'Panasonic wiring devices, switches, breakers, and outlets',
            'Stanley' => 'Stanley professional hand tools and precision hardware',
            'Bosch' => 'Bosch heavy-duty power tools and accessories',
            'Republic Cement' => 'Republic Portland & Masonry Cement products',
            'Boysen' => 'Boysen quality paints and coatings',
            'Yale' => 'Yale security padlocks, door knobs, and architectural locks',
            '3M' => '3M safety equipment, respirators, and PPE',
            'Generic' => 'Standard industrial hardware commodities',
        ];

        $brands = [];
        foreach ($brandDefinitions as $brandName => $brandDesc) {
            $brands[$brandName] = Brand::firstOrCreate(
                ['name' => $brandName],
                ['description' => $brandDesc, 'status' => 'active']
            );
        }

        // 3. Supplier
        $supplier = Supplier::firstOrCreate(
            ['name' => 'Metro Hardware Distributors'],
            [
                'contact_person' => 'Juan Dela Cruz',
                'phone' => '09171234567',
                'email' => 'metrohardware@example.com',
                'address' => 'Santa Rosa, Laguna',
                'status' => 'active',
            ]
        );

        // 4. Products definition organized by category: ONE CATEGORY -> MANY PRODUCTS
        $catalog = [
            'Electrical' => [
                [
                    'name' => 'Electrical Wire THHN 2.0mm² (150m)',
                    'brand' => 'Phelps Dodge',
                    'description' => '150-meter roll of 2.0mm² (AWG 14) 99.9% pure copper THHN/THWN-2 building wire.',
                    'cost_price' => 2800.00,
                    'selling_price' => 3650.00,
                    'unit' => 'roll',
                    'stock_quantity' => 25,
                    'sku' => 'ELEC-THHN-20',
                ],
                [
                    'name' => 'Circuit Breaker 2-Pole 30A Bolt-on',
                    'brand' => 'Panasonic',
                    'description' => 'Industrial quality 30A 240V plug-in/bolt-on miniature circuit breaker for main and branch panels.',
                    'cost_price' => 260.00,
                    'selling_price' => 350.00,
                    'unit' => 'piece',
                    'stock_quantity' => 60,
                    'sku' => 'ELEC-CB-30A',
                ],
                [
                    'name' => 'Electrical Outlet 2-Gang Duplex Grounded',
                    'brand' => 'Panasonic',
                    'description' => 'Wide series 2-gang universal duplex outlet with grounding terminal and safety shutters.',
                    'cost_price' => 120.00,
                    'selling_price' => 175.00,
                    'unit' => 'set',
                    'stock_quantity' => 100,
                    'sku' => 'ELEC-OUT-2G',
                ],
                [
                    'name' => 'Light Switch 1-Gang Wall Plate',
                    'brand' => 'Panasonic',
                    'description' => 'Modern wide-series single gang wall light switch rated 16A 250V.',
                    'cost_price' => 85.00,
                    'selling_price' => 125.00,
                    'unit' => 'set',
                    'stock_quantity' => 120,
                    'sku' => 'ELEC-SW-1G',
                ],
                [
                    'name' => 'Heavy-Duty Extension Cord 5 Meters 3-Gang',
                    'brand' => 'Generic',
                    'description' => 'Heavy duty 5-meter rubberized extension cord with individual lighted switches and surge protector.',
                    'cost_price' => 280.00,
                    'selling_price' => 395.00,
                    'unit' => 'piece',
                    'stock_quantity' => 40,
                    'sku' => 'ELEC-EXT-5M',
                ],
            ],
            'Plumbing' => [
                [
                    'name' => 'PVC Blue Potable Water Pipe 1/2" (3 Meters)',
                    'brand' => 'Neltex',
                    'description' => '1/2" Schedule 40 blue uPVC potable water pipe certified for domestic water pressure.',
                    'cost_price' => 85.00,
                    'selling_price' => 120.00,
                    'unit' => 'piece',
                    'stock_quantity' => 80,
                    'sku' => 'PLUMB-PVC-12',
                ],
                [
                    'name' => 'Stainless Steel Bibcock Water Faucet 1/2"',
                    'brand' => 'Generic',
                    'description' => 'Heavy duty SUS304 stainless steel ball bibcock with hose bib adaptor.',
                    'cost_price' => 110.00,
                    'selling_price' => 165.00,
                    'unit' => 'piece',
                    'stock_quantity' => 90,
                    'sku' => 'PLUMB-FAUC-12',
                ],
                [
                    'name' => 'Brass Gate Valve 1/2" Threaded',
                    'brand' => 'Generic',
                    'description' => 'Heavy duty solid cast brass full port gate valve with cast iron hand wheel.',
                    'cost_price' => 160.00,
                    'selling_price' => 240.00,
                    'unit' => 'piece',
                    'stock_quantity' => 50,
                    'sku' => 'PLUMB-VALVE-12',
                ],
                [
                    'name' => 'PVC Pipe Fitting Elbow 90° 1/2"',
                    'brand' => 'Neltex',
                    'description' => '1/2" Blue PVC 90-degree slip elbow fitting for clean water distribution lines.',
                    'cost_price' => 10.00,
                    'selling_price' => 16.00,
                    'unit' => 'piece',
                    'stock_quantity' => 200,
                    'sku' => 'PLUMB-ELBOW-90',
                ],
                [
                    'name' => 'PVC Orange Sanitary Drainage Pipe 3" (3M)',
                    'brand' => 'Neltex',
                    'description' => '3" Orange PVC sanitary pipe for waste water, downspouts, and sewer lines.',
                    'cost_price' => 280.00,
                    'selling_price' => 395.00,
                    'unit' => 'piece',
                    'stock_quantity' => 45,
                    'sku' => 'PLUMB-DRAIN-3',
                ],
            ],
            'Lumber' => [
                [
                    'name' => '2x2x10 Coco Lumber Rough Sawn',
                    'brand' => 'JEM Lumber',
                    'description' => '2" x 2" x 10\' Kiln-dried coconut lumber for formworks, scaffolds, and temporary bracing.',
                    'cost_price' => 95.00,
                    'selling_price' => 140.00,
                    'unit' => 'piece',
                    'stock_quantity' => 150,
                    'sku' => 'LUMB-COCO-2X2',
                ],
                [
                    'name' => '2x4x10 Coco Lumber Structural',
                    'brand' => 'JEM Lumber',
                    'description' => '2" x 4" x 10\' Heavy structural coconut wood lumber for ceiling joists and wall studs.',
                    'cost_price' => 190.00,
                    'selling_price' => 275.00,
                    'unit' => 'piece',
                    'stock_quantity' => 120,
                    'sku' => 'LUMB-COCO-2X4',
                ],
                [
                    'name' => '2x6x12 Good Lumber Kiln-Dried',
                    'brand' => 'JEM Lumber',
                    'description' => '2" x 6" x 12\' Planed S4S kiln-dried Philippine mahogany good lumber for rafters and beams.',
                    'cost_price' => 520.00,
                    'selling_price' => 740.00,
                    'unit' => 'piece',
                    'stock_quantity' => 60,
                    'sku' => 'LUMB-GOOD-2X6',
                ],
                [
                    'name' => 'Ordinary Plywood 1/4" (4x8)',
                    'brand' => 'JEM Lumber',
                    'description' => '1/4" x 4\' x 8\' Standard ordinary plywood board for ceiling panels and partitions.',
                    'cost_price' => 260.00,
                    'selling_price' => 380.00,
                    'unit' => 'sheet',
                    'stock_quantity' => 90,
                    'sku' => 'LUMB-PLY-14',
                ],
                [
                    'name' => 'Marine Plywood 3/4" Waterproof (4x8)',
                    'brand' => 'JEM Lumber',
                    'description' => '3/4" x 4\' x 8\' Grade A WBP phenolic glue waterproof marine plywood.',
                    'cost_price' => 830.00,
                    'selling_price' => 1080.00,
                    'unit' => 'sheet',
                    'stock_quantity' => 50,
                    'sku' => 'LUMB-MPLY-34',
                ],
            ],
            'Hand Tools' => [
                [
                    'name' => 'Steel Claw Hammer 16oz Fiberglass Handle',
                    'brand' => 'Stanley',
                    'description' => '16-ounce forged high carbon steel claw hammer with non-slip vibration-dampening fiberglass handle.',
                    'cost_price' => 210.00,
                    'selling_price' => 310.00,
                    'unit' => 'piece',
                    'stock_quantity' => 35,
                    'sku' => 'TOOL-HAM-16OZ',
                ],
                [
                    'name' => 'Carpenter Hand Saw 20" Hardened Teeth',
                    'brand' => 'Stanley',
                    'description' => '20-inch crosscut carpenter hand saw with precision induction-hardened 8-TPI blade.',
                    'cost_price' => 190.00,
                    'selling_price' => 280.00,
                    'unit' => 'piece',
                    'stock_quantity' => 30,
                    'sku' => 'TOOL-SAW-20',
                ],
                [
                    'name' => 'Steel Measuring Tape 5M / 16FT',
                    'brand' => 'Stanley',
                    'description' => '5-meter high-visibility locking steel measuring tape with belt clip.',
                    'cost_price' => 85.00,
                    'selling_price' => 135.00,
                    'unit' => 'piece',
                    'stock_quantity' => 80,
                    'sku' => 'TOOL-TAPE-5M',
                ],
                [
                    'name' => 'Screwdriver Set 6-Piece Heavy Duty',
                    'brand' => 'Stanley',
                    'description' => '6-piece chrome vanadium magnetic tip screwdriver set (Philips & Slotted).',
                    'cost_price' => 220.00,
                    'selling_price' => 340.00,
                    'unit' => 'set',
                    'stock_quantity' => 45,
                    'sku' => 'TOOL-SDR-6PC',
                ],
                [
                    'name' => 'Combination Pliers 8" High-Leverage',
                    'brand' => 'Stanley',
                    'description' => '8-inch professional forged steel combination linesman pliers with insulated grips.',
                    'cost_price' => 160.00,
                    'selling_price' => 245.00,
                    'unit' => 'piece',
                    'stock_quantity' => 50,
                    'sku' => 'TOOL-PLI-8IN',
                ],
            ],
            'Power Tools' => [
                [
                    'name' => 'Angle Grinder 4" 710W Heavy Duty',
                    'brand' => 'Bosch',
                    'description' => '4-inch (100mm) professional slim-body electric angle grinder with bursting guard and side handle.',
                    'cost_price' => 1850.00,
                    'selling_price' => 2450.00,
                    'unit' => 'unit',
                    'stock_quantity' => 20,
                    'sku' => 'PT-GRIND-4',
                ],
                [
                    'name' => 'Impact Drill 13mm 650W Variable Speed',
                    'brand' => 'Bosch',
                    'description' => '13mm keyed chuck reversible variable speed electric impact hammer drill.',
                    'cost_price' => 2100.00,
                    'selling_price' => 2790.00,
                    'unit' => 'unit',
                    'stock_quantity' => 18,
                    'sku' => 'PT-DRILL-13',
                ],
                [
                    'name' => 'Circular Saw 7-1/4" 1400W Wood Cutter',
                    'brand' => 'Bosch',
                    'description' => '7-1/4 inch high-torque circular saw with laser guide and 24T carbide tipped blade.',
                    'cost_price' => 3200.00,
                    'selling_price' => 4150.00,
                    'unit' => 'unit',
                    'stock_quantity' => 12,
                    'sku' => 'PT-CSAW-714',
                ],
            ],
            'Construction Materials' => [
                [
                    'name' => 'Portland Cement Type 1 (40kg Bag)',
                    'brand' => 'Republic Cement',
                    'description' => '40kg bag of premium Portland cement for high-strength concrete structures and columns.',
                    'cost_price' => 215.00,
                    'selling_price' => 260.00,
                    'unit' => 'bag',
                    'stock_quantity' => 200,
                    'sku' => 'CONST-CEM-PORT',
                ],
                [
                    'name' => 'Deformed Steel Rebar Grade 40 10mm x 6M',
                    'brand' => 'Generic',
                    'description' => '10mm standard 6-meter ribbed deformed steel reinforcing bar for concrete slabs and beams.',
                    'cost_price' => 165.00,
                    'selling_price' => 215.00,
                    'unit' => 'length',
                    'stock_quantity' => 300,
                    'sku' => 'CONST-REBAR-10',
                ],
                [
                    'name' => 'Concrete Hollow Blocks (CHB) 4" Standard',
                    'brand' => 'Generic',
                    'description' => '4" x 8" x 16" Standard load-bearing cured concrete hollow blocks.',
                    'cost_price' => 13.00,
                    'selling_price' => 18.00,
                    'unit' => 'piece',
                    'stock_quantity' => 800,
                    'sku' => 'CONST-CHB-4',
                ],
            ],
            'Paint' => [
                [
                    'name' => 'Permacoat Acrylic Gloss Latex Paint White 4L',
                    'brand' => 'Boysen',
                    'description' => '4-Liter 100% acrylic water-based gloss latex paint for interior and exterior masonry.',
                    'cost_price' => 620.00,
                    'selling_price' => 790.00,
                    'unit' => 'gallon',
                    'stock_quantity' => 40,
                    'sku' => 'PAINT-LATEX-4L',
                ],
                [
                    'name' => 'Quick Drying Enamel Paint White 4L',
                    'brand' => 'Boysen',
                    'description' => '4-Liter alkyd gloss enamel paint for wood surfaces and structural metal finishes.',
                    'cost_price' => 680.00,
                    'selling_price' => 870.00,
                    'unit' => 'gallon',
                    'stock_quantity' => 35,
                    'sku' => 'PAINT-ENAM-4L',
                ],
                [
                    'name' => 'Paint Roller with Tray 7" Complete Set',
                    'brand' => 'Generic',
                    'description' => '7-inch solvent-resistant polyester paint roller with ergonomic handle and ribbed plastic tray.',
                    'cost_price' => 85.00,
                    'selling_price' => 130.00,
                    'unit' => 'set',
                    'stock_quantity' => 60,
                    'sku' => 'PAINT-ROL-7IN',
                ],
                [
                    'name' => 'Paint Brush 2" Pure Bristle',
                    'brand' => 'Generic',
                    'description' => '2-inch wooden handle pure bristle paint brush for touch-ups and precision cut-ins.',
                    'cost_price' => 25.00,
                    'selling_price' => 45.00,
                    'unit' => 'piece',
                    'stock_quantity' => 100,
                    'sku' => 'PAINT-BRU-2IN',
                ],
            ],
            'Hardware' => [
                [
                    'name' => 'Solid Brass Padlock 50mm Long Shackle',
                    'brand' => 'Yale',
                    'description' => '50mm hardened steel long-shackle solid brass weatherproof padlock with 3 brass keys.',
                    'cost_price' => 290.00,
                    'selling_price' => 420.00,
                    'unit' => 'piece',
                    'stock_quantity' => 40,
                    'sku' => 'HDW-PAD-50MM',
                ],
                [
                    'name' => 'Stainless Steel Door Hinges 3.5" x 3.5" (Pair)',
                    'brand' => 'Generic',
                    'description' => 'Pair of 3.5" x 3.5" SUS304 stainless steel ball-bearing door hinges with stainless screws.',
                    'cost_price' => 95.00,
                    'selling_price' => 150.00,
                    'unit' => 'pair',
                    'stock_quantity' => 80,
                    'sku' => 'HDW-HINGE-35',
                ],
                [
                    'name' => 'Heavy Barrel Bolt Latch 4" Zinc Plated',
                    'brand' => 'Generic',
                    'description' => '4-inch zinc-plated heavy-gauge slide barrel bolt with keeper and mounting screws.',
                    'cost_price' => 35.00,
                    'selling_price' => 60.00,
                    'unit' => 'piece',
                    'stock_quantity' => 110,
                    'sku' => 'HDW-BOLT-4IN',
                ],
            ],
            'Safety Equipment' => [
                [
                    'name' => 'Industrial Safety Helmet Hard Hat with Ratchet',
                    'brand' => '3M',
                    'description' => 'ANSI certified high-density polyethylene construction safety helmet with 6-point suspension.',
                    'cost_price' => 190.00,
                    'selling_price' => 280.00,
                    'unit' => 'piece',
                    'stock_quantity' => 50,
                    'sku' => 'SAFE-HAT-YEL',
                ],
                [
                    'name' => 'Heavy Duty Rubber Coated Work Gloves (Pair)',
                    'brand' => 'Generic',
                    'description' => 'Puncture-resistant latex rubber crinkle palm-coated nylon breathable work gloves.',
                    'cost_price' => 35.00,
                    'selling_price' => 60.00,
                    'unit' => 'pair',
                    'stock_quantity' => 150,
                    'sku' => 'SAFE-GLV-LATEX',
                ],
                [
                    'name' => 'Clear Anti-Fog Safety Goggles Eyewear',
                    'brand' => '3M',
                    'description' => 'Impact-resistant polycarbonate wrap-around UV protective anti-fog safety glasses.',
                    'cost_price' => 75.00,
                    'selling_price' => 120.00,
                    'unit' => 'piece',
                    'stock_quantity' => 75,
                    'sku' => 'SAFE-GOG-CLR',
                ],
            ],
            'Fasteners' => [
                [
                    'name' => 'Common Wire Nails 2" (1 Kilo Pack)',
                    'brand' => 'Generic',
                    'description' => '1-Kilogram pack of 2-inch standard common wire nails for woodworking and framing.',
                    'cost_price' => 65.00,
                    'selling_price' => 90.00,
                    'unit' => 'kilogram',
                    'stock_quantity' => 150,
                    'sku' => 'FAST-NAIL-2IN',
                ],
                [
                    'name' => 'Common Wire Nails 3" (1 Kilo Pack)',
                    'brand' => 'Generic',
                    'description' => '1-Kilogram pack of 3-inch heavy-duty common wire nails for structural timber joints.',
                    'cost_price' => 65.00,
                    'selling_price' => 90.00,
                    'unit' => 'kilogram',
                    'stock_quantity' => 140,
                    'sku' => 'FAST-NAIL-3IN',
                ],
                [
                    'name' => 'Concrete Nails 2" Hardened Steel (1 Kilo)',
                    'brand' => 'Generic',
                    'description' => 'Fluted high carbon hardened steel concrete nails for masonry and brickwork.',
                    'cost_price' => 95.00,
                    'selling_price' => 135.00,
                    'unit' => 'kilogram',
                    'stock_quantity' => 80,
                    'sku' => 'FAST-CNAIL-2',
                ],
                [
                    'name' => 'Black Drywall Screws #6 x 1" (Box of 1000)',
                    'brand' => 'Generic',
                    'description' => 'Box of 1,000 pieces bugle head phillips drive black phosphate drywall screws.',
                    'cost_price' => 240.00,
                    'selling_price' => 340.00,
                    'unit' => 'box',
                    'stock_quantity' => 45,
                    'sku' => 'FAST-DWS-1IN',
                ],
            ],
        ];

        // 5. Seed products for each category
        foreach ($catalog as $catName => $products) {
            $cat = $categories[$catName];
            foreach ($products as $pData) {
                $brand = $brands[$pData['brand']] ?? $brands['Generic'];

                $product = Product::firstOrCreate(
                    ['name' => $pData['name']],
                    [
                        'category_id' => $cat->id,
                        'brand_id' => $brand->id,
                        'description' => $pData['description'],
                        'base_price' => $pData['selling_price'],
                        'cost_price' => $pData['cost_price'],
                        'selling_price' => $pData['selling_price'],
                        'unit' => $pData['unit'],
                        'stock_quantity' => $pData['stock_quantity'],
                        'low_stock_threshold' => 10,
                        'status' => 'active',
                    ]
                );

                // Create default variant if none exists
                if ($product->variants()->count() === 0) {
                    ProductVariant::create([
                        'product_id' => $product->id,
                        'sku' => $pData['sku'] ?? ('SKU-' . strtoupper(Str::random(8))),
                        'price' => $pData['selling_price'],
                        'stock_quantity' => $pData['stock_quantity'],
                        'status' => 'active',
                    ]);
                }

                // Create initial inventory batch if none exists
                if ($product->batches()->count() === 0 && $pData['stock_quantity'] > 0) {
                    InventoryBatch::create([
                        'product_id' => $product->id,
                        'batch_number' => sprintf('BAT-%s-%04d', date('Ymd'), $product->id),
                        'supplier_id' => $supplier->id,
                        'supplier_name' => $supplier->name,
                        'cost_price' => $pData['cost_price'],
                        'selling_price' => $pData['selling_price'],
                        'initial_quantity' => $pData['stock_quantity'],
                        'quantity' => $pData['stock_quantity'],
                        'received_date' => date('Y-m-d'),
                        'status' => 'active',
                        'notes' => 'Catalog seeder initial batch',
                    ]);
                }
            }
        }
    }
}
