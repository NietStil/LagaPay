<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\ProductCategorie;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductCategorieFactory extends Factory
{
    protected $model = ProductCategorie::class;

    public function definition(): array
    {
        return [
            'evenement_id' => Evenement::factory(),
            'naam' => fake()->randomElement(['Bier', 'Fris', 'Wijn', 'Sterk', 'Snacks', 'Eten']),
        ];
    }
}
