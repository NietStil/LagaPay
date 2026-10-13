<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Opwaardering;
use Illuminate\Database\Eloquent\Factories\Factory;
use App\Models\Gebruiker;

class OpwaarderingFactory extends Factory
{
    protected $model = Opwaardering::class;

    public function definition(): array
    {
        return [
            'mollie_id' => 'tr_' . fake()->regexify('[A-Za-z0-9_-]{10}'),
            'status' => fake()->randomElement(['open', 'pending', 'paid', 'failed']),
            'amount' => fake()->randomFloat(2, 1, 500),
            'method' => fake()->randomElement(['ideal', 'creditcard', 'bancontact']),
            'gebruiker_id' => Gebruiker::factory(),
            'evenement_id' => Evenement::factory(),
        ];
    }
}
