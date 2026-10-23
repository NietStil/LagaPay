<?php

namespace Database\Seeders;

use App\Models\Evenement;
use App\Models\Product;
use App\Models\ProductCategorie;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Loop through every evenement in the database
        Evenement::all()->each(function ($evenement) {

            // Create between 2 and 4 categorieen with distinct names, each with between 2 and 6 products
            $namen = collect(['Bier', 'Fris', 'Wijn', 'Sterk', 'Snacks', 'Eten'])->shuffle()->take(rand(2, 4));

            foreach ($namen as $naam) {
                $categorie = ProductCategorie::factory()->create([
                    'evenement_id' => $evenement->id,
                    'naam'         => $naam,
                ]);

                Product::factory()->count(rand(2, 6))->create([
                    'categorie_id' => $categorie->id,
                ]);
            }

        });
    }
}
