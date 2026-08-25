<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Customer;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. System Users (Admin, Staff, Customer)
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

        Customer::firstOrCreate(
            ['user_id' => $customer->id],
            [
                'address_line1' => 'Block 12 Lot 8, Villa San Isidro',
                'address_line2' => null,
                'city' => 'Santa Rosa',
                'province' => 'Laguna',
                'postal_code' => '4026',
                'country' => 'Philippines',
            ]
        );

        // 2. Hardware Categories
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

        foreach ($categoriesData as $cat) {
            Category::firstOrCreate(['name' => $cat['name']], $cat);
        }

        // 3. Hardware Brands
        $brandsData = [
            ['name' => 'JEM Lumber', 'description' => 'JEM Hardware house brand lumber and wood products', 'status' => 'active'],
            ['name' => 'Boysen', 'description' => 'Boysen quality paints and coatings', 'status' => 'active'],
            ['name' => 'Bosch', 'description' => 'Bosch professional power tools and accessories', 'status' => 'active'],
            ['name' => 'DeWalt', 'description' => 'DeWalt heavy-duty power tools and accessories', 'status' => 'active'],
            ['name' => 'Republic Cement', 'description' => 'Republic Portland & Masonry Cement', 'status' => 'active'],
            ['name' => 'Neltex', 'description' => 'Neltex PVC and PPR piping systems', 'status' => 'active'],
            ['name' => 'SteelAsia', 'description' => 'SteelAsia high-tensile rebar and steel', 'status' => 'active'],
            ['name' => 'Generic', 'description' => 'Standard industrial hardware commodities', 'status' => 'active'],
        ];

        foreach ($brandsData as $br) {
            Brand::firstOrCreate(['name' => $br['name']], $br);
        }
    }
}
