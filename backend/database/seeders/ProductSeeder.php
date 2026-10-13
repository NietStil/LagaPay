<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Loop through every evenement in the database
        Evenement::all()->each(function ($evenement) {

            // Create between 5 and 15 products linked to this specific evenement
            Product::factory()->count(rand(5, 15))->create([
                'evenement_id' => $evenement->id, // Overrides the factory default to match the current event
            ]);

        });
    }
}
