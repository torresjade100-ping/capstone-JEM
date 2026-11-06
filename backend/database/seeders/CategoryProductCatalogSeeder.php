<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use Illuminate\Database\Seeder;

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

        foreach ($categoryDefinitions as $catName => $catDesc) {
            $cat = Category::firstOrCreate(
                ['name' => $catName],
                [
                    'description' => $catDesc,
                    'status' => 'active'
                ]
            );
            if ($cat->status !== 'active') {
                $cat->update(['status' => 'active']);
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

        foreach ($brandDefinitions as $brandName => $brandDesc) {
            Brand::firstOrCreate(
                ['name' => $brandName],
                ['description' => $brandDesc, 'status' => 'active']
            );
        }

        // 3. Products & Batches: Blank for clean production catalog
    }
}
