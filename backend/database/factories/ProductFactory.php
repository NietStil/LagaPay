<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        return [
            'evenement_id' => Evenement::factory(),
            'prijs' => fake()->numberBetween(1, 100),
            'naam' => fake()->word(),
        ];
    }
}
