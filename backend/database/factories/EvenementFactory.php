<?php

namespace Database\Factories;

use App\Models\Evenement;
use App\Models\Gebruiker;
use Illuminate\Database\Eloquent\Factories\Factory;

class EvenementFactory extends Factory
{
    protected $model = Evenement::class;

    public function definition(): array
    {
        return [
            'naam' => fake()->sentence(3),
            'open' => fake()->boolean(),
            'start_datum' => fake()->dateTimeBetween('-1 week', '+1 week'),
            'eind_datum' => fake()->dateTimeBetween('+1 week', '+2 weeks'),
            'telefoon_betaling' => fake()->boolean(),
            'munten_terugstorten' => fake()->boolean(),
            'heeft_tickets' => true,
            'munt_prijs' => fake()->randomFloat(2, 1.50, 3.50),
            'code' => fake()->unique()->regexify('[A-Za-z0-9_-]{15}'),
            'gebruiker' => Gebruiker::factory(),
        ];
    }
}
